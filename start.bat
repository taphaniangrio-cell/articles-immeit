@echo off
title IMMEIT - Generateur d'articles
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║     IMMEIT — Generateur d'articles   ║
echo  ╠══════════════════════════════════════╣
echo  ║  Demarrage du serveur...             ║
echo  ╚══════════════════════════════════════╝
echo.

:: Notifie Windows
powershell -Command "$null = New-Item -Path \"$env:LOCALAPPDATA\IMMEIT\" -ItemType Directory -Force; $null = New-Item -Path \"$env:LOCALAPPDATA\IMMEIT\server.stop\" -Force -ErrorAction SilentlyContinue"

:: Ouvre le navigateur apres 2 secondes
start /B "" cmd /c timeout /t 2 /nobreak ^>nul ^&^& start http://localhost:3000

:: Lance le serveur
node server.mjs

:: Si le serveur s'arrete
echo.
echo  ╔══════════════════════════════════════╗
echo  ║  Le serveur s'est arrete.            ║
echo  ║  Appuie sur une touche pour fermer.  ║
echo  ╚══════════════════════════════════════╝
echo.
pause
