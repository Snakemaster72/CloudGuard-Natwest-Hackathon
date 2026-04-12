# Local development (no Docker)

This repo is structured as a lightweight multi-service app:

- `ml-service/` (Python/FastAPI/Prophet)
- `backend/` (Node/Express + Gemini)
- `frontend/` (React/Vite)

The instructions below avoid system-wide installs and work well on Arch Linux.

> Prereqs you install once (user-level):
> - `nvm` for Node version management
> - `poetry` for Python env management

---

## 0) Repo env

Create `.env` in repo root:

- Copy `.env.example` → `.env`
- Set `GEMINI_API_KEY=...`

---

## 1) Python ML service (Poetry)

```zsh
cd ml-service
poetry env use python3
poetry install
poetry run uvicorn app.main:app --reload --port 8001
```

Check:
- http://localhost:8001/health

---

## 2) Backend (Node via nvm)

In a new terminal:

```zsh
export NVM_DIR="$HOME/.nvm"
# ensure your shell loads nvm (depends on how you installed it)
# e.g. source "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20

cd backend
npm install

# backend reads repo-root .env, so run from repo root OR set env vars in shell.
cd ..
node backend/src/index.js
```

Check:
- http://localhost:8000/health

---

## 3) Frontend (React)

In a new terminal:

```zsh
export NVM_DIR="$HOME/.nvm"
# source "$NVM_DIR/nvm.sh"

nvm use 20
cd frontend
npm install

# points to backend
export VITE_API_BASE_URL="http://localhost:8000"

npm run dev
```

Open:
- http://localhost:5173

If you get an error that the port is already in use, stop the process using 5173 or change `frontend/vite.config.ts` to another port.

---

## Scenario (v1)

Once all three services are running, use the Scenario panel in the React UI:

- Start date (defaults to tomorrow)
- Traffic multiplier (e.g. `1.2` for +20%)
- Unit cost % (e.g. `-0.08` for -8%)

This calls:
- `POST http://localhost:8000/api/scenario/run`
which proxies to:
- `POST http://localhost:8001/ml/scenario`

---

## Notes / troubleshooting

- Prophet build issues locally on Arch:
  - Prefer installing a Python version with good wheel support (3.11 usually works well).
  - If Prophet fails to install, we can switch to `statsforecast`/`pmdarima` baseline-only temporarily or run Prophet via a lightweight container later.

- If the backend fails because `fetch` is missing:
  - Node 20 includes `fetch` globally; ensure you’re on Node 20+.

- If Gemini returns non-JSON:
  - The current backend does a simple `JSON.parse`. Next improvement is to add JSON repair + strict schema validation.
