@echo off
echo ============================================
echo   LANCEMENT DU FRONTEND - Sougui Suite
echo ============================================
echo.

:: Aller dans le dossier frontend
cd /d "C:\Users\NSI\Bureau\hackathon\frontend"

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
