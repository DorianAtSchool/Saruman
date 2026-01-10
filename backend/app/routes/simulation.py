from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Session, Secret, DefenseConfig, Conversation, Message
from app.schemas import (
    SimulationRequest,
    SimulationStatusResponse,
    ResultsResponse,
    ConversationResponse,
)
from app.services.simulation import run_simulation

router = APIRouter()


@router.post("/sessions/{session_id}/run")
async def start_simulation(
    session_id: str,
    data: SimulationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Start a Red Team simulation against the Blue Team defense."""
    # Verify session exists
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check for defense config
    result = await db.execute(select(DefenseConfig).where(DefenseConfig.session_id == session_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=400, detail="No defense configuration set")

    # Check for secrets
    result = await db.execute(select(Secret).where(Secret.session_id == session_id))
    secrets = result.scalars().all()
    if not secrets:
        raise HTTPException(status_code=400, detail="No secrets to protect")

    # Mark session as running
    session.status = "running"
    await db.commit()

    # Run simulation in background
    background_tasks.add_task(
        run_simulation,
        session_id=session_id,
        personas=data.personas,
        max_turns=data.max_turns,
    )

    return {"message": "Simulation started", "session_id": session_id}


@router.get("/sessions/{session_id}/status", response_model=SimulationStatusResponse)
async def get_simulation_status(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get current simulation status."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Count conversations
    result = await db.execute(
        select(Conversation).where(Conversation.session_id == session_id)
    )
    conversations = result.scalars().all()

    total_expected = 7  # All personas
    completed = len([c for c in conversations if c.outcome != "pending"])

    current_persona = None
    for c in conversations:
        if c.outcome == "pending":
            current_persona = c.persona
            break

    return SimulationStatusResponse(
        status=session.status,
        progress=completed,
        total=total_expected,
        current_persona=current_persona,
    )


@router.get("/sessions/{session_id}/results", response_model=ResultsResponse)
async def get_results(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get final simulation results."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(Conversation)
        .where(Conversation.session_id == session_id)
        .options(selectinload(Conversation.messages))
    )
    conversations = result.scalars().all()

    return ResultsResponse(
        session_id=session_id,
        status=session.status,
        security_score=session.security_score,
        usability_score=session.usability_score,
        conversations=[ConversationResponse.model_validate(c) for c in conversations],
    )
