@echo off
echo ====================================
echo WhatsApp CRM - Development Setup
echo ====================================
echo.

echo [1/5] Checking prerequisites...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 20+
    exit /b 1
)

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker not found. Please install Docker Desktop
    exit /b 1
)

echo [2/5] Starting infrastructure...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker containers
    exit /b 1
)

echo [3/5] Installing dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    exit /b 1
)
cd ..

cd worker
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install worker dependencies
    exit /b 1
)
cd ..

cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    exit /b 1
)
cd ..

echo [4/5] Setting up environment files...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo Created backend\.env - Please configure your API keys
)

if not exist worker\.env (
    copy worker\.env.example worker\.env
    echo Created worker\.env
)

if not exist frontend\.env.local (
    copy frontend\.env.local.example frontend\.env.local
    echo Created frontend\.env.local
)

echo [5/5] Running database migrations...
cd backend
call npx prisma generate
call npx prisma migrate dev --name init
cd ..

echo.
echo ====================================
echo Setup complete!
echo ====================================
echo.
echo Next steps:
echo 1. Configure API keys in backend\.env
echo 2. Start the services:
echo    - Backend: cd backend ^&^& npm run start:dev
echo    - Worker: cd worker ^&^& npm run start:dev
echo    - Frontend: cd frontend ^&^& npm run dev
echo.
echo Access the app at: http://localhost:3001
echo ====================================

pause
