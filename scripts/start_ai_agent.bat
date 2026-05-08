@echo off
echo ============================================
echo   LANCEMENT AI AGENT API (FastAPI)
echo   ai-agent/ - Port 8000
echo ============================================
echo.

:: Calcul du chemin racine du projet (dossier parent de scripts/)
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

cd /d "%ROOT_DIR%\ai-agent"
echo [INFO] Repertoire : %CD%

echo.
echo [1/2] Installation des dependances...
pip install fastapi uvicorn chromadb google-generativeai pydantic python-dotenv numpy langgraph langchain-core 2>nul

echo.
echo [2/2] Demarrage de l'API FastAPI sur http://127.0.0.1:8000
echo.
echo     Swagger UI : http://127.0.0.1:8000/docs
echo.
echo Appuyez sur Ctrl+C pour arreter
echo ============================================
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
