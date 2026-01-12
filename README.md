# Saruman

Saruman is a research and simulation platform for evaluating the security and usability of AI assistants in adversarial scenarios. It features a Red Team vs Blue Team framework, allowing you to run experiments with different attacker and defender personas, track secret leakage, and analyze results.

## Project Structure

- **backend/**: FastAPI backend for experiment orchestration, persona logic, and data storage.
- **frontend/**: React + TypeScript frontend for experiment setup, monitoring, and results visualization.
- **data/**: (Optional) Data storage or exports.
- **CLAUDE.md, PLAN.md, EXPERIMENT_ROADMAP.md**: Project planning and documentation.

## Features

- Multi-persona Red Team (attackers) and Blue Team (defenders)
- Experiment setup: choose models, personas, secret types, and rules
- Simulation of multi-turn conversations with secret extraction and scoring
- Real-time experiment progress and results dashboard
- Extensible persona and defense templates

## Quickstart

### Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) Docker

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit as needed
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at [http://localhost:5173](http://localhost:5173) and the backend at [http://localhost:8000](http://localhost:8000).

### Running Experiments

1. Open the frontend in your browser.
2. Create a new session or experiment.
3. Select attacker/defender personas, models, and secret types.
4. Start the simulation and monitor progress.
5. View results and export data as needed.

## Development

- **Backend**: FastAPI, SQLAlchemy, asyncio
- **Frontend**: React, TypeScript, Vite
- **Testing**: Pytest (backend), Vitest/Jest (frontend)

### Running Backend Tests

```bash
cd backend
pytest
```

### Running Frontend Tests

```bash
cd frontend
npm test
```

## Contributing

Pull requests and issues are welcome! See the roadmap and planning docs for ideas.

## License

MIT License

---

For more details, see the [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).