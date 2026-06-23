$projectDir = "C:\Users\Moustapha\mes-projets\articles-immeit"
$logFile = "$env:TEMP\immeit-server.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

"[$timestamp] Démarrage du serveur IMMEIT..." | Out-File $logFile -Append

try {
  $node = Get-Command node -ErrorAction Stop
  $process = Start-Process -FilePath $node.Source -ArgumentList "server.mjs" -WorkingDirectory $projectDir -NoNewWindow -PassThru -RedirectStandardOutput "$env:TEMP\immeit-server-out.log" -RedirectStandardError "$env:TEMP\immeit-server-err.log"
  "[$timestamp] Serveur démarré (PID: $($process.Id))" | Out-File $logFile -Append
} catch {
  "[$timestamp] ERREUR: $_" | Out-File $logFile -Append
}
