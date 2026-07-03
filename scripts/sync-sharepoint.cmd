@echo off
echo =============================================
echo   IMMEIT — Synchro SharePoint Automatique
echo =============================================
echo.
echo Ce script va synchroniser les donnees de l'onglet
echo "Suivi Demandes 2026" depuis SharePoint.
echo.
echo Une fenetre de votre navigateur va s'ouvrir pour
echo vous connecter a votre compte Microsoft 365.
echo.
pause

node "%~dp0sync-sharepoint.mjs"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERREUR] La synchronisation a echoue.
    pause
    exit /b 1
)

echo.
echo [SUCCES] Donnees synchronisees !
pause
