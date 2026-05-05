@echo off
title SEMS - Starting Servers...
echo ========================================
echo   SEMS - Sustainable Energy Monitoring
echo ========================================
echo.
echo Starting backend server...
cd /d "C:\Users\Admin\.gemini\antigravity\scratch\sems\server"
start "SEMS Backend" cmd /k "node src/index.js"
echo Backend starting on http://localhost:3001
echo.
timeout /t 3 /nobreak >nul
echo Starting frontend server...
cd /d "C:\Users\Admin\.gemini\antigravity\scratch\sems\client"
start "SEMS Frontend" cmd /k "npm run dev"
echo Frontend starting on http://localhost:5173
echo.
timeout /t 5 /nobreak >nul
echo ========================================
echo   Both servers should be running now!
echo   Open http://localhost:5173 in browser
echo ========================================
echo.
echo Login: admin@sems.gov / Admin@12345
echo.
start http://localhost:5173/login
pause
