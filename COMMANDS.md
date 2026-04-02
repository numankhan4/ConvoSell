# WhatsApp CRM - Quick Command Reference

## 🚀 Starting All Services

### Method 1: PowerShell Script (Best for Windows)
```powershell
./start-dev.ps1
```
**Features:** Full checks, color output, separate windows, verifies services

### Method 2: Batch File (Simple)
```cmd
start-dev.bat
```
**Features:** Quick start in separate windows

### Method 3: npm Command
```bash
npm start
# or
npm run start:windows    # Uses batch file
npm run start:powershell # Uses PowerShell script
```

## 🛑 Stopping Services

```powershell
./stop-dev.ps1
```
Or manually close the terminal windows

## 🐳 Docker Only

```bash
# Start containers
npm run docker:up
docker-compose up -d

# Stop containers  
npm run docker:down
docker-compose down

# View logs
npm run docker:logs
docker-compose logs -f
```

## 📦 Installation

```bash
# Install all dependencies at once
npm run install:all

# Or install individually
cd backend && npm install
cd worker && npm install
cd frontend && npm install
```

## 🔨 Individual Services

```bash
# Backend only
npm run backend
cd backend && npm run start:dev

# Worker only
npm run worker
cd worker && npm run start:dev

# Frontend only
npm run frontend
cd frontend && npm run dev
```

## 🗄️ Database

```bash
# Run migrations
npm run prisma:migrate
cd backend && npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Open database UI
npm run prisma:studio
cd backend && npm run prisma:studio
```

## 🏗️ Build

```bash
# Build all
npm run build:all

# Build individually
cd backend && npm run build
cd worker && npm run build
cd frontend && npm run build
```

## 🧹 Linting

```bash
# Lint all
npm run lint:all

# Lint individually
cd backend && npm run lint
cd frontend && npm run lint
```

## 🌐 Access URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3004 |
| Backend API | http://localhost:3000/api |
| Prisma Studio | http://localhost:5555 |

## 📚 Documentation

- [START.md](START.md) - Detailed startup guide with troubleshooting
- [SETUP.md](SETUP.md) - Initial setup instructions
- [CONFIGURATION.md](CONFIGURATION.md) - WhatsApp & Shopify configuration
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [README.md](README.md) - Project overview

## ⚡ Quick Setup for New Developers

```bash
# 1. Clone
git clone <repository-url>
cd "WhatsApp CRM POC"

# 2. Install
npm run install:all

# 3. Setup environment
# Copy .env.example to .env in backend/, worker/, frontend/

# 4. Initialize database
npm run docker:up
npm run prisma:migrate
npm run prisma:generate

# 5. Start everything
./start-dev.ps1

# 6. Open browser
# http://localhost:3004
```

## 🔧 Common Tasks

```bash
# Fresh start (clean restart)
./stop-dev.ps1
npm run docker:down
npm run docker:up
npm run prisma:migrate
./start-dev.ps1

# Update database schema
cd backend
# Edit prisma/schema.prisma
npm run prisma:migrate
cd ../worker
npm run prisma:generate

# Add new dependencies
cd backend && npm install <package>
cd worker && npm install <package>
cd frontend && npm install <package>

# View running processes
Get-Process node

# Kill all Node processes
Get-Process node | Stop-Process -Force

# Check ports
Test-NetConnection localhost -Port 3000  # Backend
Test-NetConnection localhost -Port 3004  # Frontend
Test-NetConnection localhost -Port 5432  # PostgreSQL
Test-NetConnection localhost -Port 6379  # Redis
```

## 🐛 Troubleshooting

**Port already in use:**
```powershell
Get-Process node | Stop-Process -Force
./start-dev.ps1
```

**Docker not running:**
- Start Docker Desktop
- Wait for it to be ready
- Run `docker ps` to verify

**Database connection failed:**
```bash
npm run docker:down
npm run docker:up
```

**Prisma errors:**
```bash
npm run prisma:generate
```

**Fresh install:**
```bash
rm -rf backend/node_modules worker/node_modules frontend/node_modules
npm run install:all
```

## 📞 Need Help?

See [START.md](START.md) for comprehensive troubleshooting guide.
