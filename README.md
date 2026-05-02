# AI Interview Prep (React + FastAPI + SQLite + Whisper + LLM)

## Overview
- Frontend: React + Vite
- Backend: FastAPI
- Database: SQLite (interview records + questions)
- Speech-to-text: Groq API
- LLM feedback: OpenAI GPT model via ChatCompletion

## Setup

### Backend
1. cd backend
2. python -m venv .venv
3. .venv\Scripts\activate
4. pip install -r requirements.txt
5. set GROQ_API=your_key_here (Windows PowerShell: `$env:GROQ_API = '...';`)
6. uvicorn app.main:app --reload --port 8000

### Frontend
1. cd frontend
2. npm install
3. npm run dev
4. open http://localhost:5173

## Usage
- Click a question, type an answer, submit. Backend calls GPT for feedback and stores history.
- Upload mp3/wav and transcribe via /transcribe

## Environment variables
- `GROQ_API_KEY`

## Notes
- Adjust CORS in `backend/app/main.py` for production.
- Use real credentials and secret management for deployment.
