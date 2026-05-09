@echo off
REM Diagnostic script to test NetScanner setup

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo NetScanner Setup Diagnostic
echo ==========================
echo.

REM Test 1: Check Node.js
echo [TEST 1] Checking Node.js...
if exist "nodejs\node.exe" (
    echo   [OK] node.exe found
    "nodejs\node.exe" --version
) else (
    echo   [FAIL] nodejs\node.exe not found
    goto error
)
echo.

REM Test 2: Check Python
echo [TEST 2] Checking Python...
python --version
if errorlevel 1 (
    echo   [FAIL] Python not found or not working
    goto error
)
echo   [OK] Python works
echo.

REM Test 3: Check Flask
echo [TEST 3] Checking Flask...
pip show flask > nul 2>&1
if errorlevel 1 (
    echo   [WARNING] Flask not installed, will install now...
    echo.
    echo Installing packages (this may take 2-5 minutes)...
    pip install -q flask flask-cors requests cryptography netaddr waitress
    if errorlevel 1 (
        echo   [FAIL] Failed to install packages
        goto error
    )
    echo   [OK] Packages installed
) else (
    echo   [OK] Flask already installed
)
echo.

REM Test 4: Check required files
echo [TEST 4] Checking files...
if not exist "main.py" (
    echo   [FAIL] main.py not found
    goto error
)
echo   [OK] main.py found
if not exist "ui-server.js" (
    echo   [FAIL] ui-server.js not found
    goto error
)
echo   [OK] ui-server.js found
if not exist "app" (
    echo   [FAIL] app folder not found
    goto error
)
echo   [OK] app folder found
echo.

REM Test 5: Try to start
echo [TEST 5] Starting NetScanner...
echo.
python main.py
if errorlevel 1 (
    echo.
    echo [FAIL] NetScanner failed to start
    echo Check error messages above
)
goto end

:error
echo.
echo [DIAGNOSTIC FAILED]
echo Check the messages above for the problem
pause
exit /b 1

:end
pause
