import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
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
    SessionResponse,
    SecretResultResponse,
)
from app.services.simulation import run_simulation
from app.services.events import subscribe, unsubscribe

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

    # If session was already run, reset it first
    if session.status in ("completed", "failed"):
        # Delete old conversations and messages (messages cascade delete with conversation)
        result = await db.execute(
            select(Conversation).where(Conversation.session_id == session_id)
        )
        old_conversations = result.scalars().all()
        for conv in old_conversations:
            await db.delete(conv)
        
        # Reset secret leak status
        for secret in secrets:
            secret.is_leaked = False
        
        # Reset session scores
        session.security_score = None
        session.usability_score = None
        
        # Commit deletions immediately to ensure clean state
        await db.commit()
    elif session.status == "running":
        # Already running - don't start another simulation
        return {"message": "Simulation already running", "session_id": session_id}

    # Mark session as running and save simulation config
    session.status = "running"
    session.selected_personas = data.personas or []
    session.max_turns = data.max_turns
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

    result = await db.execute(select(Secret).where(Secret.session_id == session_id))
    secrets = result.scalars().all()

    result = await db.execute(
        select(Conversation)
        .where(Conversation.session_id == session_id)
        .options(selectinload(Conversation.messages))
    )
    conversations = result.scalars().all()

    return ResultsResponse(
        session=SessionResponse.model_validate(session),
        secrets=[SecretResultResponse.model_validate(s) for s in secrets],
        conversations=[ConversationResponse.model_validate(c) for c in conversations],
    )


@router.get("/sessions/{session_id}/stream")
async def stream_simulation(session_id: str):
    """Stream simulation events via Server-Sent Events."""
    
    async def event_generator():
        queue = await subscribe(session_id)
        try:
            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected', 'data': {'session_id': session_id}})}\n\n"
            
            while True:
                try:
                    # Wait for events with timeout
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(message)}\n\n"
                    
                    # If simulation complete or error, end the stream
                    if message.get("type") in ("simulation_complete", "error"):
                        break
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield f": keepalive\n\n"
        finally:
            await unsubscribe(session_id, queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
