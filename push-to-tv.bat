@echo off
REM ═══════════════════════════════════════════
REM Ninaflix — Push to TV
REM ═══════════════════════════════════════════
REM
REM Usage: push-to-tv.bat [TV_IP]
REM Requires: SDB (Smart Debug Bridge) or Tizen CLI
REM
REM Enable Developer Mode on TV first:
REM   1. Open Apps on TV
REM   2. Press 12345 on remote (number pad)
REM   3. Set IP to your PC's IP, set port 26101
REM   4. TV reboots, Developer Mode is active
REM

setlocal

set TV_IP=%1
if "%TV_IP%"=="" set /P TV_IP="Enter TV IP address: "

set BUILD_DIR=.buildResult
set WGT=release\Ninaflix.wgt

echo.
echo ╔══════════════════════════════════════╗
echo ║  Ninaflix — Push to TV              ║
echo ╚══════════════════════════════════════╝
echo.

REM Check for SDB
where sdb >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :use_sdb

REM Check for Tizen CLI
where tizen >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :use_tizen

echo [ERROR] Neither SDB nor Tizen CLI found.
echo.
echo Install one of:
echo   1. SDB: comes with Tizen Studio or TizenBrew
echo   2. Tizen CLI: install Tizen Studio from developer.tizen.org
echo.
echo Alternative: Use TizenBrew on TV directly.
echo   Module: Hustiso/ninaflix-tizen
echo.
pause
exit /b 1

:use_sdb
echo [1/3] Connecting to TV at %TV_IP%...
sdb connect %TV_IP%
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cannot connect. Check:
    echo   - TV and PC on same network
    echo   - Developer Mode enabled on TV
    echo   - IP address correct: %TV_IP%
    pause
    exit /b 1
)

echo [2/3] Building package...
if not exist %BUILD_DIR% mkdir %BUILD_DIR%
xcopy /E /Y css %BUILD_DIR%\css\
xcopy /E /Y js %BUILD_DIR%\js\
xcopy /E /Y assets %BUILD_DIR%\assets\
copy /Y index.html %BUILD_DIR%\
copy /Y config.xml %BUILD_DIR%\

if not exist release mkdir release
cd %BUILD_DIR% && tar -a -cf ..\%WGT% . && cd ..

echo [3/3] Installing to TV...
sdb install %WGT%
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ╔══════════════════════════════════════╗
    echo ║  SUCCESS — Ninaflix installed!      ║
    echo ║  Launch from TV app menu.           ║
    echo ╚══════════════════════════════════════╝
) else (
    echo [ERROR] Install failed. Try: sdb kill-server && sdb connect %TV_IP%
)
pause
exit /b

:use_tizen
echo [1/3] Building with Tizen CLI...
tizen build-web
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed. Check Tizen CLI config.
    pause
    exit /b 1
)

echo [2/3] Packaging...
if not exist release mkdir release
tizen package -t wgt -o release -- .buildResult

echo [3/3] Installing to TV...
tizen install -n release\Ninaflix.wgt
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ╔══════════════════════════════════════╗
    echo ║  SUCCESS — Ninaflix installed!      ║
    echo ║  Launch from TV app menu.           ║
    echo ╚══════════════════════════════════════╝
)
pause
