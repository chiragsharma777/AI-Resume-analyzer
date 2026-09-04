@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing frontend dependencies...
  call npm install
)

echo Starting frontend on http://127.0.0.1:5173
call npm run dev -- --host 127.0.0.1 --port 5173
