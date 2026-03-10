# Contributing to Volunteer Skill Matching Engine

Thank you for wanting to contribute to a project that helps connect volunteers to humanitarian crises. Every contribution — big or small — directly improves how fast help reaches people who need it most.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Setting Up Locally](#setting-up-locally)
- [Project Structure](#project-structure)
- [Types of Contributions](#types-of-contributions)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project exists to serve vulnerable communities during crises. All contributors are expected to:

- Be respectful and constructive in all communication
- Focus on what is best for the people this tool serves
- Welcome contributors of all backgrounds and experience levels
- Never submit code that could compromise user safety or data security

---

## How to Contribute

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create a branch** for your change (`git checkout -b feature/your-feature-name`)
4. **Make your changes** and test them
5. **Push** to your fork
6. **Open a Pull Request** against the `main` branch

---

## Setting Up Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- An OpenAI API key (`text-embedding-3-small` + `gpt-4o-mini` access)

### Steps

```bash
# 1. Clone your fork
git clone https://github.com/YOUR_USERNAME/volunteer-skill-matching.git
cd volunteer-skill-matching

# 2. Create your .env file
echo "OPENAI_API_KEY=sk-proj-your-key-here" > .env

# 3. Run everything with one command (Windows)
run.bat

# --- OR manually ---

# Install Python deps
pip install -r requirements.txt

# Start backend
uvicorn main:app --reload --port 8000

# In a new terminal — set up and start frontend
cd frontend
npm install
npm run dev -- --port 5173
```

Open **http://localhost:5173** to see the UI.
Open **http://localhost:8000/docs** to explore the API interactively.

---

## Project Structure

```
volunteer_skill_matching/
├── main.py              # FastAPI backend — all routes, embedding, matching engine
├── App.jsx              # React frontend source (master copy — always edit this)
├── requirements.txt     # Python dependencies
├── render.yaml          # Render.com backend deployment config
├── run.bat              # One-click Windows startup script
├── .env                 # Your secrets — never commit this
├── CONTRIBUTING.md      # This file
├── README.md            # Full project documentation
└── frontend/            # Vite React project
    ├── src/
    │   ├── App.jsx      # Synced from root App.jsx (auto-copied by run.bat)
    │   └── main.jsx     # React entry point
    ├── vercel.json      # Vercel deployment config
    └── .env.example     # Template for VITE_API_URL
```

> **Important:** Always edit the root `App.jsx`, not `frontend/src/App.jsx`. The `run.bat` script automatically syncs the root copy into the frontend folder on every run.

---

## Types of Contributions

### Bug Fixes
- Anything broken in the UI, API, or matching logic
- Check the Issues tab for bugs tagged `bug`

### New Features
Ideas that would meaningfully help the mission:

| Idea | Difficulty | Impact |
|---|---|---|
| PostgreSQL + pgvector persistent storage | Medium | High |
| Location-based scoring (distance × semantic score) | Medium | High |
| Multilingual crisis intake | Medium | High |
| Email/SMS notifications to matched volunteers | Medium | High |
| Match feedback loop (thumbs up/down) | Medium | Medium |
| Real-time crisis feeds (RSS/Twilio) | Hard | High |
| Mobile app (React Native) | Hard | High |
| Role-based access control | Medium | Medium |

### Documentation
- Fix typos or unclear explanations in README or CONTRIBUTING
- Add inline comments to complex logic in `main.py`
- Translate the README into other languages

### Tests
- Unit tests for `cosine_similarity()`, `volunteer_to_text()`, `crisis_to_text()`
- Integration tests for all API routes using `pytest` + `httpx`
- Frontend component tests using Vitest

---

## Submitting a Pull Request

### Branch naming

```
feature/add-pgvector-storage
fix/match-score-calculation
docs/update-api-reference
test/add-route-tests
```

### PR checklist

Before opening a PR, make sure:

- [ ] Code runs locally without errors (`uvicorn main:app --reload` starts cleanly)
- [ ] Frontend builds without errors (`cd frontend && npm run build`)
- [ ] No `.env` file or API keys are included in the commit
- [ ] `main.py` changes are reflected in README if they affect the API
- [ ] Root `App.jsx` is the one edited (not `frontend/src/App.jsx` directly)
- [ ] PR description explains *what* changed and *why*

### Commit message format

```
<type>: <short summary>

<optional longer description>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

Examples:
```
feat: add pgvector persistent storage for volunteers
fix: cosine similarity returning NaN for empty bio field
docs: add deployment steps for Railway
test: add pytest integration tests for /match route
```

---

## Coding Standards

### Python (`main.py`)

- Follow PEP 8
- All functions must have a docstring
- Use type hints on all function signatures
- Keep routes thin — business logic goes in helper functions
- Never log or print the OpenAI API key

### JavaScript / React (`App.jsx`)

- Functional components only (no class components)
- All styles as inline JS objects or the `GLOBAL_CSS` string at the top
- No external UI libraries — keep it dependency-free
- State management with `useState` and `useEffect` only (no Redux/Zustand)
- Environment variables via `import.meta.env.VITE_*` prefix

### General

- Do not hardcode API keys, URLs, or model names outside of the designated constants
- Keep the backend in a single `main.py` file unless the addition genuinely requires a new module
- Prefer clarity over cleverness

---

## Reporting Bugs

Open a GitHub Issue with:

1. **What you expected** to happen
2. **What actually happened** (include error messages)
3. **Steps to reproduce** the issue
4. **Environment** — OS, Python version, Node version, browser

---

## Suggesting Features

Open a GitHub Issue tagged `enhancement` with:

1. **The problem** it solves (especially how it helps crisis response)
2. **Proposed solution** — even a rough description helps
3. **Alternatives considered**
4. **Willingness to implement** — are you offering to build it?

---

## Questions?

Open a GitHub Discussion or an Issue tagged `question`. All questions are welcome — there are no stupid ones when lives are on the line.
