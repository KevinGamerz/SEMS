@echo off
echo =========================================
echo [SEMS] Sustainable Energy Monitoring System
echo =========================================
echo.

echo [SEMS] Step 1: Installing Server Dependencies...
cd server
call npm install
if %ERRORLEVEL% neq 0 goto :error

echo.
echo [SEMS] Step 2: Installing Client Dependencies...
cd ../client
call npm install
if %ERRORLEVEL% neq 0 goto :error

echo.
echo [SEMS] Step 3: Compiling Production UI Build...
call npm run build
if %ERRORLEVEL% neq 0 goto :error

echo.
echo [SEMS] Step 4: Starting Production Server...
cd ../server
echo [SEMS] Server will be available at http://localhost:3001
echo.
call npm start

goto :EOF

:error
echo.
echo [ERROR] An error occurred during the build process.
pause
