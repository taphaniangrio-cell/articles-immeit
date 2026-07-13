@echo off
echo.
echo ============================================
echo   IMMEIT Hub — Renommage du dossier
echo ============================================
echo.

cd C:\Users\Moustapha\mes-projets

echo Fermeture du serveur...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Renommage de articles-immeit en immeit-hub...
if exist "C:\Users\Moustapha\mes-projets\immeit-hub" (
    echo Le dossier immeit-hub existe deja.
) else (
    ren "articles-immeit" "immeit-hub"
    if errorlevel 1 (
        echo ERREUR: Impossible de renommer. Fermez tous les programmes utilisant le dossier.
        pause
        exit /b 1
    )
)

echo Mise a jour du raccourci de demarrage...
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "C:\Users\Moustapha\mes-projets\immeit-hub"
echo WshShell.Run "node server.mjs", 0, False
) > "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\IMMEIT-Server.vbs"

echo Demarrage du serveur...
cd "C:\Users\Moustapha\mes-projets\immeit-hub"
start /min node server.mjs

echo.
echo ============================================
echo   C'est fait ! Ouvre http://localhost:3000
echo ============================================
echo.
pause
