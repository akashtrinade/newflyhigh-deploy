# FlyHigh 2.0 - One-command local dev startup (Windows PowerShell)
# Usage: .\start-dev.ps1
#   Or:  .\start-dev.ps1 -SkipMongo    (use existing MongoDB/Atlas)
#   Or:  .\start-dev.ps1 -Docker       (use docker-compose)

param(
    [switch]$SkipMongo,
    [switch]$Docker
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Docker) {
    Write-Host "Starting all services via Docker..." -ForegroundColor Cyan
    docker-compose up -d
    Write-Host ""
    Write-Host "Services starting:" -ForegroundColor Green
    Write-Host "  UI:        http://localhost:5173" -ForegroundColor Green
    Write-Host "  Backend:   http://localhost:8081" -ForegroundColor Green
    Write-Host "  Signaling: ws://localhost:5000" -ForegroundColor Green
    Write-Host "  MongoDB:   mongodb://localhost:27017" -ForegroundColor Green
    exit 0
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FlyHigh 2.0 - Local Dev Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# -- Load .env if present --
if (Test-Path "$root\.env") {
    Get-Content "$root\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
    Write-Host "[OK] Loaded .env" -ForegroundColor Gray
}

# -- Check prerequisites --
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Node.js
try {
    $nodeVer = node -v 2>$null
    Write-Host "  Node.js: $nodeVer" -ForegroundColor Gray
} catch {
    Write-Host "  [ERROR] Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Java 21
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if ($javaCmd) {
    $javaVer = & cmd /c "java -version 2>&1" | Select-Object -First 1
    Write-Host "  Java: $javaVer" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] Java not found. Install JDK 21 from https://adoptium.net/" -ForegroundColor Red
    exit 1
}

# -- Terminal 1: Signaling Server --
Write-Host ""
Write-Host "Starting Signaling Server on port 5000..." -ForegroundColor Green
$signalJob = Start-Job -Name "flyhigh-signaling" -ScriptBlock {
    param($root)
    Set-Location "$root\flyhigh-signaling-server"
    node server.js 2>&1 | ForEach-Object { Write-Output "[Signal] $_" }
} -ArgumentList $root

# -- Terminal 2: Backend --
Write-Host "Starting Backend on port 8081..." -ForegroundColor Green
$backendJob = Start-Job -Name "flyhigh-backend" -ScriptBlock {
    param($root)
    Set-Location "$root\flyhigh-backend"
    if ($IsWindows) {
        & .\mvnw.cmd spring-boot:run 2>&1 | ForEach-Object { Write-Output "[Backend] $_" }
    } else {
        & ./mvnw spring-boot:run 2>&1 | ForEach-Object { Write-Output "[Backend] $_" }
    }
} -ArgumentList $root

# -- Terminal 3: Frontend --
Write-Host "Starting Frontend on port 5173..." -ForegroundColor Green
$uiJob = Start-Job -Name "flyhigh-ui" -ScriptBlock {
    param($root)
    Set-Location "$root\flyhigh-ui"
    npm run dev 2>&1 | ForEach-Object { Write-Output "[UI] $_" }
} -ArgumentList $root

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services starting!" -ForegroundColor Green
Write-Host "  UI:        http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend:   http://localhost:8081" -ForegroundColor Green
Write-Host "  Signaling: ws://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "  Run 'Get-Job' to see status" -ForegroundColor Gray
Write-Host "  Run '.\stop-dev.ps1' to stop all" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all services..."

try {
    while ($true) {
        Receive-Job -Name "flyhigh-signaling" -ErrorAction SilentlyContinue | Write-Host -ForegroundColor DarkGray
        Receive-Job -Name "flyhigh-backend" -ErrorAction SilentlyContinue | Write-Host -ForegroundColor DarkGray
        Receive-Job -Name "flyhigh-ui" -ErrorAction SilentlyContinue | Write-Host -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }
} finally {
    Stop-Job -Name "flyhigh-signaling", "flyhigh-backend", "flyhigh-ui" -ErrorAction SilentlyContinue
    Remove-Job -Name "flyhigh-signaling", "flyhigh-backend", "flyhigh-ui" -ErrorAction SilentlyContinue
    Write-Host "All services stopped." -ForegroundColor Yellow
}
