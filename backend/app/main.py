import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from openai import OpenAI
import tempfile
from dotenv import load_dotenv
from . import models, schemas
from .database import engine, get_db

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
models.Base.metadata.create_all(bind=engine)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("WARNING: OPENAI_API_KEY not found. Running in dummy mode for interview + transcription.")
    openai_client = None
else:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(title="AI Interview Prep")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed questions on startup
@app.on_event("startup")
def seed_questions():
    db = next(get_db())
    base_questions = [
        "Tell me about yourself.",
        "What are your strengths and weaknesses?",
        "Describe a challenging problem you solved.",
        "How do you prepare for an interview?",
    ]
    for q in base_questions:
        exists = db.query(models.Question).filter(models.Question.text == q).first()
        if not exists:
            db.add(models.Question(text=q))
    db.commit()

@app.get("/questions", response_model=list[schemas.QuestionOut])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(models.Question).all()
    # Dummy question for now (non-persistent)
    dummy_text = "What is a technical challenge you solved recently?"
    if not any(q.text == dummy_text for q in questions):
        questions.append(models.Question(id=0, text=dummy_text))
    return questions

@app.get("/history", response_model=list[schemas.InterviewRecord])
def get_history(db: Session = Depends(get_db)):
    return db.query(models.InterviewRecord).order_by(models.InterviewRecord.id.desc()).limit(20).all()

@app.post("/interview", response_model=schemas.InterviewRecord)
def add_interview(record: schemas.InterviewRecordCreate, db: Session = Depends(get_db)):
    # Dummy response for now (no external LLM call)
    ai_feedback = (
        "Great start! Your answer is clear and structured. "
        "Next time, include a real example with results and quantify the outcome."
    )

    record_db = models.InterviewRecord(
        question=record.question,
        answer=record.answer,
        ai_feedback=ai_feedback,
    )
    db.add(record_db)
    db.commit()
    db.refresh(record_db)
    return record_db

@app.post("/transcribe")
def transcribe_audio(file: UploadFile = File(...)):
    allowed_types = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/x-wav", "audio/webm", "audio/ogg", "audio/flac"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported audio type: {file.content_type}")

    ext = os.path.splitext(file.filename)[1].lower() or ".wav"
    if not ext.startswith('.'):
        ext = '.' + ext

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
        temp_file.write(file.file.read())
        temp_path = temp_file.name

    try:
        if not openai_client:
            # Dummy mode when key is absent
            text = "Dummy transcribed text (api key not set)."
        else:
            with open(temp_path, "rb") as audio_in:
                transcript = openai_client.audio.transcriptions.create(
                    file=audio_in,
                    model="whisper-1",
                )
            text = transcript.get("text") if isinstance(transcript, dict) else None
            if not text:
                raise ValueError(f"Transcription returned no text: {transcript}")
    except Exception as e:
        # In development/dummy mode, fallback to synthetic text instead of 500.
        print(f"transcribe error: {type(e).__name__}: {e}")
        text = f"Dummy transcribed text (failed API call: {type(e).__name__})"
    finally:
        try:
            os.unlink(temp_path)
        except Exception:
            pass

    return {"text": text}
