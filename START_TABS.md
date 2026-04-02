# Starting Services - Tab Options

## 🎯 Choose Your Preferred Method

### Option 1: Windows Terminal (Tabs) - **RECOMMENDED** ✨
```bash
npm run start:windows
```
**What happens:**
- ✅ Automatically detects Windows Terminal
- ✅ Opens 3 tabs in the SAME window (Backend, Frontend, Worker)
- ✅ Falls back to separate windows if Windows Terminal not installed

---

### Option 2: PowerShell Background Jobs (Single Window)
```bash
npm run start:tabs
```
**What happens:**
- ✅ Runs all 3 services in the SAME PowerShell window
- ✅ All logs in one place
- ✅ View individual logs: `Receive-Job -Name Backend -Keep`
- ✅ Stop all: `Ctrl+C` or `Get-Job | Stop-Job`

---

### Option 3: Separate Windows (Old Way)
If `npm run start:windows` doesn't detect Windows Terminal, it automatically falls back to opening 3 separate windows.

---

## 📝 How Each Works

### Windows Terminal (Tabs)
```
Docker starts → 3 tabs open in same window
Tab 1: Backend (port 3000)
Tab 2: Frontend (port 3004)  
Tab 3: Worker (background jobs)
```

### PowerShell Jobs (Single Window)
```
Docker starts → 3 background jobs in current window
View logs: Receive-Job -Name Backend -Keep
Stop all: Ctrl+C or Get-Job | Stop-Job
```

---

## 🔧 Install Windows Terminal (Optional)

If you want tabs, install Windows Terminal:
```bash
winget install Microsoft.WindowsTerminal
```
Or download from: https://aka.ms/terminal

After installing, `npm run start:windows` will automatically use tabs!

---

## 🚀 Quick Commands

| Command | What It Does |
|---------|-------------|
| `npm run start:windows` | Auto-detect: Tabs if available, else windows |
| `npm run start:tabs` | Single window with background jobs |
| `npm run start` | Cross-platform Node.js (opens windows) |
| `npm run stop` | Stop all services |

---

## 💡 Recommended Setup

1. **Install Windows Terminal** (one-time):
   ```bash
   winget install Microsoft.WindowsTerminal
   ```

2. **Always use**:
   ```bash
   npm run start:windows
   ```

3. **Enjoy** → All services in one window with tabs! 🎉

---

## 📊 View Logs (For start:tabs)

```powershell
# View backend logs
Receive-Job -Name Backend -Keep

# View frontend logs
Receive-Job -Name Frontend -Keep

# View worker logs
Receive-Job -Name Worker -Keep

# View all logs
Get-Job | Receive-Job -Keep
```

## 🛑 Stop Services

**For start:tabs:**
```powershell
# Option 1: Press Ctrl+C in the terminal

# Option 2: Stop all jobs manually
Get-Job | Stop-Job
Get-Job | Remove-Job
```

**For start:windows (with tabs/windows):**
- Close the tabs/windows
- Or run: `npm run stop`
