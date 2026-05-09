@echo off
REM Simple launcher

setlocal
cd /d "%~dp0"

python -u main.py

pause
