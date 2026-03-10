# Volunteer Skill Matching Engine

> AI-powered semantic matching that connects trained volunteers to humanitarian crises in real time — using OpenAI Embeddings, cosine similarity, and GPT-4o-mini explanations.

---

## The Problem This Solves — For Hiring Teams

Every year, hundreds of humanitarian crises go under-resourced — not because volunteers don't exist, but because no one can find the *right* volunteer *fast enough*. When a flood hits a Spanish-speaking neighborhood in Los Angeles, a trilingual paramedic in Miami doesn't know they're needed. When a refugee camp needs Arabic-speaking trauma counselors, coordination teams spend 48 hours making phone calls instead of deploying help. This engine eliminates that gap entirely. By encoding every volunteer's skills, languages, location, and availability as a high-dimensional semantic vector, and doing the same for every incoming crisis, the system can compute — in milliseconds — which human being on Earth is the most qualified, available, and linguistically suited to respond. It doesn't match keywords. It matches *meaning*. A volunteer described as "emergency room nurse experienced in flood response" will surface for a crisis that says "medical triage needed after monsoon displacement" even though not a single word overlaps. The AI then writes a plain-English explanation that a field coordinator with zero technical background can read and act on immediately. This is what AI should be used for — not generating memes or summarizing emails, but saving lives in communities that have no other safety net. This project proves the ability to design real AI systems that are production-aware, cost-efficient, socially impactful, and built with the engineering discipline that top technology companies demand.

---

## Project Structure

```
volunteer_skill_matching/
├── main.py                  # FastAPI backend — all routes, embedding logic, matching engine
├── App.jsx                  # React frontend source (master copy)
├── requirements.txt         # Python dependencies with pinned versions
├── .env                     # OPENAI_API_KEY — never commit this to git
├── README.md                # This file
└── frontend/                # Vite + React app (generated, copy of App.jsx placed in src/)
    ├── src/
    │   ├── App.jsx          # The full UI — copy from root App.jsx
    │   └── main.jsx         # React entry point
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Full Architecture Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         BROWSER — React UI                               │
│   http://localhost:5173                                                  │
│                                                                          │
│   [Dashboard]  [Volunteers]  [Crises]  [Match Engine]                   │
│        │             │           │            │                          │
│   seed demo     POST /vol    POST /crisis  POST /match                  │
└────────────────────────┬─────────────────────────────────────────────────┘
                         │  HTTP / fetch API (CORS enabled)
                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    BACKEND — FastAPI + Uvicorn                           │
│   http://localhost:8000                                                  │
│                                                                          │
│  POST /volunteers                POST /crises                            │
│       │                               │                                  │
│  volunteer_to_text()           crisis_to_text()                          │
│  "Volunteer Maria Santos            "Crisis: Flooding in East LA.        │
│   is skilled in nurse..."            Needs: medical help, Spanish..."   │
│       │                               │                                  │
│  get_embedding()               get_embedding()                           │
│  → OpenAI text-embedding-3-small → 1536-dim float vector                │
│       │                               │                                  │
│  volunteers_db[]               crises_db[]                               │
│  [{...profile, embedding:[...]}]  [{...crisis, embedding:[...]}]        │
│                                                                          │
│  POST /match                                                             │
│       │                                                                  │
│  for each volunteer:                                                     │
│      score = cosine_similarity(crisis_embedding, volunteer_embedding)    │
│  sort descending → top-K                                                 │
│       │                                                                  │
│  explain_match() × top-K     ← one GPT-4o-mini call per match           │
│       │                                                                  │
│  return ranked JSON with scores + AI explanations                        │
└──────────────────────────────────────────────────────────────────────────┘
                         │  HTTPS API calls
                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         OPENAI API                                       │
│                                                                          │
│  text-embedding-3-small  →  1536-dimensional semantic vector             │
│  gpt-4o-mini             →  2–3 sentence plain-English match explanation │
└──────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Data Flow

**Registering a volunteer:**
1. User fills form → React sends `POST /volunteers` with JSON
2. FastAPI validates input via `VolunteerProfile` Pydantic model
3. `volunteer_to_text()` converts structured fields into one natural-language sentence
4. `get_embedding()` calls OpenAI and receives a 1536-float vector
5. Profile dict + embedding + UUID + timestamp appended to `volunteers_db`
6. React re-fetches `/volunteers` and updates the sidebar list

**Reporting a crisis:**
- Identical flow using `crisis_to_text()` → `get_embedding()` → `crises_db`

**Running a match:**
1. User selects a crisis → React sends `POST /match` with `{crisis_id, top_k: 5}`
2. Backend retrieves pre-computed crisis embedding from `crises_db`
3. Loops all volunteers: `cosine_similarity(crisis_embedding, volunteer_embedding)`
4. Sorts descending, takes top-K
5. Calls `explain_match()` once per top volunteer (GPT-4o-mini)
6. Returns full ranked list: scores, percentages, skill tags, AI explanations
7. React renders animated match cards with score bars and medal ranks

---

## File-by-File Breakdown

### `main.py` — The Brain (262 lines)

#### Imports and startup (lines 1–29)

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
import numpy as np, os, uuid
from datetime import datetime

load_dotenv()                                  # reads .env → OPENAI_API_KEY
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app = FastAPI(title="Volunteer Skill Matching Engine", version="1.0.0")
```

- `load_dotenv()` must appear before `OpenAI()` — it populates `os.environ` from `.env`
- `CORSMiddleware` with `allow_origins=["*"]` lets the React dev server (port 5173) call the API (port 8000)
- Auto-generated Swagger UI available at `/docs` the moment the server starts

#### In-memory stores (lines 32–33)

```python
volunteers_db: List[dict] = []
crises_db: List[dict] = []
```

Two Python lists serve as the entire database. Each entry is a dict containing all profile fields **plus** a `"embedding"` key holding a 1536-element float list. This resets on server restart — intentionally simple for MVP. Swap with PostgreSQL + pgvector for production.

#### Pydantic models (lines 37–56)

| Model | Key fields | Validation |
|---|---|---|
| `VolunteerProfile` | name, skills[], languages[], availability[], location, experience_years, bio | Required: name, skills, languages, availability, location, experience_years |
| `CrisisReport` | title, description, urgency, location, needs[], reported_by | Required: all fields; urgency must be one of: low, medium, high, critical |
| `MatchRequest` | crisis_id, top_k | top_k defaults to 5; crisis_id is a UUID string |

Pydantic v2 raises HTTP 422 automatically if any field is the wrong type or missing.

#### `get_embedding(text)` (lines 60–66)

```python
def get_embedding(text: str) -> List[float]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding  # list of 1536 floats
```

Transforms any text string into a 1536-dimensional semantic vector. Similar meaning → geometrically close vectors. This is why "trauma counselor" matches "mental health support" without any shared keywords. Cost: ~$0.00002 per 1K tokens (negligible).

#### `cosine_similarity(a, b)` (lines 68–72)

```python
def cosine_similarity(a, b):
    a_np, b_np = np.array(a), np.array(b)
    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))
```

Returns a float in [−1, 1]:
- `1.0` → identical semantic meaning
- `0.5` → related but not identical
- `0.0` → completely unrelated

Chosen over Euclidean distance because it measures *direction* (meaning alignment), not magnitude (word count).

#### `volunteer_to_text()` and `crisis_to_text()` (lines 74–92)

Converts structured JSON into a rich natural-language sentence before embedding. Critical design decision — raw JSON produces poor embeddings. A full sentence like `"Volunteer Maria Santos is skilled in nurse, first aid, triage. Speaks Spanish, English. Available weekends, evenings..."` encodes field relationships into the vector.

#### `explain_match()` (lines 94–121)

Calls `gpt-4o-mini` with a structured prompt containing both profiles. Prompt instructs the model to:
- Write 2–3 sentences referencing specific overlapping skills/languages/availability
- End with one concrete action step
- Stay under 150 tokens (fast + cheap)

Cost: ~$0.00015 per explanation call. For 5 matches = $0.00075 per match run.

#### API routes (lines 123–261)

| Route | Method | Description |
|---|---|---|
| `/` | GET | Returns `{"message": "...", "status": "running"}` |
| `/health` | GET | Returns `{"status": "ok", "volunteers": N, "crises": N}` |
| `/volunteers` | POST | Validates → embeds → stores → returns UUID |
| `/volunteers` | GET | Returns all volunteers, embedding arrays stripped |
| `/crises` | POST | Validates → embeds → stores → returns UUID |
| `/crises` | GET | Returns all crises, embedding arrays stripped |
| `/match` | POST | Core engine: cosine similarity → rank → GPT-4o-mini → ranked JSON |
| `/seed` | POST | Wipes both lists, loads hardcoded demo data (see below) |

---

### `App.jsx` — The Interface (409 lines, fully rewritten v2)

A single-file React application. Zero external UI libraries — pure React `useState` / `useEffect` with CSS-in-JS.

#### Design system constants (lines 1–20)

```js
const C = {
  bg: "#03070F",          // near-black navy background
  bgCard: "rgba(10,18,40,0.75)",  // glassmorphism card surface
  blue: "#4F9CF9",        // primary accent — electric blue
  purple: "#8B5CF6",      // secondary accent
  emerald: "#10B981",     // success / availability tags
  amber: "#F59E0B",       // warning / need tags
  red: "#EF4444",         // critical urgency / error
  text: "#F0F6FF",        // primary text
  muted: "#94A3B8",       // secondary text
};
```

#### CSS animations (GLOBAL_CSS string, lines 22–80)

Eleven keyframe animations injected via `<style>` tag:

| Animation | Effect | Used on |
|---|---|---|
| `orb1/2/3` | Slow floating gradient blobs | Background orbs |
| `fadeUp` | Slide up + fade in | Cards, headings |
| `fadeIn` | Opacity fade | Results section |
| `scalePop` | Scale from 0.88 | Match cards |
| `spin` | 360° rotation | Loading spinners |
| `pulse` | Opacity throb | Critical urgency dot |
| `glow` | Box shadow pulse | Run Match button |
| `shimmer` | Skeleton loading sweep | Future skeleton states |
| `bar` | Width 0→N% | Score bar fill |
| `float` | Vertical bob | Empty state icons |
| `neonPulse` | Text-shadow glow | Logo accent |

#### Background component (lines 82–91)

Three animated radial gradient orbs (blue, purple, emerald) plus a subtle CSS grid overlay (`background-image` with linear-gradient lines every 60px). Pure CSS — zero canvas, zero WebGL.

#### State variables (lines 145–155)

| Variable | Purpose |
|---|---|
| `tab` | Active tab: dashboard / volunteers / crises / match |
| `volunteers` | Fetched from GET /volunteers |
| `crises` | Fetched from GET /crises |
| `matches` | Latest POST /match response |
| `loading` | Form submit spinner (register/report) |
| `seeding` | Seed button spinner |
| `notif` | Toast notification `{msg, type}` — auto-dismisses after 4.5s |
| `selCrisis` | Selected crisis UUID in Match Engine |
| `matchLoad` | Match Engine loading spinner |
| `vf` / `cf` | Controlled form state for volunteer / crisis forms |

#### Four tab views

**Dashboard** — Hero heading with gradient text, live stat cards (volunteer count, crisis count, model names), vertical flow diagram showing the 4-step AI pipeline with connector lines, tech stack pills, social impact section, quick-start banner.

**Volunteers** — Split layout: Pydantic-validated registration form (left) with comma-separated input hints, live volunteer card list (right). Each card: color-coded initials avatar, name, location, experience badge, skill tags (blue), language tags (purple), availability tags (green).

**Crises** — Same split layout. Urgency selector (low/medium/high/critical). Each crisis card has a colored left border matching urgency, an animated pulsing dot for CRITICAL status, truncated description, need tags (amber), reporter metadata.

**Match Engine** — Crisis dropdown → Run AI Match button (glow animation). Loading: floating brain emoji + pipeline description text. Results: crisis summary bar showing total volunteers searched; ranked match cards with large percentage score, animated score bar, medal labels (🥇🥈🥉), all skill/language/availability tags, GPT-4o-mini explanation in a distinct AI block.

#### Styling approach

No CSS files. No Tailwind. No styled-components. All styles are inline JS objects plus class names targeting the injected `<style>` tag. Hover effects (card lift, glow on buttons) use CSS class selectors. `backdrop-filter: blur(20px)` on all cards for glassmorphism. `Inter` font for UI, `JetBrains Mono` for technical labels and model names.

---

### `requirements.txt` — Python Dependencies

| Package | Pinned version | Role |
|---|---|---|
| `fastapi` | 0.115.0 | Web framework, route definitions, auto-docs |
| `uvicorn[standard]` | 0.30.6 | ASGI server; `[standard]` adds hot-reload (WatchFiles) and WebSocket support |
| `openai` | 1.51.0 | Official SDK for Embeddings API and Chat Completions API |
| `numpy` | 1.26.4 | Cosine similarity math on 1536-dim float arrays |
| `pydantic` | 2.9.2 | Request/response validation and serialization |
| `python-dotenv` | 1.0.1 | Reads `.env` file into `os.environ` at startup |
| `httpx` | 0.27.2 | Async HTTP client used internally by the OpenAI SDK |

> Installed versions on this machine are newer (FastAPI 0.131, uvicorn 0.41, openai 2.21, numpy 2.4). The code is fully compatible with both pinned and newer versions.

---

### `.env` — Secrets File

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
```

- Must exist in the project root (same directory as `main.py`)
- Read by `load_dotenv()` called at line 14 of `main.py`
- Without a valid key: server starts, but any route calling OpenAI returns a 500 error
- **Add `.env` to `.gitignore` — never commit this file**

---

## Where the Demo Data Comes From

The demo data is **hardcoded directly in `main.py`** inside the `/seed` route (lines 233–261). When you click "Load Demo Data" in the UI or call `POST /seed` via curl, the backend:

1. **Wipes** both `volunteers_db` and `crises_db` (resets to empty lists)
2. **Instantiates** 5 `VolunteerProfile` objects and 1 `CrisisReport` object inline in Python
3. **Calls** `register_volunteer()` for each volunteer — this triggers real OpenAI embedding calls, generating actual 1536-dim vectors for each profile
4. **Calls** `report_crisis()` for the crisis — same real embedding generation
5. Returns `{"message": "Demo data seeded!", "volunteers": 5, "crises": 1}`

There is no fixture file, no CSV, no external database. The seed data is pure Python inside the route function:

```python
demo_volunteers = [
    VolunteerProfile(
        name="Maria Santos",
        skills=["nurse", "first aid", "triage"],
        languages=["Spanish", "English"],
        availability=["weekends", "evenings"],
        location="Los Angeles, CA",
        experience_years=5,
        bio="Emergency room nurse with disaster relief experience"
    ),
    VolunteerProfile(
        name="James Okonkwo",
        skills=["logistics", "supply chain", "driving"],
        languages=["English", "French"],
        availability=["full-time"],
        location="Houston, TX",
        experience_years=8,
        bio="Former military logistics coordinator"
    ),
    VolunteerProfile(
        name="Aisha Rahman",
        skills=["counseling", "mental health", "trauma support"],
        languages=["English", "Arabic", "Urdu"],
        availability=["weekends"],
        location="New York, NY",
        experience_years=6,
        bio="Licensed therapist specializing in crisis intervention"
    ),
    VolunteerProfile(
        name="Chen Wei",
        skills=["software engineering", "data analysis", "communications"],
        languages=["English", "Mandarin"],
        availability=["evenings", "weekends"],
        location="San Francisco, CA",
        experience_years=4,
        bio="Tech volunteer, built disaster coordination tools"
    ),
    VolunteerProfile(
        name="Carlos Rivera",
        skills=["paramedic", "emergency medicine", "CPR training"],
        languages=["Spanish", "English", "Portuguese"],
        availability=["weekends", "on-call"],
        location="Miami, FL",
        experience_years=10,
        bio="Senior paramedic, trilingual medical responder"
    ),
]

demo_crisis = CrisisReport(
    title="Medical Emergency in Spanish-Speaking Community",
    description="Flooding has displaced 200 families in a predominantly Spanish-speaking "
                "neighborhood. Immediate medical attention and trauma support needed for "
                "elderly and children.",
    urgency="critical",
    location="East Los Angeles, CA",
    needs=["medical help", "Spanish speaker", "trauma support", "triage"],
    reported_by="LA Emergency Services"
)
```

**Why this design?** The seed route intentionally calls the same `register_volunteer()` and `report_crisis()` functions used by the real API — it is not a bypass or shortcut. This means the demo data goes through real OpenAI embedding calls and the vectors are genuine, not mocked. The match results you see against the demo crisis are real cosine similarity scores against real semantic vectors.

**Expected match ranking** for "Medical Emergency in Spanish-Speaking Community":
1. **Maria Santos** — nurse + Spanish speaker in Los Angeles (same city, exact skills match)
2. **Carlos Rivera** — paramedic + Spanish + trilingual (medical + language match)
3. **Aisha Rahman** — trauma support + counseling (needs "trauma support" explicitly)
4. **James Okonkwo** — logistics (lower score, no medical or Spanish)
5. **Chen Wei** — communications/tech (lowest score, no medical relevance)

---

## How to Run — Complete Step-by-Step

### Prerequisites

| Requirement | Minimum version | Check with |
|---|---|---|
| Python | 3.10+ | `python --version` |
| pip | any | `pip --version` |
| Node.js | 18+ | `node --version` |
| npm | 8+ | `npm --version` |
| OpenAI API key | — | platform.openai.com |

---

### Step 1 — Get the code

```bash
git clone <your-repo-url>
cd volunteer_skill_matching
```

---

### Step 2 — Create your `.env` file

Create a file named `.env` in the project root (same folder as `main.py`):

```
OPENAI_API_KEY=sk-proj-your-real-key-here
```

> Get your key at: https://platform.openai.com/api-keys
> Required models: `text-embedding-3-small` and `gpt-4o-mini` (both available on free tier with credits)

---

### Step 3 — Install Python dependencies

```bash
pip install -r requirements.txt
```

Expected output: packages installed with no errors.

---

### Step 4 — Start the backend server

```bash
uvicorn main:app --reload --port 8000
```

You should see:

```
INFO:     Will watch for changes in these directories: ['/path/to/volunteer_skill_matching']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXXX] using WatchFiles
INFO:     Started server process [XXXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Verify it works:
```bash
curl http://localhost:8000/health
# → {"status":"ok","volunteers":0,"crises":0}
```

Interactive Swagger UI: **http://localhost:8000/docs**

---

### Step 5 — Set up the frontend (one-time)

```bash
# From the project root
npm create vite@latest frontend -- --template react
cd frontend
npm install

# Copy the UI source into the Vite project
cp ../App.jsx src/App.jsx

# Remove the default CSS import from main.jsx
# Open frontend/src/main.jsx and delete the line: import './index.css'
```

---

### Step 6 — Start the frontend dev server

```bash
# Inside the frontend/ directory
npm run dev -- --port 5173
```

You should see:

```
  VITE v6.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open **http://localhost:5173** in your browser.

---

### Step 7 — Run the full demo

1. Open **http://localhost:5173**
2. On the Dashboard, click **"Load Demo Data"** (top right, green button)
   - This calls `POST /seed` → generates 6 real OpenAI embeddings (5 volunteers + 1 crisis)
   - Wait ~3–5 seconds for the API calls to complete
3. The stat cards update: **5 volunteers, 1 crisis**
4. Navigate to the **Match Engine** tab
5. Select **"[CRITICAL] Medical Emergency in Spanish-Speaking Community"** from the dropdown
6. Click **"Run AI Match"**
   - This computes 5 cosine similarities + calls GPT-4o-mini 5 times for explanations
   - Wait ~5–10 seconds
7. View the ranked results with match scores, skill tags, and AI explanations

---

### Optional: Test via curl (no frontend needed)

```bash
# 1. Seed demo data
curl -X POST http://localhost:8000/seed

# 2. Get the crisis ID from the response
curl http://localhost:8000/crises | python -m json.tool

# 3. Run matching (paste the actual UUID from step 2)
curl -X POST http://localhost:8000/match \
  -H "Content-Type: application/json" \
  -d '{"crisis_id": "PASTE-UUID-HERE", "top_k": 5}' \
  | python -m json.tool

# 4. Register your own volunteer
curl -X POST http://localhost:8000/volunteers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "skills": ["skill1", "skill2"],
    "languages": ["English"],
    "availability": ["weekends"],
    "location": "Your City",
    "experience_years": 3,
    "bio": "Your background"
  }'
```

---

## API Reference

### `POST /volunteers` — Register a volunteer

**Request:**
```json
{
  "name": "Maria Santos",
  "skills": ["nurse", "first aid", "triage"],
  "languages": ["Spanish", "English"],
  "availability": ["weekends", "evenings"],
  "location": "Los Angeles, CA",
  "experience_years": 5,
  "bio": "Emergency room nurse with disaster relief experience"
}
```

**Response 201:**
```json
{
  "id": "3f9a1c2d-...",
  "message": "Volunteer Maria Santos registered successfully"
}
```

---

### `POST /crises` — Report a crisis

**Request:**
```json
{
  "title": "Medical Emergency in Spanish-Speaking Community",
  "description": "Flooding has displaced 200 families in a predominantly Spanish-speaking neighborhood...",
  "urgency": "critical",
  "location": "East Los Angeles, CA",
  "needs": ["medical help", "Spanish speaker", "trauma support", "triage"],
  "reported_by": "LA Emergency Services"
}
```

**Response 201:**
```json
{
  "id": "7b2e4f1a-...",
  "message": "Crisis 'Medical Emergency in Spanish-Speaking Community' reported successfully"
}
```

---

### `POST /match` — Run the AI matching engine

**Request:**
```json
{
  "crisis_id": "7b2e4f1a-...",
  "top_k": 5
}
```

**Response 200:**
```json
{
  "crisis_id": "7b2e4f1a-...",
  "crisis_title": "Medical Emergency in Spanish-Speaking Community",
  "urgency": "critical",
  "total_volunteers_searched": 5,
  "top_matches": [
    {
      "volunteer_id": "3f9a1c2d-...",
      "name": "Maria Santos",
      "score": 0.9241,
      "score_percent": "92%",
      "skills": ["nurse", "first aid", "triage"],
      "languages": ["Spanish", "English"],
      "availability": ["weekends", "evenings"],
      "location": "Los Angeles, CA",
      "experience_years": 5,
      "explanation": "Maria Santos is an outstanding match for this crisis given her nursing and triage skills combined with her fluency in Spanish, directly addressing the community's language and medical needs. Her location in Los Angeles, CA, positions her optimally for rapid deployment to East Los Angeles. She should contact LA Emergency Services immediately to coordinate her arrival at the triage site."
    }
  ]
}
```

---

### All endpoints summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | None | Root health check |
| GET | `/health` | None | Returns volunteer + crisis counts |
| POST | `/volunteers` | None | Register volunteer (triggers embedding) |
| GET | `/volunteers` | None | List all volunteers (embeddings excluded) |
| POST | `/crises` | None | Report crisis (triggers embedding) |
| GET | `/crises` | None | List all crises (embeddings excluded) |
| POST | `/match` | None | Run AI matching for a crisis |
| POST | `/seed` | None | Reset and load demo data |

---

## Technology Choices

| Technology | Version | Role | Why chosen |
|---|---|---|---|
| `FastAPI` | 0.115+ | REST API framework | Auto-generates `/docs`, Pydantic integration, async-native, production-grade |
| `Uvicorn` | 0.30+ | ASGI server | Standard FastAPI runtime; `--reload` flag enables hot-reload in dev |
| `text-embedding-3-small` | — | Semantic vectorization | Best OpenAI cost-to-performance ratio; 1536 dims; strong multilingual; ~$0.00002/1K tokens |
| `gpt-4o-mini` | — | Match explanations | ~100× cheaper than GPT-4; fast inference; perfect for short structured output |
| `NumPy` | 1.26+ | Cosine similarity | No vector DB needed; pure math; handles thousands of comparisons in microseconds |
| `Pydantic v2` | 2.9+ | Validation | Catches malformed requests at the boundary before reaching business logic |
| `python-dotenv` | 1.0+ | Secret management | Industry-standard `.env` pattern; keeps API key out of source code |
| `React` (no framework) | 18+ | Frontend UI | Single-file, no build complexity, zero external UI dependencies |
| In-memory Python lists | — | Data store | Zero infrastructure for MVP; swap with pgvector/Pinecone for production |

---

## Scaling to Production

The current architecture is deliberately minimal for demonstration. Production path:

| Scale | Change | Tool |
|---|---|---|
| 10K+ volunteers | Replace in-memory lists | PostgreSQL + pgvector (`vector(1536)`, `<=>` operator) |
| 1M+ volunteers | Managed vector DB | Pinecone, Weaviate, or Qdrant |
| High throughput | Async embedding jobs | Celery + Redis (decouple registration from embedding) |
| Live crisis feeds | Real-time ingestion | RSS/Twitter webhooks, Twilio SMS parsing |
| Multi-region | CDN + edge deployment | FastAPI on Railway/Render, React on Vercel |
| Auth | Coordinator login | FastAPI OAuth2 + JWT |
| Observability | Cost + latency tracking | LangSmith or custom OpenAI usage logging |

Estimated cost for a live NGO deployment (1K volunteers, 10 crises/day): **< $5/month** in OpenAI API costs.

---

## Demo Data Details

All demo data is **hardcoded in Python** inside the `POST /seed` route in `main.py` (lines 233–261). There is no external file, no database fixture, no CSV. When `/seed` is called, it executes real `register_volunteer()` and `report_crisis()` calls — generating **genuine OpenAI embeddings** for each record, not mocked vectors.

### The 5 demo volunteers

| Name | Skills | Languages | Location | Experience |
|---|---|---|---|---|
| Maria Santos | nurse, first aid, triage | Spanish, English | Los Angeles, CA | 5 years |
| James Okonkwo | logistics, supply chain, driving | English, French | Houston, TX | 8 years |
| Aisha Rahman | counseling, mental health, trauma support | English, Arabic, Urdu | New York, NY | 6 years |
| Chen Wei | software engineering, data analysis, communications | English, Mandarin | San Francisco, CA | 4 years |
| Carlos Rivera | paramedic, emergency medicine, CPR training | Spanish, English, Portuguese | Miami, FL | 10 years |

### The demo crisis

```
Title:    Medical Emergency in Spanish-Speaking Community
Urgency:  CRITICAL
Location: East Los Angeles, CA
Needs:    medical help, Spanish speaker, trauma support, triage
By:       LA Emergency Services
Description: Flooding has displaced 200 families in a predominantly Spanish-speaking
             neighborhood. Immediate medical attention and trauma support needed for
             elderly and children.
```

### Why this dataset was chosen

The crisis deliberately spans multiple volunteer specialties to demonstrate ranking nuance:
- **Maria Santos** scores highest: medical skills + Spanish + geographically closest (same city)
- **Carlos Rivera** scores second: paramedic + Spanish + Portuguese (strong language + medical match)
- **Aisha Rahman** scores third: "trauma support" is an explicit need, strong language diversity
- **James Okonkwo** scores lower: logistics helps but no medical or Spanish
- **Chen Wei** scores lowest: no medical overlap, no Spanish

This spread proves the semantic engine distinguishes *degrees* of relevance, not just binary match/no-match.

---

## Future Roadmap

- Persistent storage (PostgreSQL + pgvector)
- Location-aware scoring (distance × semantic score composite)
- Multilingual crisis intake — report crises in any language
- Match feedback loop — coordinators rate matches; ratings retrain the ranking
- Real-time crisis feeds (RSS, Twitter/X, Twilio SMS)
- Push notifications to matched volunteers (email + SMS via SendGrid/Twilio)
- Role-based access control (coordinator vs. reporter vs. admin)
- Mobile app (React Native) for field coordinators
- Audit trail — log every match decision with timestamp and score for accountability
