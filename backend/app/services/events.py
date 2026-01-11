"""
Event broadcasting service for real-time simulation updates.

Uses asyncio queues to broadcast events to SSE clients.
"""

import asyncio
import json
from typing import Any
from collections import defaultdict

# Store of active event queues per session
_session_queues: dict[str, list[asyncio.Queue]] = defaultdict(list)
_lock = asyncio.Lock()


async def subscribe(session_id: str) -> asyncio.Queue:
    """Subscribe to events for a session. Returns a queue to read from."""
    queue: asyncio.Queue = asyncio.Queue()
    async with _lock:
        _session_queues[session_id].append(queue)
    return queue


async def unsubscribe(session_id: str, queue: asyncio.Queue):
    """Unsubscribe from session events."""
    async with _lock:
        if queue in _session_queues[session_id]:
            _session_queues[session_id].remove(queue)
        if not _session_queues[session_id]:
            del _session_queues[session_id]


async def broadcast(session_id: str, event_type: str, data: dict[str, Any]):
    """Broadcast an event to all subscribers of a session."""
    message = {
        "type": event_type,
        "data": data,
    }
    async with _lock:
        queues = _session_queues.get(session_id, [])
        for queue in queues:
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                pass  # Skip if queue is full


async def emit_persona_start(session_id: str, persona: str):
    """Emit when a persona conversation starts."""
    await broadcast(session_id, "persona_start", {"persona": persona})


async def emit_message(session_id: str, persona: str, role: str, content: str, turn: int, blocked: bool = False, reason: str | None = None):
    """Emit a conversation message."""
    await broadcast(session_id, "message", {
        "persona": persona,
        "role": role,
        "content": content,
        "turn": turn,
        "blocked": blocked,
        "reason": reason,
    })


async def emit_persona_complete(session_id: str, persona: str, outcome: str, leaked_keys: list[str]):
    """Emit when a persona conversation completes."""
    await broadcast(session_id, "persona_complete", {
        "persona": persona,
        "outcome": outcome,
        "leaked_keys": leaked_keys,
    })


async def emit_simulation_complete(session_id: str, security_score: float, usability_score: float):
    """Emit when the entire simulation is complete."""
    await broadcast(session_id, "simulation_complete", {
        "security_score": security_score,
        "usability_score": usability_score,
    })


async def emit_error(session_id: str, error: str):
    """Emit an error event."""
    await broadcast(session_id, "error", {"error": error})
