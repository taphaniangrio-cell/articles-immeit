@echo off
echo.
echo ============================================
echo   IMMEIT Hub — Renommage + Redemarrage
echo ============================================
echo.

cd C:\Users\Moustapha\mes-projets

echo [1/5] Fermeture du serveur...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/5] Suppression de la copie immeit-hub ( incorrecte )...
if exist "C:\Users\Moustapha\mes-projets\immeit-hub" (
    rmdir /S /Q "C:\Users\Moustapha\mes-projets\immeit-hub"
    echo       Copie supprimee.
) else (
    echo       Pas de copie a supprimer.
)

echo [3/5] Renommage de articles-immeit en immeit-hub...
ren "articles-immeit" "immeit-hub"
if errorlevel 1 (
    echo ERREUR: Impossible de renommer. Fermez tous les programmes utilisant le dossier.
    pause
    exit /b 1
)
echo       Renommage OK.

echo [4/5] Mise a jour du raccourci de demarrage...
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "C:\Users\Moustapha\mes-projets\immeit-hub"
echo WshShell.Run "node server.mjs", 0, False
) > "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\IMMEIT-Server.vbs"
echo       Raccourci OK.

echo [5/5] Demarrage du serveur...
cd "C:\Users\Moustapha\mes-projets\immeit-hub"
start /min node server.mjs
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   Termine ! Ouvre http://localhost:3000
echo   Dossier : C:\Users\Moustapha\mes-projets\immeit-hub
echo ============================================
echo.
pause
