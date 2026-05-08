@echo off
echo.
echo ============================================
echo   REDEMARRAGE BACKEND - Sougui BI Suite
echo   Nouvelles routes: /api/face/enroll
echo                     /api/login/face
echo ============================================
echo.
cd /d "%~dp0"
python server.py
pause
