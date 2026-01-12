"""
Experiment API routes for running and analyzing Red vs Blue personality experiments.
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import ExperimentRun, ExperimentTrial
from app.schemas import (
    ExperimentCreate,
    ExperimentResponse,
    ExperimentTrialResponse,
    ExperimentResultsResponse,
    ExperimentStatusResponse,
    MatchupStats,
    PersonaOverallStats,
)
from app.services.experiment import (
    create_experiment,
    run_experiment,
    get_experiment_results,
    get_experiment_csv,
    BLUE_TEAM_TEMPLATES,
)
from app.personas import PERSONAS

router = APIRouter()


@router.post("/experiments", response_model=ExperimentResponse)
async def create_new_experiment(
    data: ExperimentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new experiment."""
    experiment = await create_experiment(
        db=db,
        name=data.name,
        config=data.config.model_dump() if data.config else None,
        red_personas=data.red_personas,
        blue_personas=data.blue_personas,
    )
    return experiment


@router.get("/experiments", response_model=list[ExperimentResponse])
async def list_experiments(db: AsyncSession = Depends(get_db)):
    """List all experiments."""
    result = await db.execute(
        select(ExperimentRun).order_by(ExperimentRun.created_at.desc())
    )
    return result.scalars().all()


@router.get("/experiments/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(experiment_id: str, db: AsyncSession = Depends(get_db)):
    """Get experiment details."""
    result = await db.execute(
        select(ExperimentRun).where(ExperimentRun.id == experiment_id)
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment


@router.post("/experiments/{experiment_id}/run")
async def start_experiment(
    experiment_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Start running an experiment."""
    result = await db.execute(
        select(ExperimentRun).where(ExperimentRun.id == experiment_id)
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if experiment.status == "running":
        raise HTTPException(status_code=400, detail="Experiment is already running")

    if experiment.status == "completed":
        raise HTTPException(status_code=400, detail="Experiment has already completed")

    # Start experiment in background
    background_tasks.add_task(run_experiment, experiment_id)

    return {"message": "Experiment started", "experiment_id": experiment_id}


@router.get("/experiments/{experiment_id}/status", response_model=ExperimentStatusResponse)
async def get_experiment_status(experiment_id: str, db: AsyncSession = Depends(get_db)):
    """Get experiment progress."""
    result = await db.execute(
        select(ExperimentRun).where(ExperimentRun.id == experiment_id)
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    progress = (
        (experiment.completed_trials / experiment.total_trials * 100)
        if experiment.total_trials > 0
        else 0.0
    )

    return ExperimentStatusResponse(
        status=experiment.status,
        total_trials=experiment.total_trials,
        completed_trials=experiment.completed_trials,
        current_red_persona=experiment.current_red_persona,
        current_blue_persona=experiment.current_blue_persona,
        progress_percent=progress,
    )


@router.get("/experiments/{experiment_id}/results")
async def get_results(experiment_id: str, db: AsyncSession = Depends(get_db)):
    """Get aggregated experiment results for visualization."""
    result = await db.execute(
        select(ExperimentRun).where(ExperimentRun.id == experiment_id)
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    results = await get_experiment_results(db, experiment_id)
    if not results:
        raise HTTPException(status_code=404, detail="No results found")

    return results


@router.get("/experiments/{experiment_id}/trials", response_model=list[ExperimentTrialResponse])
async def get_experiment_trials(experiment_id: str, db: AsyncSession = Depends(get_db)):
    """Get all trials for an experiment."""
    result = await db.execute(
        select(ExperimentTrial)
        .where(ExperimentTrial.experiment_id == experiment_id)
        .options(selectinload(ExperimentTrial.metrics))
        .order_by(ExperimentTrial.created_at)
    )
    return result.scalars().all()


@router.get("/experiments/{experiment_id}/export")
async def export_experiment(
    experiment_id: str,
    format: str = "csv",
    db: AsyncSession = Depends(get_db),
):
    """Export experiment data."""
    if format != "csv":
        raise HTTPException(status_code=400, detail="Only CSV format is supported")

    csv_data = await get_experiment_csv(db, experiment_id)
    if not csv_data:
        raise HTTPException(status_code=404, detail="Experiment not found")

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=experiment_{experiment_id}.csv"
        },
    )



# Cancel an experiment (set status to 'cancelled')
@router.post("/experiments/{experiment_id}/cancel")
async def cancel_experiment(experiment_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ExperimentRun).where(ExperimentRun.id == experiment_id)
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    if experiment.status == "cancelled":
        return {"message": "Experiment already cancelled"}
    experiment.status = "cancelled"
    await db.commit()
    await db.refresh(experiment)
    return {"message": "Experiment cancelled", "experiment_id": experiment_id}

@router.delete("/experiments/{experiment_id}")
async def delete_experiment(experiment_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an experiment and all its data."""
    result = await db.execute(
        select(ExperimentRun).where(ExperimentRun.id == experiment_id)
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if experiment.status == "running":
        raise HTTPException(status_code=400, detail="Cannot delete a running experiment")

    await db.delete(experiment)
    await db.commit()
    return {"message": "Experiment deleted"}


# Helper endpoints for experiment setup

@router.get("/experiment-options/red-personas")
async def get_red_personas():
    """Get available red team personas for experiments."""
    personas = []
    for name, instance in PERSONAS.items():
        if name != "benign_user":  # Exclude benign user from attackers
            personas.append({
                "id": name,
                "name": instance.name.replace("_", " ").title(),
                "description": instance.description,
            })
    return personas


@router.get("/experiment-options/blue-personas")
async def get_blue_personas():
    """Get available blue team templates for experiments."""
    templates = []
    for id, data in BLUE_TEAM_TEMPLATES.items():
        templates.append({
            "id": id,
            "name": data["name"],
        })
    return templates
