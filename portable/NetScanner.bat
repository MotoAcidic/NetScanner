@echo off
setlocal enabledelayedexpansion

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Set PATH to use bundled Node.js
set PATH=%SCRIPT_DIR%nodejs;%PATH%

echo NetScanner Portable Launcher
echo ============================
echo.

REM Verify Node.js is present
if not exist "nodejs\node.exe" (
    echo [ERROR] nodejs\node.exe not found
    echo This folder is incomplete. Make sure all files are present.
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Check if Python is available
python --version
if errorlevel 1 (
    echo.
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    echo During installation, CHECK "Add Python to PATH"
    pause
    exit /b 1
)
echo [OK] Python found
echo.

REM Install Python dependencies if needed
echo Checking Python dependencies...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies (one-time setup, may take 2 minutes)...
    pip install -q -r requirements.txt
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies
        echo Try running CMD as Administrator and re-run this file
        pause
        exit /b 1
    )
)
echo [OK] Dependencies ready
echo.

REM Start NetScanner
echo Starting NetScanner...
echo.
echo Servers starting on:
echo   Backend: http://localhost:5000
echo   Frontend: http://localhost:3000
echo.
timeout /t 2 /nobreak
echo Browser will open automatically...
echo Press Ctrl+C to stop
echo.

python -u main.py
if errorlevel 1 (
    echo.
    echo [ERROR] NetScanner failed to start
    echo Check the output above for details
)

pause
