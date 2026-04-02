@echo off
echo ============================================
echo WhatsApp CRM - Starting Development Servers
echo ============================================
echo.

echo Checking Docker containers...
docker-compose up -d
echo.

echo Detecting Windows Terminal...
where wt >nul 2>nul
if %errorlevel% equ 0 (
    echo ✓ Windows Terminal detected - Opening in tabs...
    wt -w 0 new-tab -d "%CD%\backend" --title "Backend" cmd /k "npm run start:dev" ; new-tab -d "%CD%\frontend" --title "Frontend" cmd /k "npm run dev" ; new-tab -d "%CD%\worker" --title "Worker" cmd /k "npm run start:dev"
    echo.
    echo ============================================
    echo All services started in Windows Terminal tabs!
    echo ============================================
) else (
    echo X Windows Terminal not found - Opening separate windows...
    echo.
    
    echo [1/3] Starting Backend API...
    start "WhatsApp CRM - Backend" cmd /k "cd backend && npm run start:dev"
    
    timeout /t 3 /nobreak > nul
    
    echo [2/3] Starting Worker...
    start "WhatsApp CRM - Worker" cmd /k "cd worker && npm run start:dev"
    
    timeout /t 2 /nobreak > nul
    
    echo [3/3] Starting Frontend...
    start "WhatsApp CRM - Frontend" cmd /k "cd frontend && npm run dev"
    
    echo.
    echo ============================================
    echo All services started in separate windows!
    echo ============================================
)

echo.
echo Backend API:  http://localhost:3000/api
echo Frontend:     http://localhost:3004
echo Database:     PostgreSQL on localhost:5432
echo Cache:        Redis on localhost:6379
echo.
echo Press any key to close this window...
echo ============================================
pause >nul
