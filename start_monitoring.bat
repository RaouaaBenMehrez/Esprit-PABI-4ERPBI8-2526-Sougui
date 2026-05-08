@echo off
chcp 65001 >nul
title Sougui BI — Monitoring Stack Launcher

echo.
echo ============================================================
echo   SOUGUI BI — Lancement du Stack de Monitoring MLOps
echo   Prometheus + Grafana + Flask Metrics
echo ============================================================
echo.

:: ─── Vérification Docker ─────────────────────────────────────────────────────
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Docker n'est pas installe ou n'est pas dans le PATH.
    echo Telechargez Docker Desktop sur : https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

echo [OK] Docker detecte.

:: ─── Vérification que le backend Flask tourne ────────────────────────────────
echo [INFO] Verification du backend Flask sur http://localhost:5000/api/health ...
curl -s -o nul -w "%%{http_code}" http://localhost:5000/api/health > temp_status.txt 2>&1
set /p STATUS=<temp_status.txt
del temp_status.txt

if "%STATUS%"=="200" (
    echo [OK] Backend Flask operationnel.
) else (
    echo [WARN] Backend Flask non detecte sur port 5000.
    echo        Lancez d'abord : cd backend ^&^& python server.py
    echo.
    choice /C YN /M "Continuer quand meme (Prometheus ne pourra pas scraper)"
    if %ERRORLEVEL% EQU 2 exit /b 0
)

:: ─── Lancement du stack Prometheus + Grafana ─────────────────────────────────
echo.
echo [INFO] Demarrage de Prometheus + Grafana via Docker...
echo.

cd /d "%~dp0"
docker compose -f docker-compose-monitoring.yml up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERREUR] Echec du lancement Docker. Verifiez :
    echo   1. Docker Desktop est bien demarre
    echo   2. Les ports 9090 et 3001 sont libres
    echo.
    pause
    exit /b 1
)

:: ─── Attente que les services soient prêts ───────────────────────────────────
echo.
echo [INFO] Attente du demarrage des services (30 secondes)...
timeout /t 30 /nobreak >nul

:: ─── Affichage des URLs ───────────────────────────────────────────────────────
echo.
echo ============================================================
echo   MONITORING OPERATIONNEL !
echo ============================================================
echo.
echo   Backend Flask    : http://localhost:5000
echo   Metriques        : http://localhost:5000/metrics
echo   Prometheus       : http://localhost:9090
echo   Grafana          : http://localhost:3001
echo     Login          : admin / sougui2024
echo   MLflow           : http://localhost:5001
echo.
echo ============================================================
echo   SCENARIOS DE SIMULATION :
echo ============================================================
echo.
echo   [1] Simuler une DERIVE des donnees
echo   [2] Simuler une CHUTE d'ACCURACY XGBoost
echo   [3] Simuler un PIC de TRAFIC (50 requetes)
echo   [4] Simuler des ERREURS API (code 500)
echo   [5] RESET - retour aux valeurs normales
echo   [6] Ouvrir Grafana dans le navigateur
echo   [7] Quitter
echo.

:menu
set /p CHOIX="Votre choix (1-7) : "

if "%CHOIX%"=="1" (
    echo [SIM] Injection DERIVE...
    curl -s -X POST http://localhost:5000/api/simulate/drift -H "Content-Type: application/json" -d "{\"scenario\":\"drift\"}"
    echo.
    goto menu
)
if "%CHOIX%"=="2" (
    echo [SIM] Injection CHUTE ACCURACY...
    curl -s -X POST http://localhost:5000/api/simulate/drift -H "Content-Type: application/json" -d "{\"scenario\":\"accuracy_drop\"}"
    echo.
    goto menu
)
if "%CHOIX%"=="3" (
    echo [SIM] Lancement PIC DE TRAFIC (50 predictions)...
    curl -s -X POST http://localhost:5000/api/simulate/high-traffic -H "Content-Type: application/json" -d "{}"
    echo.
    goto menu
)
if "%CHOIX%"=="4" (
    echo [SIM] Injection ERREUR 500...
    curl -s -X POST http://localhost:5000/api/simulate/api-errors -H "Content-Type: application/json" -d "{}"
    echo.
    goto menu
)
if "%CHOIX%"=="5" (
    echo [SIM] RESET des metriques...
    curl -s -X POST http://localhost:5000/api/simulate/drift -H "Content-Type: application/json" -d "{\"scenario\":\"reset\"}"
    echo.
    goto menu
)
if "%CHOIX%"=="6" (
    start http://localhost:3001
    goto menu
)
if "%CHOIX%"=="7" (
    echo.
    echo [INFO] Arret des services monitoring...
    docker compose -f docker-compose-monitoring.yml down
    echo [OK] Services arretes.
    pause
    exit /b 0
)

goto menu
