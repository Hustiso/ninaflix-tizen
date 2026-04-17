@echo off
title Ninaflix Bridge
echo.
echo  ╔══════════════════════════════════════╗
echo  ║     Ninaflix Bridge — Starting...    ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Check if node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js not found
    echo  Download: https://nodejs.org
    pause
    exit /b 1
)

:: Install deps if needed
if not exist "node_modules" (
    echo  Installing dependencies...
    call npm install --silent
)

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP: =%

echo  Bridge running on:
echo    Local:  http://localhost:3000
echo    LAN:    http://%IP%:3000
echo.
echo  TV will auto-detect. Keep this window open.
echo  Press Ctrl+C to stop.
echo.

node bridge.js
