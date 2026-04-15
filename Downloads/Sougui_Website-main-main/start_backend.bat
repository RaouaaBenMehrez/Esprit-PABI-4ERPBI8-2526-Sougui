@echo off
echo ============================================
echo   LANCEMENT DU BACKEND - Sougui Suite
echo ============================================
echo.

:: Aller dans le dossier backend
cd /d "C:\Users\NSI\Bureau\hackathon\backend"
echo [1/3] Installation des dependances Python...
pip install flask flask-cors bcrypt python-dotenv pandas numpy scipy scikit-learn joblib google-generativeai openai plotly prophet 2>nul

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
echo       GET   /api/models/list
echo       POST  /api/models/predict/*
echo       POST  /api/agent/chat
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo ============================================
python server.py
pause
