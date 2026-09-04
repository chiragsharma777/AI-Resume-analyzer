@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment...
  python -m venv .venv
  .\.venv\Scripts\python.exe -m pip install --upgrade pip
  .\.venv\Scripts\python.exe -m pip install -r requirements.txt
)

echo Starting backend on http://127.0.0.1:8000
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
