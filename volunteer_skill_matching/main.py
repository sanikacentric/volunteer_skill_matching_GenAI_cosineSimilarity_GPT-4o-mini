"""
Volunteer Skill Matching Engine
Backend: FastAPI + OpenAI Embeddings + In-memory Vector Store
Model: gpt-4o-mini for explanations, text-embedding-3-small for embeddings
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
import json
from datetime import datetime
import uuid

app = FastAPI(title="Volunteer Skill Matching Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ─── In-Memory Vector Store (swap with pgvector/Pinecone in production) ───────
volunteers_db: List[dict] = []
crises_db: List[dict] = []

# ─── Models ───────────────────────────────────────────────────────────────────

class VolunteerProfile(BaseModel):
    name: str
    skills: List[str]          # ["nurse", "paramedic", "first aid"]
    languages: List[str]       # ["English", "Spanish"]
    availability: List[str]    # ["weekends", "evenings"]
    location: str              # "New York, NY"
    experience_years: int
    bio: Optional[str] = ""

class CrisisReport(BaseModel):
    title: str
    description: str
    urgency: str               # low | medium | high | critical
    location: str
    needs: List[str]           # ["medical help", "Spanish speaker", "logistics"]
    reported_by: str

class MatchRequest(BaseModel):
    crisis_id: str
    top_k: int = 5

# ─── Embedding Helpers ────────────────────────────────────────────────────────

def get_embedding(text: str) -> List[float]:
    """Generate embedding using OpenAI text-embedding-3-small"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors"""
    a_np = np.array(a)
    b_np = np.array(b)
    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))

def volunteer_to_text(v: dict) -> str:
    """Convert volunteer profile to rich text for embedding"""
    return (
        f"Volunteer {v['name']} is skilled in {', '.join(v['skills'])}. "
        f"Speaks {', '.join(v['languages'])}. "
        f"Available {', '.join(v['availability'])}. "
        f"Located in {v['location']}. "
        f"Has {v['experience_years']} years of experience. "
        f"Bio: {v.get('bio', '')}"
    )

def crisis_to_text(c: dict) -> str:
    """Convert crisis report to rich text for embedding"""
    return (
        f"Crisis: {c['title']}. {c['description']} "
        f"Urgency: {c['urgency']}. "
        f"Location: {c['location']}. "
        f"Needs: {', '.join(c['needs'])}."
    )

def explain_match(volunteer: dict, crisis: dict, score: float) -> str:
    """Use gpt-4o-mini to explain why this volunteer matches this crisis"""
    prompt = f"""
You are a humanitarian coordination assistant. Explain in 2-3 sentences why this volunteer is a good match for this crisis. Be specific about which skills/languages/availability align. End with one concrete action they should take.

Volunteer: {volunteer['name']}
Skills: {', '.join(volunteer['skills'])}
Languages: {', '.join(volunteer['languages'])}
Availability: {', '.join(volunteer['availability'])}
Location: {volunteer['location']}

Crisis: {crisis['title']}
Description: {crisis['description']}
Needs: {', '.join(crisis['needs'])}
Location: {crisis['location']}
Urgency: {crisis['urgency']}

Match Score: {score:.0%}

Provide a concise, human-readable explanation.
"""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150,
        temperature=0.7
    )
    return response.choices[0].message.content.strip()

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Volunteer Skill Matching Engine API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok", "volunteers": len(volunteers_db), "crises": len(crises_db)}

@app.post("/volunteers", status_code=201)
def register_volunteer(profile: VolunteerProfile):
    """Register a volunteer and store their embedding"""
    volunteer_data = profile.model_dump()
    volunteer_data["id"] = str(uuid.uuid4())
    volunteer_data["created_at"] = datetime.utcnow().isoformat()

    # Generate semantic embedding
    text = volunteer_to_text(volunteer_data)
    volunteer_data["embedding"] = get_embedding(text)
    volunteer_data["embedding_text"] = text

    volunteers_db.append(volunteer_data)
    return {"id": volunteer_data["id"], "message": f"Volunteer {profile.name} registered successfully"}

@app.get("/volunteers")
def list_volunteers():
    """List all volunteers (without embeddings for brevity)"""
    return [
        {k: v for k, v in vol.items() if k != "embedding"}
        for vol in volunteers_db
    ]

@app.post("/crises", status_code=201)
def report_crisis(report: CrisisReport):
    """Report a crisis and store its embedding"""
    crisis_data = report.model_dump()
    crisis_data["id"] = str(uuid.uuid4())
    crisis_data["created_at"] = datetime.utcnow().isoformat()
    crisis_data["status"] = "open"

    # Generate semantic embedding
    text = crisis_to_text(crisis_data)
    crisis_data["embedding"] = get_embedding(text)
    crisis_data["embedding_text"] = text

    crises_db.append(crisis_data)
    return {"id": crisis_data["id"], "message": f"Crisis '{report.title}' reported successfully"}

@app.get("/crises")
def list_crises():
    """List all crises (without embeddings)"""
    return [
        {k: v for k, v in c.items() if k != "embedding"}
        for c in crises_db
    ]

@app.post("/match")
def find_matches(request: MatchRequest):
    """
    Core matching engine:
    1. Find crisis by ID
    2. Compute cosine similarity with all volunteer embeddings
    3. Rank and return top-K matches with AI explanations
    """
    # Find crisis
    crisis = next((c for c in crises_db if c["id"] == request.crisis_id), None)
    if not crisis:
        raise HTTPException(status_code=404, detail="Crisis not found")

    if not volunteers_db:
        raise HTTPException(status_code=404, detail="No volunteers registered yet")

    # Compute similarities
    crisis_embedding = crisis["embedding"]
    scored_volunteers = []

    for volunteer in volunteers_db:
        score = cosine_similarity(crisis_embedding, volunteer["embedding"])
        scored_volunteers.append((score, volunteer))

    # Sort by score descending
    scored_volunteers.sort(key=lambda x: x[0], reverse=True)
    top_matches = scored_volunteers[:request.top_k]

    # Build results with AI explanations
    results = []
    for score, volunteer in top_matches:
        explanation = explain_match(volunteer, crisis, score)
        results.append({
            "volunteer_id": volunteer["id"],
            "name": volunteer["name"],
            "score": round(score, 4),
            "score_percent": f"{score:.0%}",
            "skills": volunteer["skills"],
            "languages": volunteer["languages"],
            "availability": volunteer["availability"],
            "location": volunteer["location"],
            "experience_years": volunteer["experience_years"],
            "explanation": explanation,
        })

    return {
        "crisis_id": crisis["id"],
        "crisis_title": crisis["title"],
        "urgency": crisis["urgency"],
        "top_matches": results,
        "total_volunteers_searched": len(volunteers_db)
    }

@app.post("/seed")
def seed_demo_data():
    """Seed demo volunteers and a crisis for testing"""
    global volunteers_db, crises_db
    volunteers_db = []
    crises_db = []

    demo_volunteers = [
        VolunteerProfile(name="Maria Santos", skills=["nurse", "first aid", "triage"], languages=["Spanish", "English"], availability=["weekends", "evenings"], location="Los Angeles, CA", experience_years=5, bio="Emergency room nurse with disaster relief experience"),
        VolunteerProfile(name="James Okonkwo", skills=["logistics", "supply chain", "driving"], languages=["English", "French"], availability=["full-time"], location="Houston, TX", experience_years=8, bio="Former military logistics coordinator"),
        VolunteerProfile(name="Aisha Rahman", skills=["counseling", "mental health", "trauma support"], languages=["English", "Arabic", "Urdu"], availability=["weekends"], location="New York, NY", experience_years=6, bio="Licensed therapist specializing in crisis intervention"),
        VolunteerProfile(name="Chen Wei", skills=["software engineering", "data analysis", "communications"], languages=["English", "Mandarin"], availability=["evenings", "weekends"], location="San Francisco, CA", experience_years=4, bio="Tech volunteer, built disaster coordination tools"),
        VolunteerProfile(name="Carlos Rivera", skills=["paramedic", "emergency medicine", "CPR training"], languages=["Spanish", "English", "Portuguese"], availability=["weekends", "on-call"], location="Miami, FL", experience_years=10, bio="Senior paramedic, trilingual medical responder"),
    ]

    for v in demo_volunteers:
        register_volunteer(v)

    demo_crisis = CrisisReport(
        title="Medical Emergency in Spanish-Speaking Community",
        description="Flooding has displaced 200 families in a predominantly Spanish-speaking neighborhood. Immediate medical attention and trauma support needed for elderly and children.",
        urgency="critical",
        location="East Los Angeles, CA",
        needs=["medical help", "Spanish speaker", "trauma support", "triage"],
        reported_by="LA Emergency Services"
    )
    report_crisis(demo_crisis)

    return {"message": "Demo data seeded!", "volunteers": len(volunteers_db), "crises": len(crises_db)}
