from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env file into environment variables (for litellm)
load_dotenv()

from app.database import init_db
from app.routes import sessions, simulation


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Saruman",
    description="Gamified LLM Safety Research - Red Team vs Blue Team",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api", tags=["sessions"])
app.include_router(simulation.router, prefix="/api", tags=["simulation"])


@app.get("/")
async def root():
    return {"message": "Saruman API - Gamified LLM Safety Research"}


@app.get("/health")
async def health():
    return {"status": "ok"}
