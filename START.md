# Quick Start Guide

This guide explains the different ways to start all services in the WhatsApp CRM project.

## Prerequisites

Before starting, ensure you have:
- ✅ Node.js (v18+) installed
- ✅ npm (v9+) installed
- ✅ Docker Desktop installed and running
- ✅ PostgreSQL (via Docker)
- ✅ Redis (via Docker)

## Installation

First time setup - install all dependencies:
```bash
npm run install:all
```

Or install individually:
```bash
cd backend && npm install
cd worker && npm install
cd frontend && npm install
```

## Starting All Services

### Option 1: PowerShell Script (Recommended for Windows)
The most robust option with error checking and status verification:

```powershell
./start-dev.ps1
```

**Features:**
- ✓ Checks prerequisites (Node.js, npm, Docker)
- ✓ Verifies Docker is running
- ✓ Starts Docker containers (PostgreSQL + Redis)
- ✓ Checks port availability
- ✓ Starts all services in separate windows
- ✓ Verifies services are running
- ✓ Color-coded output

### Option 2: Batch File (Simple)
Quick start without advanced checks:

```cmd
start-dev.bat
```

### Option 3: npm Command
Run from the root directory:

```bash
npm run start:windows
```

Or using PowerShell:
```bash
npm run start:powershell
```

### Option 4: Node.js Script
Cross-platform solution (all services in one terminal):

```bash
npm start
```

**Note:** This runs all services in a single terminal. Press Ctrl+C to stop everything.

## Services Started

When you run any of the start commands, the following services will launch:

| Service | URL | Port | Description |
|---------|-----|------|-------------|
| **Frontend** | http://localhost:3004 | 3004 | Next.js user interface |
| **Backend API** | http://localhost:3000/api | 3000 | NestJS REST API |
| **Worker** | - | - | BullMQ background jobs |
| **PostgreSQL** | localhost:5432 | 5432 | Database |
| **Redis** | localhost:6379 | 6379 | Cache & Queue |

## Stopping Services

### PowerShell Stop Script
```powershell
./stop-dev.ps1
```

This will:
- Stop all Node.js processes
- Optionally stop Docker containers

### Manual Stop
- Close the individual terminal windows for each service
- Or press Ctrl+C in each terminal

### Stop Docker Only
```bash
npm run docker:down
```

## Individual Service Commands

If you prefer to start services individually:

### Start Docker Containers Only
```bash
npm run docker:up
# or
docker-compose up -d
```

### Start Backend Only
```bash
npm run backend
# or
cd backend && npm run start:dev
```

### Start Worker Only
```bash
npm run worker
# or
cd worker && npm run start:dev
```

### Start Frontend Only
```bash
npm run frontend
# or
cd frontend && npm run dev
```

## Database Commands

### Run Migrations
```bash
npm run prisma:migrate
```

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Open Prisma Studio
```bash
npm run prisma:studio
```

## Build Commands

### Build All Services
```bash
npm run build:all
```

### Build Individual Services
```bash
cd backend && npm run build
cd worker && npm run build
cd frontend && npm run build
```

## Troubleshooting

### Port Already in Use
If you see "port already in use" errors:

1. **Using PowerShell script:** It will ask if you want to kill existing processes
2. **Manual fix:**
   ```powershell
   # Kill all Node.js processes
   Get-Process -Name node | Stop-Process -Force
   ```

### Docker Not Running
```powershell
# Check Docker status
docker ps

# If not running, start Docker Desktop and wait for it to be ready
```

### Database Connection Issues
```bash
# Check if PostgreSQL container is running
docker ps | findstr postgres

# Restart Docker containers
npm run docker:down
npm run docker:up
```

### Redis Connection Issues
```bash
# Check if Redis container is running
docker ps | findstr redis

# View Redis logs
docker logs whatsapp-crm-redis
```

### Service Won't Start
1. Check if ports are available (3000, 3004, 5432, 6379)
2. Ensure Docker containers are running
3. Check individual service logs in their terminal windows
4. Try stopping all services and starting again:
   ```powershell
   ./stop-dev.ps1
   ./start-dev.ps1
   ```

## Environment Variables

Make sure you have `.env` files in the correct locations:

- `backend/.env` - Backend configuration
- `frontend/.env.local` - Frontend configuration
- `worker/.env` - Worker configuration

See `SETUP.md` for detailed environment configuration.

## First Time Setup

If this is your first time running the project:

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Start Docker containers:
   ```bash
   npm run docker:up
   ```

3. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

4. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

5. Start all services:
   ```powershell
   ./start-dev.ps1
   ```

6. Access the application at http://localhost:3004

## Quick Reference

```bash
# Install everything
npm run install:all

# Start everything (PowerShell)
./start-dev.ps1

# Start everything (Batch)
start-dev.bat

# Stop everything
./stop-dev.ps1

# Docker only
npm run docker:up
npm run docker:down

# Database
npm run prisma:migrate
npm run prisma:studio
```

## Additional Commands

View Docker logs:
```bash
npm run docker:logs
# or
docker-compose logs -f
```

Lint all code:
```bash
npm run lint:all
```

## Need Help?

- Check `README.md` for project overview
- Check `SETUP.md` for detailed setup instructions
- Check `CONFIGURATION.md` for WhatsApp/Shopify setup
- Check individual service README files in `backend/`, `worker/`, `frontend/`
