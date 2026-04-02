@echo off
setlocal enabledelayedexpansion
set ROOT=%CD%

echo ============================================
echo WhatsApp CRM - Starting Development Servers
echo ============================================
echo.

echo Checking Docker containers...
docker-compose up -d
echo.

REM Check if Windows Terminal is available
where wt >nul 2>nul
if %errorlevel% equ 0 (
    echo Opening in Windows Terminal with tabs...
    
    REM Start Windows Terminal with multiple tabs
    start wt -w 0 ^
        --title "Main" ; ^
        new-tab -d "%ROOT%\backend" --title "Backend" powershell -NoExit -Command "npm run start:dev" ; ^
        new-tab -d "%ROOT%\frontend" --title "Frontend" powershell -NoExit -Command "npm run dev" ; ^
        new-tab -d "%ROOT%\worker" --title "Worker" powershell -NoExit -Command "npm run start:dev"
    
    echo ✓ All services started in Windows Terminal tabs!
) else (
    echo Windows Terminal not found. Opening separate windows...
    echo.
    
    echo [1/3] Starting Backend API...
    start "Backend" cmd /k "cd /d "%ROOT%\backend" && npm run start:dev"
    
    timeout /t 3 /nobreak > nul
    
    echo [2/3] Starting Frontend...
    start "Frontend" cmd /k "cd /d "%ROOT%\frontend" && npm run dev"
    
    timeout /t 2 /nobreak > nul
    
    echo [3/3] Starting Worker...
    start "Worker" cmd /k "cd /d "%ROOT%\worker" && npm run start:dev"
    
    echo ✓ All services started in separate windows!
)

echo.
echo ============================================
echo Backend API:  http://localhost:3000/api
echo Frontend:     http://localhost:3004
echo Database:     PostgreSQL on localhost:5432
echo Cache:        Redis on localhost:6379
echo ============================================
echo.
echo Press any key to close this launcher...
pause >nul
