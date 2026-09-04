# ResumeAI

AI-powered resume analysis and job matching.


### 1. Frontend

Open a terminal:

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
