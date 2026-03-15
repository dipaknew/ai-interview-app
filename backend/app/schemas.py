from pydantic import BaseModel
from typing import Optional


class InterviewRecordCreate(BaseModel):
    question: str
    answer: str


class InterviewRecord(BaseModel):
    id: int
    question: str
    answer: str
    ai_feedback: Optional[str]

    class Config:
        orm_mode = True


class QuestionOut(BaseModel):
    id: int
    text: str

    class Config:
        orm_mode = True
