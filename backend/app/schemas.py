from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str
    username:     str
    full_name:    Optional[str] = None

class UserOut(BaseModel):
    id:         int
    username:   str
    full_name:  Optional[str]
    role:       str
    is_active:  bool
    created_at: datetime
    last_login: Optional[datetime]
    model_config = {"from_attributes": True}


# ── Admin monitoring ──────────────────────────────────────────────────────────
class StudentStats(BaseModel):
    id:             int
    username:       str
    full_name:      Optional[str]
    is_active:      bool
    last_login:     Optional[datetime]
    total_sessions: int
    avg_score:      Optional[float]
    best_score:     Optional[float]
    model_config = {"from_attributes": True}


# ── Question ──────────────────────────────────────────────────────────────────
class QuestionOut(BaseModel):
    id:         int
    role:       str
    experience: str
    text:       str
    model_config = {"from_attributes": True}


# ── Session ───────────────────────────────────────────────────────────────────
class SessionStart(BaseModel):
    role:          str
    experience:    str
    num_questions: int = 10

class SessionStarted(BaseModel):
    session_id: int
    questions:  List[str]
    role:       str
    experience: str

class AnswerSubmit(BaseModel):
    question_index: int
    question:       str
    answer:         str

class SessionSubmit(BaseModel):
    answers: List[AnswerSubmit]

class SessionAnswerOut(BaseModel):
    question_index: int
    question:       str
    answer:         str
    score:          Optional[float] = None
    feedback:       Optional[str]   = None
    model_config = {"from_attributes": True}

class SessionResult(BaseModel):
    session_id:       int
    role:             str
    experience:       str
    overall_score:    Optional[float] = None
    overall_feedback: Optional[str]   = None
    recommendation:   Optional[str]   = None
    answers:          List[SessionAnswerOut]
    model_config = {"from_attributes": True}


# ── Legacy ────────────────────────────────────────────────────────────────────
class InterviewRecordCreate(BaseModel):
    role: str; experience: str; question: str; answer: str

class InterviewRecord(BaseModel):
    id: int; role: str; experience: str; question: str; answer: str
    ai_feedback: Optional[str] = None
    model_config = {"from_attributes": True}
