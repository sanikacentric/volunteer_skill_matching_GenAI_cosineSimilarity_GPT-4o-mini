@echo off
title Volunteer Skill Matching Engine
color 0B

echo.
echo  =============================================================
echo   Volunteer Skill Matching Engine — Startup
echo  =============================================================
echo.

:: ── Check .env ───────────────────────────────────────────────────────────────
if not exist ".env" (
    echo  [ERROR] .env file not found in this folder.
    echo.
    echo  Create a file named .env with your OpenAI key:
    echo      OPENAI_API_KEY=sk-proj-your-key-here
    echo.
    pause
    exit /b 1
)
echo  [OK] .env file found

:: ── Install Python dependencies ───────────────────────────────────────────────
echo  [..] Installing Python dependencies...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo  [ERROR] pip install failed. Make sure Python and pip are in your PATH.
    pause
    exit /b 1
)
echo  [OK] Python dependencies ready

:: ── Frontend setup (only runs once) ──────────────────────────────────────────
if not exist "frontend\node_modules" (
    echo  [..] Setting up frontend for the first time...

    if not exist "frontend" (
        echo  [..] Creating Vite React project...
        call npm create vite@latest frontend -- --template react --yes >nul 2>&1
        if %errorlevel% neq 0 (
            echo  [ERROR] npm create vite failed. Make sure Node.js is installed.
            pause
            exit /b 1
        )
    )

    echo  [..] Installing frontend dependencies...
    cd frontend
    call npm install --silent
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed.
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo  [OK] Frontend dependencies ready
) else (
    echo  [OK] Frontend dependencies already installed
)

:: ── Copy latest App.jsx into Vite src ────────────────────────────────────────
echo  [..] Copying App.jsx into frontend/src...
copy /Y "App.jsx" "frontend\src\App.jsx" >nul

:: ── Remove default CSS import from main.jsx if present ───────────────────────
powershell -Command "(Get-Content 'frontend\src\main.jsx') -replace \"import './index.css'\", '' | Set-Content 'frontend\src\main.jsx'" >nul 2>&1
echo  [OK] App.jsx synced

:: ── Start backend in a new window ────────────────────────────────────────────
echo  [..] Starting backend on http://localhost:8000 ...
start "Backend — FastAPI" cmd /k "color 0A && echo. && echo  Backend running at http://localhost:8000 && echo  API docs at http://localhost:8000/docs && echo. && uvicorn main:app --reload --port 8000"

:: ── Wait a moment for backend to initialise ──────────────────────────────────
timeout /t 3 /nobreak >nul

:: ── Start frontend in a new window ───────────────────────────────────────────
echo  [..] Starting frontend on http://localhost:5173 ...
start "Frontend — React/Vite" cmd /k "color 0E && echo. && echo  Frontend running at http://localhost:5173 && echo. && cd frontend && npm run dev -- --port 5173"

:: ── Wait for Vite to boot then open browser ──────────────────────────────────
timeout /t 4 /nobreak >nul
echo  [..] Opening browser...
start "" "http://localhost:5173"

:: ── Done ─────────────────────────────────────────────────────────────────────
echo.
echo  =============================================================
echo   Both servers are running!
echo.
echo   Frontend  →  http://localhost:5173
echo   Backend   →  http://localhost:8000
echo   API Docs  →  http://localhost:8000/docs
echo.
echo   Quick start:
echo     1. Click "Load Demo Data" on the Dashboard
echo     2. Go to Match Engine tab
echo     3. Select the crisis and click Run AI Match
echo  =============================================================
echo.
echo  Close the two server windows to stop the servers.
echo.
pause
