param(
  [int]$MaxRestarts = 0
)

$ProjectDir = "C:\Users\Moustapha\mes-projets\articles-immeit"
$LogDir = "$env:LOCALAPPDATA\IMMEIT"
$null = New-Item -ItemType Directory -Path $LogDir -Force

$LogFile = "$LogDir\server-$(Get-Date -Format 'yyyy-MM-dd').log"
$PidFile = "$LogDir\server.pid"
$PortFile = "$LogDir\server.port"

function Write-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "$timestamp | $Message" | Out-File $LogFile -Append -Encoding UTF8
}

Write-Log "=== Demarrage du service IMMEIT ==="
Write-Log "Node: $(node --version)"
Write-Log "Repertoire: $ProjectDir"

$restartCount = 0

while ($true) {
  $restartCount++
  Write-Log "Demarrage du serveur (tentative #$restartCount)..."

  $process = Start-Process -FilePath "node" -ArgumentList "server.mjs" -WorkingDirectory $ProjectDir -NoNewWindow -PassThru -RedirectStandardOutput "$LogDir\server-out.log" -RedirectStandardError "$LogDir\server-err.log"

  $pid = $process.Id
  Write-Log "PID: $pid"

  $pid | Out-File $PidFile -Force

  $process.WaitForExit()

  $exitCode = $process.ExitCode
  Write-Log "Processus termine (code: $exitCode)"

  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue

  $stopFile = "$LogDir\server.stop"
  if (Test-Path $stopFile) {
    Remove-Item $stopFile -Force -ErrorAction SilentlyContinue
    Write-Log "Arret demande. Sortie."
    break
  }

  if ($MaxRestarts -gt 0 -and $restartCount -ge $MaxRestarts) {
    Write-Log "Nombre maximal de redemarrages atteint ($MaxRestarts). Sortie."
    break
  }

  Start-Sleep -Seconds 2
  Write-Log "Redemarrage dans 2s..."
}

Write-Log "=== Service arrete ==="