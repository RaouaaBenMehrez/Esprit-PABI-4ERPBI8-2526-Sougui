@echo off
echo ============================================
echo   LANCEMENT DU BACKEND - Sougui Suite
echo ============================================
echo.

:: Calcul du chemin racine du projet (dossier parent de scripts/)
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

:: Aller dans le dossier backend
cd /d "%ROOT_DIR%\backend"
echo [INFO] Repertoire : %CD%

echo.
echo [1/3] Installation des dependances Python...
pip install flask flask-cors bcrypt python-dotenv pandas numpy scipy scikit-learn joblib google-generativeai openai plotly prophet psycopg2-binary 2>nul

echo.
echo [2/3] Verification de la base de donnees...
if exist sougui_suite.db (
    echo     [OK] sougui_suite.db trouve
) else (
    echo     [INIT] Creation de la base de donnees...
    python init_db.py
)

echo.
echo [3/3] Demarrage du serveur Flask sur http://127.0.0.1:5000
echo.
echo     Routes disponibles :
echo       POST  /api/login
echo       GET   /api/dashboard
echo       GET   /api/sales
echo       GET   /api/clients
echo       GET   /api/products
echo       GET   /api/predict/ca
echo       POST  /api/predict/client
echo       POST  /api/predict/ca-regression
echo       POST  /api/predict/rfm
echo       GET   /api/predict/diagnostic
echo       GET   /api/health
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo ============================================
python server.py
pause
