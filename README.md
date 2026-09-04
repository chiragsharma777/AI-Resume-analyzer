# ResumeAI

AI-powered resume analysis and job matching.

## Quick start (Windows)

### 1. Backend

```bat
cd backend
start.bat
```

API: http://127.0.0.1:8000  
Docs: http://127.0.0.1:8000/docs

Make sure `backend/.env` has a valid `OPENROUTER_API_KEY`.

### 2. Frontend

Open a second terminal:

```bat
cd resume-ai-frontend
start.bat
```

App: http://127.0.0.1:5173

## Manual start

Backend:

```bat
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bat
cd resume-ai-frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

## Features

- Register / login with JWT
- Upload PDF, DOCX, or TXT resumes
- AI ATS analysis via OpenRouter
- Job role recommendations
