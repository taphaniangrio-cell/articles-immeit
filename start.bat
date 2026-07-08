@echo off
title IMMEIT Hub — Serveur Local
cd /d "%~dp0"

echo.
echo  ^>^>^> IMMEIT Hub — Lancement du serveur local
echo.

:: Tuer les anciens processus node sur le port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
  if %%a neq 0 (
    taskkill /f /pid %%a >nul 2>&1
  )
)
timeout /t 1 /nobreak >nul

:: Lancer le serveur
node server.mjs

:: Si le serveur s'arrête
echo.
echo  [INFO] Le serveur s'est arrete.
echo.
pause
