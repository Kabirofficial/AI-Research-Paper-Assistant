@echo off
echo ========================================================
echo   AI Research Paper Assistant - Local Development
echo ========================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)

REM Check if Node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

echo [1/4] Setting up Backend...
cd backend
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

if not exist .env (
    echo Initializing backend .env from template...
    copy .env.example .env >nul
)

pip install -r requirements.txt --quiet

echo [2/4] Starting Backend Server (http://127.0.0.1:8000)...
start "Backend - FastAPI" cmd /k "call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

cd ..\frontend

echo [3/4] Setting up Frontend...
if not exist .env (
    echo Initializing frontend .env from template...
    copy .env.example .env >nul
)

if not exist node_modules (
    echo Installing npm dependencies...
    call npm install
)

echo [4/4] Starting Frontend Vite Server (http://localhost:5173)...
start "Frontend - Vite React" cmd /k "npm run dev"

echo.
echo ========================================================
echo   Application launched!
echo   - Backend:  http://127.0.0.1:8000 (Swagger docs: /docs)
echo   - Frontend: http://localhost:5173
echo ========================================================
echo.
pause
