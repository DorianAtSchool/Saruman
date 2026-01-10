# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Saruman** - A hackathon project that gamifies LLM safety research. Users ("Blue Team") configure an AI agent to protect PII secrets, then the system attacks it with automated "Red Team" LLM personas.

See `PLAN.md` for detailed implementation plan.

## Tech Stack

- **Backend**: FastAPI, SQLite, LiteLLM
- **Frontend**: React + TypeScript + Vite, Tailwind CSS
- **No auth** - single-user hackathon demo

## Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Project Structure

```
saruman/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   └── personas/         # Red Team attackers
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/            # Setup, Simulation, Results
│       └── components/       # UI components
└── data/                     # SQLite DB
```

## Core Concepts

- **Blue Team**: User-configured defense (system prompt + middleware)
- **Red Team**: 7 attacker personas (Utilitarian, Close Friend, Admin, Context Poisoner, Gaslighter, Aggressor, Benign User)
- **Middleware Pipeline**: Regex Minefield, LLM-as-Judge
- **Win Condition**: Pattern matching detects if secret VALUES appear in responses
- **Scoring**: Security (% secrets kept) + Usability (% benign questions answered)
