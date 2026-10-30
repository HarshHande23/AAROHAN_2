# APAAR AICTE Platform Launcher
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting AICTE APAAR Platform (Backend + Frontend)" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

$root = $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

Write-Host "`n[1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
$backendCmd = "Set-Location '$backendDir'; if (Test-Path '.venv\Scripts\Activate.ps1') { .\.venv\Scripts\Activate.ps1 } elseif (Test-Path 'venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 2

Write-Host "[2/2] Launching Vite Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
$frontendCmd = "Set-Location '$frontendDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Start-Sleep -Seconds 3

Write-Host "`nOpening Platform in browser: http://localhost:5173/ ..." -ForegroundColor Green
Start-Process "http://localhost:5173/"

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "Platform active at:" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173/" -ForegroundColor Cyan
Write-Host "  Backend:  http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
