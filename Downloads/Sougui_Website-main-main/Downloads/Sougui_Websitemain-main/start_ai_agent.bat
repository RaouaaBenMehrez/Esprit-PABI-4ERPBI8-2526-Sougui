@echo off
echo ============================================
echo   LANCEMENT AI AGENT API (FastAPI)
echo   Sales-Agent-API - Port 8000
echo ============================================
echo.

cd /d "C:\Users\NSI\Downloads\Hachathon_LunarHack-main-main\Hachathon_LunarHack-main-main\Sales-Agent-API-main\Sales-Agent-API-main"

echo [1/2] Installation des dependances...
pip install fastapi uvicorn chromadb google-generativeai pydantic python-dotenv numpy langgraph langchain-core

echo.
echo [2/2] Demarrage de l'API FastAPI sur http://127.0.0.1:8000
echo.
echo     Swagger UI : http://127.0.0.1:8000/docs
echo.
echo Appuyez sur Ctrl+C pour arreter
echo ============================================
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
