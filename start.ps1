#!/usr/bin/env pwsh
param(
    [string]$Port = "3000",
    [switch]$NoBrowser
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ServerScript = Join-Path $ProjectRoot "server.mjs"
$LogFile = Join-Path $env:TEMP "immeit-server.log"

Write-Host ""
Write-Host " >>> IMMEIT Hub — Démarrage du serveur local" -ForegroundColor Cyan
Write-Host ""

# Check node
$nodeVer = node --version 2>$null
if (-not $nodeVer) {
    Write-Host "[ERREUR] Node.js n'est pas installé." -ForegroundColor Red
    pause
    exit 1
}

# Check/install deps
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Host "[INFO] Installation des dépendances..."
    Push-Location $ProjectRoot
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERREUR] npm install a échoué" -ForegroundColor Red
        pause
        exit 1
    }
    Pop-Location
}

# Create .env if needed
if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
    Copy-Item (Join-Path $ProjectRoot ".env.example") (Join-Path $ProjectRoot ".env")
    Write-Host "[INFO] Fichier .env créé — configure tes clés API" -ForegroundColor Yellow
}

# Kill existing process on port
$existing = netstat -ano | findstr ":$Port "
if ($existing) {
    $oldPid = ($existing.Trim() -split '\s+')[-1]
    Write-Host "[INFO] Ancien processus sur le port $Port (PID $oldPid) — arrêt..."
    try { Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue } catch {}
    Start-Sleep -Seconds 1
}

# Start server in background
Write-Host "[INFO] Démarrage du serveur..."
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "node"
$psi.Arguments = "server.mjs"
$psi.WorkingDirectory = $ProjectRoot
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true
$psi.EnvironmentVariables["PORT"] = $Port
$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi
$process.Start() | Out-Null

# Wait for server to be ready (up to 20 seconds)
Write-Host "[INFO] Attente du démarrage..." -NoNewline
$ready = $false
for ($i = 1; $i -le 20; $i++) {
    Start-Sleep -Seconds 1
    Write-Host "." -NoNewline
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
}
Write-Host ""

if (-not $ready) {
    Write-Host ""
    Write-Host "[ERREUR] Le serveur n'a pas démarré après 20 secondes." -ForegroundColor Red
    Write-Host "        Voir les logs dans le fichier : $LogFile" -ForegroundColor Red
    try { $process.Kill() } catch {}
    pause
    exit 1
}

Write-Host "[OK] Serveur prêt !" -ForegroundColor Green

if (-not $NoBrowser) {
    Start-Process "http://localhost:$Port"
}

Write-Host ""
Write-Host " ================================================" -ForegroundColor Cyan
Write-Host "   IMMEIT Hub est en cours d'exécution" -ForegroundColor White
Write-Host "   App   : http://localhost:$Port" -ForegroundColor White
Write-Host "   Arrêt : ferme cette fenêtre ou Ctrl+C" -ForegroundColor White
Write-Host " ================================================" -ForegroundColor Cyan
Write-Host ""

# Wait for process to exit
try {
    $process.WaitForExit()
} catch {}
