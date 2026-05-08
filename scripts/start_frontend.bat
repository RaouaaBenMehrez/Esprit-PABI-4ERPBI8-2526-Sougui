@echo off
echo ============================================
echo   LANCEMENT DU FRONTEND - Sougui Suite
echo ============================================
echo.

:: Calcul du chemin racine du projet (dossier parent de scripts/)
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

:: Aller dans le dossier frontend
cd /d "%ROOT_DIR%\frontend"
echo [INFO] Repertoire : %CD%

echo.
echo [1/2] Installation des dependances npm...
if not exist node_modules (
    npm install
) else (
    echo     [OK] node_modules deja installe
)

echo.
echo [2/2] Demarrage du serveur Vite sur http://localhost:5173
echo.
echo     IMPORTANT : Assurez-vous que le backend tourne sur
echo                 http://127.0.0.1:5000 avant de vous connecter !
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo ============================================
npm run dev
pause
