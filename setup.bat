@echo off
title LINE Sticker Capture App - Setup

echo =========================================
echo LINE Sticker Capture App - Setup
echo =========================================
echo.

REM Set current directory to batch file location
cd /d "%~dp0"
echo Setup Directory: %CD%
echo.

REM Check for required files
echo Checking for required files...
if not exist "start-app.bat" (
    echo ERROR: start-app.bat not found
    pause
    exit /b 1
)

if not exist "create-shortcut.ps1" (
    echo ERROR: create-shortcut.ps1 not found
    pause
    exit /b 1
)

if not exist "app\package.json" (
    echo ERROR: app\package.json not found
    pause
    exit /b 1
)

echo SUCCESS: All required files found
echo.

REM Optional dependency pre-installation
echo Optional dependency pre-installation
echo.
echo To speed up first app startup, you can install
echo dependencies now (may take a few minutes)
echo.
set /p install_deps="Install dependencies now? (y/n): "

if /i "%install_deps%"=="y" (
    echo.
    echo Installing dependencies...
    cd app
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        echo They will be installed on first startup instead
    ) else (
        echo SUCCESS: Dependencies installed
    )
    cd ..
    echo.
)

REM Create desktop shortcut
echo Creating desktop shortcut...
powershell -ExecutionPolicy Bypass -File "create-shortcut.ps1"
if errorlevel 1 (
    echo WARNING: Failed to create shortcut
    echo.
    echo Manual creation method:
    echo 1. Right-click on desktop
    echo 2. New ^> Shortcut
    echo 3. Location: %CD%\start-app.bat
    echo 4. Name: LINE Sticker Capture
    echo.
) else (
    echo SUCCESS: Desktop shortcut created
    echo.
)

echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo How to start the app:
echo   Method 1: Double-click "LINE Sticker Capture" on desktop
echo   Method 2: Double-click start-app.bat
echo.
echo Usage:
echo   1. Enter LINE STORE sticker page URL
echo   2. Click "Start" button
echo   3. Manually close any popups in browser
echo   4. Stickers will be captured automatically
echo.
echo Capture files saved to: app\captures\
echo.
pause