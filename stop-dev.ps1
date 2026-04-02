#!/usr/bin/env pwsh
# WhatsApp CRM - Stop Development Environment
# This script stops all running services

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "WhatsApp CRM - Stopping Services" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Stop Node.js processes
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "✓ Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
} else {
    Write-Host "✓ No Node.js processes found" -ForegroundColor Green
}
Write-Host ""

# Stop Docker containers
Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
$response = Read-Host "Do you want to stop Docker containers (PostgreSQL + Redis)? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    docker-compose down
    Write-Host "✓ Docker containers stopped" -ForegroundColor Green
} else {
    Write-Host "✓ Docker containers left running" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "All services stopped!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2
