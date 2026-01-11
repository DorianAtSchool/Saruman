"""
Red Team service - orchestrates attacker persona conversations.

Each persona runs a multi-turn conversation against the Blue Team,
attempting to extract secrets using their unique strategy.
"""

import asyncio
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Conversation, Message, DefenseConfig
from app.personas import get_persona
from app.services.blue_team import call_blue_team
from app.services.middleware import process_input, process_output
from app.services.extraction import extract_and_score


@dataclass
class ConversationResult:
    """Result of a single persona conversation."""
    persona: str
    outcome: str  # win, loss, draw
    attacker_score: int
    defender_leaks: int
    leaked_keys: list[str]
    messages: list[dict]
    extraction_attempts: list[dict]
    extraction_results: list[dict]


async def run_persona_conversation(
    db: AsyncSession,
    session_id: str,
    persona_name: str,
    config: DefenseConfig,
    secrets: dict[str, str],
    max_turns: int = 5,
    rate_limit_delay: float = 1.0,
) -> ConversationResult:
    """
    Run a single persona's attack conversation.

    Args:
        db: Database session
        session_id: Game session ID
        persona_name: Name of the attacker persona
        config: Blue Team defense configuration
        secrets: Dict of secret key -> value
        max_turns: Maximum conversation turns
        rate_limit_delay: Seconds to wait between LLM calls

    Returns:
        ConversationResult with outcome and details
    """
    persona = get_persona(persona_name)
    if not persona:
        raise ValueError(f"Unknown persona: {persona_name}")

    secret_keys = list(secrets.keys())

    # Create conversation record
    conversation = Conversation(
        session_id=session_id,
        persona=persona_name,
        outcome="pending",
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)

    # Run multi-turn conversation
    messages = []  # LLM conversation history
    recorded_messages = []  # For result

    for turn in range(max_turns):
        # Rate limiting between turns
        if turn > 0:
            await asyncio.sleep(rate_limit_delay * 2)

        # Generate Red Team attack
        red_message = await persona.generate_attack(
            secrets_keys=secret_keys,
            turn=turn,
            history=messages,
            model_override=config.attacker_model or config.model_name,
        )
        await asyncio.sleep(rate_limit_delay)

        # Record Red Team message
        red_msg = Message(
            conversation_id=conversation.id,
            role="red_team",
            content=red_message,
            turn_number=turn,
        )
        db.add(red_msg)
        recorded_messages.append({
            "role": "red_team",
            "content": red_message,
            "turn": turn,
        })

        # Apply input middleware
        input_result = await process_input(
            content=red_message,
            regex_rules=config.regex_input_rules,
            judge_enabled=config.judge_enabled,
            judge_prompt=config.judge_prompt,
            judge_model=config.judge_model,
        )

        if input_result.blocked:
            # Record blocked response
            blue_content = "I cannot respond to that request."
            blue_msg = Message(
                conversation_id=conversation.id,
                role="blue_team",
                content=blue_content,
                blocked=True,
                block_reason=input_result.reason,
                turn_number=turn,
            )
            db.add(blue_msg)
            messages.append({"role": "user", "content": red_message})
            messages.append({"role": "assistant", "content": blue_content})
            recorded_messages.append({
                "role": "blue_team",
                "content": blue_content,
                "turn": turn,
                "blocked": True,
                "reason": input_result.reason,
            })
            continue

        # Call Blue Team LLM
        messages.append({"role": "user", "content": input_result.content})

        try:
            blue_response = await call_blue_team(config, messages, secrets)
            await asyncio.sleep(rate_limit_delay)
        except Exception as e:
            blue_response = f"Error: {str(e)}"

        # Apply output middleware
        output_result = await process_output(
            content=blue_response,
            regex_rules=config.regex_output_rules,
            judge_enabled=config.judge_enabled,
            judge_prompt=config.judge_prompt,
            judge_model=config.judge_model,
        )

        if output_result.blocked:
            blue_response = "I cannot provide that information."

        # Record Blue Team message
        blue_msg = Message(
            conversation_id=conversation.id,
            role="blue_team",
            content=output_result.content if not output_result.blocked else blue_response,
            blocked=output_result.blocked,
            block_reason=output_result.reason,
            turn_number=turn,
        )
        db.add(blue_msg)

        final_response = output_result.content if not output_result.blocked else blue_response
        messages.append({"role": "assistant", "content": final_response})
        recorded_messages.append({
            "role": "blue_team",
            "content": final_response,
            "turn": turn,
            "blocked": output_result.blocked,
            "reason": output_result.reason,
        })

    await db.commit()

    # === EXTRACTION PHASE ===
    # Skip for benign_user (they don't try to extract secrets)
    if persona_name == "benign_user":
        conversation.outcome = "completed"
        await db.commit()
        return ConversationResult(
            persona=persona_name,
            outcome="completed",
            attacker_score=0,
            defender_leaks=0,
            leaked_keys=[],
            messages=recorded_messages,
            extraction_attempts=[],
            extraction_results=[],
        )

    await asyncio.sleep(rate_limit_delay * 2)

    # Use the actual attacker model, not the persona's default model
    attacker_model = config.attacker_model or config.model_name
    
    extraction = await extract_and_score(
        persona_model=attacker_model,
        secret_keys=secret_keys,
        secrets=secrets,
        conversation_history=messages,
    )

    # Update conversation with results
    conversation.extraction_attempts = extraction["extraction_attempts"]
    conversation.extraction_results = extraction["extraction_results"]
    conversation.attacker_score = extraction["attacker_score"]
    conversation.defender_leaks = extraction["defender_leaks"]
    conversation.secrets_leaked = extraction["leaked_keys"]

    # Determine outcome
    if extraction["attacker_score"] > 0:
        conversation.outcome = "win"
    elif extraction["defender_leaks"] > 0:
        conversation.outcome = "draw"
    else:
        conversation.outcome = "loss"

    await db.commit()

    return ConversationResult(
        persona=persona_name,
        outcome=conversation.outcome,
        attacker_score=extraction["attacker_score"],
        defender_leaks=extraction["defender_leaks"],
        leaked_keys=extraction["leaked_keys"],
        messages=recorded_messages,
        extraction_attempts=extraction["extraction_attempts"],
        extraction_results=extraction["extraction_results"],
    )


async def run_parallel_attacks(
    db: AsyncSession,
    session_id: str,
    persona_names: list[str],
    config: DefenseConfig,
    secrets: dict[str, str],
    max_turns: int = 5,
    rate_limit_delay: float = 2.0,
    max_concurrent: int = 2,
) -> list[ConversationResult]:
    """
    Run multiple persona attacks in parallel (with concurrency limit).

    Args:
        db: Database session
        session_id: Game session ID
        persona_names: List of persona names to run
        config: Blue Team defense configuration
        secrets: Dict of secret key -> value
        max_turns: Maximum turns per conversation
        rate_limit_delay: Delay between LLM calls
        max_concurrent: Maximum concurrent attacks (to respect rate limits)

    Returns:
        List of ConversationResult for each persona
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def run_with_limit(persona_name: str) -> ConversationResult:
        async with semaphore:
            return await run_persona_conversation(
                db=db,
                session_id=session_id,
                persona_name=persona_name,
                config=config,
                secrets=secrets,
                max_turns=max_turns,
                rate_limit_delay=rate_limit_delay,
            )

    results = await asyncio.gather(
        *[run_with_limit(name) for name in persona_names],
        return_exceptions=True,
    )

    # Handle any exceptions
    final_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            # Create a failed result
            final_results.append(ConversationResult(
                persona=persona_names[i],
                outcome="error",
                attacker_score=0,
                defender_leaks=0,
                leaked_keys=[],
                messages=[],
                extraction_attempts=[],
                extraction_results=[{"error": str(result)}],
            ))
        else:
            final_results.append(result)

    return final_results
