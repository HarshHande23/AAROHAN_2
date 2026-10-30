@echo off
title APAAR AICTE Platform Launcher
echo ===================================================
echo   Starting AICTE APAAR Platform (Backend + Frontend)
echo ===================================================
echo.

echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "APAAR Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate.bat 2>nul || .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Vite Frontend on http://localhost:5173 ...
start "APAAR Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo Opening Platform in default browser: http://localhost:5173/ ...
start http://localhost:5173/

echo ===================================================
echo Platform launched successfully!
echo Backend:  http://127.0.0.1:8000/docs
echo Frontend: http://localhost:5173/
echo ===================================================
pause
