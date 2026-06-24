param(
  [switch]$Remove,
  [switch]$Status,
  [switch]$Start,
  [switch]$Stop
)

$TaskName = "IMMEIT-Articles-Server"
$ProjectDir = "C:\Users\Moustapha\mes-projets\articles-immeit"
$LogDir = "$env:LOCALAPPDATA\IMMEIT"
$null = New-Item -ItemType Directory -Path $LogDir -Force

$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $NodePath) {
  Write-Error "Node.js introuvable. Installe Node.js d'abord."
  exit 1
}

function Get-TaskStatus {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) { return "ABSENT" }
  $state = $task.State
  $lastRun = $task.LastRunTime
  $lastResult = $task.LastTaskResult
  return "$state (dernier run: $lastRun, code: $lastResult)"
}

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false 2>$null
  Write-Host "OK -- Tache '$TaskName' supprimee." -ForegroundColor Yellow
  exit 0
}

if ($Status) {
  Write-Host "Statut: $(Get-TaskStatus)" -ForegroundColor Cyan
  $log = Get-ChildItem "$LogDir\*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($log) {
    Write-Host "Dernieres lignes du log ($($log.Name)):" -ForegroundColor Cyan
    Get-Content $log.FullName -Tail 5
  }
  exit 0
}

if ($Start) {
  try {
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "OK -- Tache '$TaskName' demarree." -ForegroundColor Green
  } catch { Write-Error "Erreur: $_" }
  exit 0
}

if ($Stop) {
  try {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*server.mjs*" } | Stop-Process -Force
    Write-Host "OK -- Serveur arrete." -ForegroundColor Yellow
  } catch { Write-Error "Erreur: $_" }
  exit 0
}

Write-Host "Installation du service IMMEIT..." -ForegroundColor Cyan

$WrapperPath = "$ProjectDir\scripts\startup.ps1"

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$WrapperPath`"" -WorkingDirectory $ProjectDir

$Trigger = New-ScheduledTaskTrigger -AtLogon -User $env:USERNAME

$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Days 30)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null

Write-Host ""
Write-Host "+---------------------------------------------+" -ForegroundColor Green
Write-Host "|     IMMEIT -- Installation terminee          |" -ForegroundColor Green
Write-Host "+---------------------------------------------+" -ForegroundColor Green
Write-Host "|  Le serveur demarrera automatiquement        |" -ForegroundColor Green
Write-Host "|  a chaque ouverture de session Windows.      |" -ForegroundColor Green
Write-Host "|                                             |" -ForegroundColor Green
Write-Host "|  Commandes :                                |" -ForegroundColor Green
Write-Host "|  .\scripts\install-service.ps1 -Start       |" -ForegroundColor Green
Write-Host "|  .\scripts\install-service.ps1 -Stop        |" -ForegroundColor Green
Write-Host "|  .\scripts\install-service.ps1 -Status      |" -ForegroundColor Green
Write-Host "|  .\scripts\install-service.ps1 -Remove      |" -ForegroundColor Green
Write-Host "+---------------------------------------------+" -ForegroundColor Green
Write-Host ""

try {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "OK -- Serveur demarre ! Ouvre http://localhost:3000" -ForegroundColor Green
} catch {
  Write-Host "ATTENTION: La tache a ete creee mais n'a pas pu demarrer: $_" -ForegroundColor Yellow
}