import os, random, tempfile, json
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

import logging

# Get the uvicorn error logger
logger = logging.getLogger("uvicorn.error")


from . import models, schemas
from .seed_questions import get_all_seed_questions
from .database import engine, get_db
from .auth import (
    hash_password, verify_password, create_token,
    get_current_user, require_admin,
)

# ── Env ───────────────────────────────────────────────────────────────────────
_ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=os.path.abspath(_ENV_PATH))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
# ── DB ────────────────────────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)


def _startup_seed():
    """Idempotent seeder — runs once when the DB is empty."""
    from .database import SessionLocal
    from .auth import hash_password
    db = SessionLocal()
    try:
        # ── Users ────────────────────────────────────────────────────────────
        if db.query(models.User).count() == 0:
            logger.info("[seed] Creating admin + 22 student accounts…")
            db.add(models.User(
                username="admin", full_name="Teacher Admin",
                hashed_password=hash_password("admin@2024"), role="admin",
            ))
            STUDENT_NAMES = [
                "Aarav Shah", "Priya Nair", "Rohan Mehta", "Sneha Iyer",
                "Karan Patel", "Ananya Sharma", "Vikram Singh", "Divya Reddy",
                "Amit Kumar", "Pooja Gupta", "Rahul Verma", "Neha Joshi",
                "Arjun Malhotra", "Simran Kaur", "Deepak Rao", "Riya Desai",
                "Manish Tiwari", "Kavita Pillai", "Suresh Nambiar", "Lakshmi Menon",
                "Nikhil Bose", "Aisha Khan",
            ]
            pw = hash_password("student@2024")
            for i, name in enumerate(STUDENT_NAMES, start=1):
                db.add(models.User(
                    username=f"student{i:02d}", full_name=name,
                    hashed_password=pw, role="student",
                ))
            db.commit()
            logger.info("[seed] Users created.")

        # ── Questions ────────────────────────────────────────────────────────
        if db.query(models.Question).count() == 0:
            logger.info("[seed] Inserting sample questions…")
            existing = set()
            for role, exp, text in get_all_seed_questions():
                if text not in existing:
                    db.add(models.Question(role=role, experience=exp, text=text))
                    existing.add(text)
            db.commit()
            logger.info(f"[seed] {len(existing)} questions inserted.")
    except Exception as exc:
        logger.error(f"[seed] Error during seeding: {exc}")
        db.rollback()
    finally:
        db.close()


_startup_seed()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="AI Interview Prep API", version="4.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ── Seed ──────────────────────────────────────────────────────────────────────
# ROLES             = ALL_ROLES
EXPERIENCE_LEVELS = ["0-1 years", "1-3 years", "3-5 years", "5+ years"]

DEPARTMENTS = {
    "Development & Engineering": [
        "Full-Stack Developer", "Software Engineer", "Mobile App Developer",
        "QA/Automation Engineer", "Blockchain Developer",
        "Python Developer", "Java Developer",
    ],
    "AI & Data": [
        "AI/ML Engineer", "Data Scientist", "Data Analyst",
        "Prompt Engineer", "NLP Specialist",
    ],
    "Cloud & Infrastructure": [
        "Cloud Architect", "DevOps Engineer", "Site Reliability Engineer (SRE)",
        "Network Engineer", "Systems Administrator",
    ],
    "Cybersecurity": [
        "Cybersecurity Analyst", "Ethical Hacker / Penetration Tester",
        "Security Architect", "Incident Responder", "Compliance/GRC Specialist",
    ],
    "Management & Strategy": [
        "IT Project Manager", "Product Manager", "Business Systems Analyst",
        "IT Director / CIO", "Scrum Master",
    ],
    "Design & Support": [
        "UX/UI Designer", "IT Support Specialist",
        "Technical Writer", "Database Administrator (DBA)",
    ],
}

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "AI Interview Prep API v4 🚀"}


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/login", response_model=schemas.TokenResponse, tags=["auth"])
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact your teacher.")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_token(user.username, user.role)
    return schemas.TokenResponse(
        access_token=token,
        role=user.role,
        username=user.username,
        full_name=user.full_name,
    )


@app.get("/auth/me", response_model=schemas.UserOut, tags=["auth"])
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ── Admin ─────────────────────────────────────────────────────────────────────

@app.get("/admin/students", response_model=list[schemas.StudentStats], tags=["admin"])
def list_students(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Return all student accounts with session stats."""
    students = db.query(models.User).filter(models.User.role == "student").all()
    result = []
    for s in students:
        sessions = db.query(models.InterviewSession).filter(
            models.InterviewSession.user_id == s.id,
            models.InterviewSession.status == "completed",
        ).all()
        scores = [sess.overall_score for sess in sessions if sess.overall_score is not None]
        result.append(schemas.StudentStats(
            id=s.id, username=s.username, full_name=s.full_name,
            is_active=s.is_active, last_login=s.last_login,
            total_sessions=len(sessions),
            avg_score=round(sum(scores)/len(scores), 1) if scores else None,
            best_score=max(scores) if scores else None,
        ))
    return result


@app.patch("/admin/students/{user_id}/toggle", tags=["admin"])
def toggle_student(
    user_id: int,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Enable / disable a student account."""
    user = db.query(models.User).filter(models.User.id == user_id, models.User.role == "student").first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    user.is_active = not user.is_active
    db.commit()
    return {"username": user.username, "is_active": user.is_active}


@app.get("/admin/overview", tags=["admin"])
def admin_overview(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total_students  = db.query(models.User).filter(models.User.role == "student").count()
    total_sessions  = db.query(models.InterviewSession).filter(models.InterviewSession.status == "completed").count()
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(minutes=30)
    active_now = db.query(models.User).filter(
        models.User.role == "student", models.User.last_login >= cutoff
    ).count()
    scores = db.query(models.InterviewSession.overall_score).filter(
        models.InterviewSession.status == "completed",
        models.InterviewSession.overall_score != None,
    ).all()
    avg = round(sum(s[0] for s in scores) / len(scores), 1) if scores else None
    return {
        "total_students": total_students,
        "total_sessions": total_sessions,
        "active_now": active_now,
        "platform_avg_score": avg,
        "total_questions": db.query(models.Question).count(),
    }


# ── Meta ──────────────────────────────────────────────────────────────────────

@app.get("/roles", tags=["meta"])
def get_roles():
    return {
        "departments": DEPARTMENTS,
        "experience_levels": EXPERIENCE_LEVELS,
    }


@app.get("/questions", response_model=list[schemas.QuestionOut], tags=["questions"])
def get_questions(
    role: str = Query(default=None),
    experience: str = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Question)
    if role:       q = q.filter(models.Question.role == role)
    if experience: q = q.filter(models.Question.experience == experience)
    return q.order_by(models.Question.id).all()


# ── Session ───────────────────────────────────────────────────────────────────

@app.post("/session/start", response_model=schemas.SessionStarted, tags=["session"])
def start_session(
    payload: schemas.SessionStart,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    all_qs = (
        db.query(models.Question)
        .filter(models.Question.role == payload.role, models.Question.experience == payload.experience)
        .all()
    )
    if not all_qs:
        raise HTTPException(status_code=404, detail="No questions found for this role/experience.")

    count    = min(payload.num_questions, len(all_qs))
    selected = random.sample(all_qs, count)

    session  = models.InterviewSession(
        user_id=current_user.id,
        role=payload.role, experience=payload.experience, status="in_progress",
    )
    db.add(session); db.commit(); db.refresh(session)

    return schemas.SessionStarted(
        session_id=session.id,
        questions=[q.text for q in selected],
        role=payload.role, experience=payload.experience,
    )


@app.post("/session/{session_id}/submit", response_model=schemas.SessionResult, tags=["session"])
def submit_session(
    session_id: int,
    payload: schemas.SessionSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(models.InterviewSession).filter(
        models.InterviewSession.id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Session already submitted.")

    evaluation = _evaluate_full_session(session.role, session.experience, payload.answers)

    for ans in payload.answers:
        qa_eval = evaluation["per_question"].get(ans.question_index, {})
        db.add(models.SessionAnswer(
            session_id=session.id, question_index=ans.question_index,
            question=ans.question, answer=ans.answer,
            score=qa_eval.get("score"), feedback=qa_eval.get("feedback"),
        ))

    session.status           = "completed"
    session.overall_score    = evaluation.get("overall_score")
    session.overall_feedback = evaluation.get("overall_feedback")
    session.recommendation   = evaluation.get("recommendation")
    session.completed_at     = datetime.utcnow()
    db.commit(); db.refresh(session)

    answer_outs = [
        schemas.SessionAnswerOut(
            question_index=ans.question_index, question=ans.question, answer=ans.answer,
            score=evaluation["per_question"].get(ans.question_index, {}).get("score"),
            feedback=evaluation["per_question"].get(ans.question_index, {}).get("feedback"),
        )
        for ans in payload.answers
    ]
    return schemas.SessionResult(
        session_id=session.id, role=session.role, experience=session.experience,
        overall_score=session.overall_score, overall_feedback=session.overall_feedback,
        recommendation=session.recommendation, answers=answer_outs,
    )


@app.post("/transcribe", tags=["voice"])
def transcribe_audio(file: UploadFile = File(...)):
    ALLOWED = {"audio/wav","audio/mpeg","audio/mp3","audio/x-wav","audio/webm","audio/ogg","audio/flac"}
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unsupported audio type: {file.content_type}")
    ext = os.path.splitext(file.filename or "voice.webm")[1].lower() or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(file.file.read()); tmp_path = tmp.name
    try:
        text = _transcribe_with_groq(tmp_path)
    except Exception as exc:
        text = f"Transcription failed: {exc}"
    finally:
        try: os.unlink(tmp_path)
        except OSError: pass
    return {"text": text}



from groq import Groq

# Replace your _transcribe_with_whisper function
def _transcribe_with_groq(path):
    client = Groq(api_key=GROQ_API_KEY)
    with open(path, "rb") as f:
        # Groq supports whisper-large-v3 and whisper-large-v3-turbo
        transcription = client.audio.transcriptions.create(
            file=(path, f.read()),
            model="whisper-large-v3-turbo",
            response_format="json",
        )
    return transcription.text

# ══════════════════════════════════════════════════════════════════════════════
# AI helpers
# ══════════════════════════════════════════════════════════════════════════════
import json

def _evaluate_full_session(role, experience, answers):
    logger.info("Evaluating full session...")
    # 1. Construct the QA block
    qa_lines = [
        f"Q{a.question_index + 1}: {a.question}\nA{a.question_index + 1}: {a.answer or '[No answer]'}"
        for a in answers
    ]
    qa_block = "\n\n".join(qa_lines)

    # 2. Refined System Message (Open-model friendly)
    system_msg = (
        f"You are a senior technical interviewer for a {role} role. "
        f"The candidate has {experience} of experience. Evaluate strictly.\n"
        "Return ONLY a raw JSON object. Do not include markdown code blocks or explanations.\n"
        "JSON Structure:\n"
        "{"
        ' "per_question": {"0": {"score": 0, "feedback": ""}},'
        ' "overall_score": 0.0,'
        ' "overall_feedback": "",'
        ' "recommendation": "Strong Hire/Hire/Maybe/No Hire"'
        "}"
    )

    user_msg = f"Evaluate this {role} interview transcript:\n\n{qa_block}"
    # logger.info("user_msg", user_msg)
    # 3. Attempt LLM Eval (Open Source or OpenAI)
    # Ensure OPENAI_API_KEY is actually defined in your scope/env
    if globals().get('OPENAI_API_KEY') or globals().get('GROQ_API_KEY'):
        try:
            logger.info("Using LLM for evaluation...")
            # This calls the helper function we discussed earlier
            return _call_open_llm_eval(system_msg, user_msg)
        except Exception as e:
            logger.info(f"[LLM Eval] Failed, falling back to rule-based: {e}")

    # 4. Fallback to rule-based if API fails or Key is missing
    return _rule_based_eval(role, experience, answers)


def _call_open_llm_eval(system_msg, user_msg):
    from openai import OpenAI # The OpenAI library works with Groq
    
    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY
    )
    
    # Using Llama-3.3-70b or 8b (Open Weights Models)
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile", 
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg}
        ],
        max_tokens=2500,
        temperature=0.3,
        # Groq supports the JSON mode just like OpenAI
        response_format={"type": "json_object"},
    )
    
    raw = resp.choices[0].message.content.strip()
    logger.info(f"[Groq/Llama] eval OK — first 200: {raw[:200]}")
    return json.loads(raw)

def _rule_based_eval(role, experience, answers):
    tips = {
        "Data Analyst":    "Use specific metrics, tools (SQL/Tableau), and business impact.",
        "Python Developer":"Reference libraries, design patterns, or performance trade-offs.",
        "Java Developer":  "Mention JVM internals, Spring features, or concurrency details.",
        "AI/ML Engineer":  "Link to model metrics, production impact, or specific algorithms.",
    }
    pq, scores = {}, []
    for a in answers:
        words = len(a.answer.split()) if a.answer.strip() else 0
        if   words == 0:  s, fb = 0.0, "No answer provided."
        elif words < 20:  s, fb = 3.0, "Too brief — add at least 2-3 sentences with specifics."
        elif words < 60:  s, fb = 5.0, f"Decent start but needs more depth. {tips.get(role,'')}"
        elif words < 150: s, fb = 6.5, f"Good answer. Add numbers/examples to score higher."
        else:             s, fb = 7.5, f"Detailed response. {tips.get(role,'')}"
        pq[a.question_index] = {"score": s, "feedback": fb}; scores.append(s)

    overall = round(sum(scores)/len(scores), 1) if scores else 0.0
    rec = "Strong Hire" if overall>=8 else "Hire" if overall>=7 else "Maybe" if overall>=5 else "No Hire"
    return {
        "per_question": pq, "overall_score": overall, "recommendation": rec,
        "overall_feedback": (
            f"{role} ({experience}) — Average {overall}/10 across {len(answers)} questions. "
            "(Rule-based fallback: AI service was unavailable.)"
        ),
    }
