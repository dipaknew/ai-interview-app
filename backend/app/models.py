from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, index=True, nullable=False)
    full_name       = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role            = Column(String, default="student")   # "student" | "admin"
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    last_login      = Column(DateTime, nullable=True)

    sessions = relationship("InterviewSession", back_populates="user")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=True)
    role             = Column(String, index=True)
    experience       = Column(String)
    status           = Column(String, default="in_progress")   # in_progress | completed
    overall_score    = Column(Float,   nullable=True)
    overall_feedback = Column(Text,    nullable=True)
    recommendation   = Column(String,  nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    completed_at     = Column(DateTime, nullable=True)

    user    = relationship("User", back_populates="sessions")
    answers = relationship("SessionAnswer", back_populates="session",
                           order_by="SessionAnswer.question_index")


class SessionAnswer(Base):
    __tablename__ = "session_answers"
    id             = Column(Integer, primary_key=True, index=True)
    session_id     = Column(Integer, ForeignKey("interview_sessions.id"), index=True)
    question_index = Column(Integer)
    question       = Column(String)
    answer         = Column(Text)
    score          = Column(Float,  nullable=True)
    feedback       = Column(Text,   nullable=True)

    session = relationship("InterviewSession", back_populates="answers")


class Question(Base):
    __tablename__ = "questions"
    id         = Column(Integer, primary_key=True, index=True)
    role       = Column(String, index=True, default="General")
    experience = Column(String, default="All")
    text       = Column(String, unique=True, index=True)


class InterviewRecord(Base):
    """Legacy single-Q records."""
    __tablename__ = "interview_records"
    id          = Column(Integer, primary_key=True, index=True)
    role        = Column(String, index=True, default="General")
    experience  = Column(String, default="0-1 years")
    question    = Column(String, index=True)
    answer      = Column(Text)
    ai_feedback = Column(Text)
