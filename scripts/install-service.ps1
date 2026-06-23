param(
  [switch]$Remove
)

$TaskName = "IMMEIT-Articles-Server"
$ProjectDir = "C:\Users\Moustapha\mes-projets\articles-immeit"
$NodePath = (Get-Command node).Source

if (-not $NodePath) {
  Write-Error "Node.js introuvable. Installe Node.js d'abord."
  exit 1
}

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false 2>$null
  Write-Host "Tâche '$TaskName' supprimée." -ForegroundColor Yellow
  exit 0
}

$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "server.mjs" -WorkingDirectory $ProjectDir

$Trigger = New-ScheduledTaskTrigger -AtStartup

$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force

Write-Host "OK — Tâche '$TaskName' créée." -ForegroundColor Green
Write-Host "Le serveur IMMEIT démarrera automatiquement à chaque démarrage de Windows." -ForegroundColor Green
Write-Host ""
Write-Host "Pour tester maintenant : Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Pour supprimer : .\install-service.ps1 -Remove"
