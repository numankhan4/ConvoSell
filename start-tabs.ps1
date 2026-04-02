# WhatsApp CRM Development Starter (PowerShell with Tabs)
# Opens all services in the current PowerShell window as background jobs

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "WhatsApp CRM - Starting Development Servers" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Start Docker containers
Write-Host "🐳 Starting Docker containers..." -ForegroundColor Yellow
docker-compose up -d
Write-Host ""

# Function to run service in background
function Start-Service {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command
    )
    
    $job = Start-Job -Name $Name -ScriptBlock {
        param($p, $c)
        Set-Location $p
        Invoke-Expression $c
    } -ArgumentList $Path, $Command
    
    Write-Host "✓ Started $Name (Job ID: $($job.Id))" -ForegroundColor Green
    return $job
}

# Start all services
Write-Host "📦 Starting services...`n" -ForegroundColor Yellow

$backendJob = Start-Service -Name "Backend" -Path "$PSScriptRoot\backend" -Command "npm run start:dev"
Start-Sleep -Seconds 2

$frontendJob = Start-Service -Name "Frontend" -Path "$PSScriptRoot\frontend" -Command "npm run dev"
Start-Sleep -Seconds 1

$workerJob = Start-Service -Name "Worker" -Path "$PSScriptRoot\worker" -Command "npm run start:dev"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "✨ All services started as background jobs!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "🌐 Service URLs:" -ForegroundColor Yellow
Write-Host "   Backend API:  http://localhost:3000/api" -ForegroundColor White
Write-Host "   Frontend:     http://localhost:3004" -ForegroundColor White
Write-Host "   Database:     PostgreSQL on localhost:5432" -ForegroundColor White
Write-Host "   Cache:        Redis on localhost:6379`n" -ForegroundColor White

Write-Host "📊 View logs:" -ForegroundColor Yellow
Write-Host "   Receive-Job -Name Backend -Keep" -ForegroundColor Cyan
Write-Host "   Receive-Job -Name Frontend -Keep" -ForegroundColor Cyan
Write-Host "   Receive-Job -Name Worker -Keep`n" -ForegroundColor Cyan

Write-Host "🛑 Stop all services:" -ForegroundColor Yellow
Write-Host "   Get-Job | Stop-Job; Get-Job | Remove-Job`n" -ForegroundColor Cyan

Write-Host "Press Ctrl+C to stop all services...`n" -ForegroundColor Red

# Keep script running and monitor jobs
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if any job has failed
        $failedJobs = Get-Job | Where-Object { $_.State -eq 'Failed' }
        if ($failedJobs) {
            Write-Host "`n⚠️  Some services have failed:" -ForegroundColor Red
            foreach ($job in $failedJobs) {
                Write-Host "   ❌ $($job.Name)" -ForegroundColor Red
                Receive-Job -Job $job
            }
            break
        }
    }
} finally {
    Write-Host "`n🛑 Stopping all services..." -ForegroundColor Yellow
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    Write-Host "✓ All services stopped." -ForegroundColor Green
}
