@echo off
echo ========================================================
echo        CivicSync (SIHPS26043) Multi-Service Launcher
echo ========================================================
echo.

echo [1/3] Starting Python AI Microservice on port 8000...
start "CivicSync AI Service" cmd /k "cd ai && uvicorn app.main:app --reload --port 8000"

echo [2/3] Starting Node.js Backend API on port 5000...
start "CivicSync Backend API" cmd /k "cd backend && npm run dev"

echo [3/3] Starting React Vite Frontend Client...
start "CivicSync Frontend UI" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo All 3 services are launching in separate windows!
echo - AI Microservice: http://localhost:8000
echo - Backend API:     http://localhost:5000
echo - Frontend UI:      http://localhost:5173
echo ========================================================
pause
