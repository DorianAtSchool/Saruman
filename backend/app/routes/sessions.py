from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Session, Secret, DefenseConfig, Conversation, CustomAttackerPrompt
from app.schemas import (
    SessionCreate, SessionResponse,
    SecretCreate, SecretResponse, SecretWithValueResponse, GenerateSecretsRequest,
    DefenseConfigCreate, DefenseConfigResponse,
    ConversationResponse, PromptTemplate, TemplateListResponse,
    PersonaInfo, CustomAttackerPromptCreate, PersonaPromptsResponse,
)
from app.services.secrets import generate_secrets
from app.personas import PERSONAS as PERSONA_INSTANCES

router = APIRouter()

# Defense prompt templates - mirroring red team personas
from app.prompts import BLUE_TEAM_TEMPLATES
PROMPT_TEMPLATES = {
    "direct": PromptTemplate(
        id="direct",
        name="The Direct Assistant",
        prompt=BLUE_TEAM_TEMPLATES["direct"]["prompt"]
    ),
    "admin": PromptTemplate(
        id="admin",
        name="The Authority Figure",
        prompt=BLUE_TEAM_TEMPLATES["admin"]["prompt"]
    ),
    "aggressor": PromptTemplate(
        id="aggressor",
        name="The Aggressive Defender",
        prompt=BLUE_TEAM_TEMPLATES["aggressor"]["prompt"]
    ),
    "close_friend": PromptTemplate(
        id="close_friend",
        name="The Friendly Confidant",
        prompt=BLUE_TEAM_TEMPLATES["close_friend"]["prompt"]
    ),
    "gaslighter": PromptTemplate(
        id="gaslighter",
        name="The Deflector",
        prompt=BLUE_TEAM_TEMPLATES["gaslighter"]["prompt"]
    ),
    "utilitarian": PromptTemplate(
        id="utilitarian",
        name="The Philosopher",
        prompt=BLUE_TEAM_TEMPLATES["utilitarian"]["prompt"]
    ),
}


# Session CRUD
@router.post("/sessions", response_model=SessionResponse)
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = Session(name=data.name)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).order_by(Session.created_at.desc()))
    return result.scalars().all()


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session



# Cancel a session (set status to 'cancelled')
@router.post("/sessions/{session_id}/cancel")
async def cancel_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "cancelled":
        return {"message": "Session already cancelled"}
    session.status = "cancelled"
    await db.commit()
    await db.refresh(session)
    return {"message": "Session cancelled", "session_id": session_id}

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
    return {"message": "Session deleted"}


# Secret management
@router.post("/sessions/{session_id}/secrets", response_model=SecretWithValueResponse)
async def add_secret(session_id: str, data: SecretCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    secret = Secret(session_id=session_id, key=data.key, value=data.value, data_type=data.data_type)
    db.add(secret)
    await db.commit()
    await db.refresh(secret)
    return secret


@router.post("/sessions/{session_id}/secrets/generate", response_model=list[SecretWithValueResponse])
async def generate_session_secrets(
    session_id: str,
    data: GenerateSecretsRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    generated = generate_secrets(data.count, data.types)
    secrets = []
    for s in generated:
        secret = Secret(session_id=session_id, key=s["key"], value=s["value"], data_type=s["data_type"])
        db.add(secret)
        secrets.append(secret)

    await db.commit()
    for secret in secrets:
        await db.refresh(secret)
    return secrets


@router.get("/sessions/{session_id}/secrets", response_model=list[SecretWithValueResponse])
async def list_secrets(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Secret).where(Secret.session_id == session_id))
    return result.scalars().all()


@router.delete("/sessions/{session_id}/secrets/{secret_id}")
async def delete_secret(session_id: str, secret_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Secret).where(Secret.id == secret_id, Secret.session_id == session_id)
    )
    secret = result.scalar_one_or_none()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
    await db.delete(secret)
    await db.commit()
    return {"message": "Secret deleted"}


# Defense config
@router.put("/sessions/{session_id}/defense", response_model=DefenseConfigResponse)
async def save_defense_config(
    session_id: str,
    data: DefenseConfigCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(select(DefenseConfig).where(DefenseConfig.session_id == session_id))
    config = result.scalar_one_or_none()

    if config:
        config.system_prompt = data.system_prompt
        config.model_name = data.model_name
        config.attacker_model = data.attacker_model
        config.regex_input_rules = [r.model_dump() for r in data.regex_input_rules]
        config.regex_output_rules = [r.model_dump() for r in data.regex_output_rules]
        config.judge_enabled = data.judge_enabled
        config.judge_prompt = data.judge_prompt
        config.judge_model = data.judge_model
    else:
        config = DefenseConfig(
            session_id=session_id,
            system_prompt=data.system_prompt,
            model_name=data.model_name,
            attacker_model=data.attacker_model,
            regex_input_rules=[r.model_dump() for r in data.regex_input_rules],
            regex_output_rules=[r.model_dump() for r in data.regex_output_rules],
            judge_enabled=data.judge_enabled,
            judge_prompt=data.judge_prompt,
            judge_model=data.judge_model,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)
    return config


@router.get("/sessions/{session_id}/defense", response_model=DefenseConfigResponse | None)
async def get_defense_config(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DefenseConfig).where(DefenseConfig.session_id == session_id))
    return result.scalar_one_or_none()


# Templates
@router.get("/defense/templates", response_model=TemplateListResponse)
async def list_templates():
    return TemplateListResponse(templates=list(PROMPT_TEMPLATES.values()))


# Conversations (results)
@router.get("/sessions/{session_id}/conversations", response_model=list[ConversationResponse])
async def list_conversations(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.session_id == session_id)
        .options(selectinload(Conversation.messages))
    )
    return result.scalars().all()


# Persona prompts
@router.get("/personas", response_model=list[PersonaInfo])
async def list_personas():
    """Get all available personas with their default prompts."""
    personas = []
    for name, instance in PERSONA_INSTANCES.items():
        personas.append(PersonaInfo(
            id=name,
            name=instance.name.replace('_', ' ').title(),
            description=instance.description,
            default_prompt=instance.system_prompt,
        ))
    return personas


@router.get("/sessions/{session_id}/persona-prompts", response_model=PersonaPromptsResponse)
async def get_session_persona_prompts(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get all personas with their default prompts and any custom prompts for this session."""
    # Check session exists
    result = await db.execute(select(Session).where(Session.id == session_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    # Get default persona prompts
    personas = []
    for name, instance in PERSONA_INSTANCES.items():
        personas.append(PersonaInfo(
            id=name,
            name=instance.name.replace('_', ' ').title(),
            description=instance.description,
            default_prompt=instance.system_prompt,
        ))

    # Get custom prompts for this session
    result = await db.execute(
        select(CustomAttackerPrompt).where(CustomAttackerPrompt.session_id == session_id)
    )
    custom_prompts_list = result.scalars().all()
    custom_prompts = {cp.persona: cp.system_prompt for cp in custom_prompts_list}

    return PersonaPromptsResponse(personas=personas, custom_prompts=custom_prompts)


@router.put("/sessions/{session_id}/persona-prompts/{persona}")
async def update_persona_prompt(
    session_id: str,
    persona: str,
    data: CustomAttackerPromptCreate,
    db: AsyncSession = Depends(get_db),
):
    """Set a custom prompt for a persona in this session."""
    # Check session exists
    result = await db.execute(select(Session).where(Session.id == session_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    # Check persona exists
    if persona not in PERSONA_INSTANCES:
        raise HTTPException(status_code=400, detail=f"Unknown persona: {persona}")

    # Check if custom prompt already exists
    result = await db.execute(
        select(CustomAttackerPrompt).where(
            CustomAttackerPrompt.session_id == session_id,
            CustomAttackerPrompt.persona == persona
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.system_prompt = data.system_prompt
    else:
        new_prompt = CustomAttackerPrompt(
            session_id=session_id,
            persona=persona,
            system_prompt=data.system_prompt,
        )
        db.add(new_prompt)

    await db.commit()
    return {"message": "Prompt updated", "persona": persona}


@router.delete("/sessions/{session_id}/persona-prompts/{persona}")
async def reset_persona_prompt(
    session_id: str,
    persona: str,
    db: AsyncSession = Depends(get_db),
):
    """Reset a persona's prompt to default (delete custom prompt)."""
    result = await db.execute(
        select(CustomAttackerPrompt).where(
            CustomAttackerPrompt.session_id == session_id,
            CustomAttackerPrompt.persona == persona
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
    return {"message": "Prompt reset to default", "persona": persona}