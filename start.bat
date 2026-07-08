@echo off
title IMMEIT Hub — Serveur Local
cd /d "%~dp0"

echo.
echo  ^>^>^> IMMEIT Hub — Demarrage du serveur local
echo.

:: Verifier que node est installe
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Node.js n'est pas installe. Telecharge-le depuis https://nodejs.org
    pause
    exit /b 1
)

:: Installer les dependances si besoin
if not exist "node_modules\" (
    echo [INFO] Installation des dependances...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERREUR] npm install a echoue
        pause
        exit /b 1
    )
)

:: Creer .env si besoin
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo [INFO] Fichier .env cree — configure tes cles API
)

:: Lancer le serveur (le navigateur s'ouvre automatiquement)
echo [INFO] Demarrage du serveur...
node server.mjs

pause
