@echo off
title LINE Sticker Capture App

echo =========================================
echo Starting LINE Sticker Capture App...
echo =========================================

REM Set current directory to batch file location
cd /d "%~dp0"

echo Project Directory: %CD%

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed
    echo.
    echo Please install Node.js:
    echo https://nodejs.org/
    echo.
    echo Download steps:
    echo 1. Visit the URL above
    echo 2. Download "LTS" version
    echo 3. Run the installer
    echo 4. Re-run this file after installation
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo SUCCESS: Node.js version: %NODE_VERSION%

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed
    echo npm should be installed with Node.js
    echo Please reinstall Node.js
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo SUCCESS: npm version: %NPM_VERSION%

REM Move to app directory
if exist "app" (
    cd app
    echo Moved to app directory
) else (
    echo ERROR: app directory not found
    echo.
    echo Please place this file in the project root directory
    echo Project structure:
    echo   line-stamp-capture/
    echo   ├── start-app.bat  ← this file
    echo   └── app/
    echo       ├── package.json
    echo       └── ...
    echo.
    pause
    exit /b 1
)

REM Check package.json existence
if not exist "package.json" (
    echo ERROR: package.json not found
    echo app directory may not be configured correctly
    pause
    exit /b 1
)

REM Check node_modules and install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    echo ^(First startup may take several minutes. Please wait^)
    echo.
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        echo.
        echo Solutions:
        echo 1. Check internet connection
        echo 2. Temporarily disable antivirus software
        echo 3. Run this file as administrator
        echo.
        pause
        exit /b 1
    )
    echo SUCCESS: Dependencies installed
) else (
    echo SUCCESS: Dependencies already installed
)

REM Check if Electron is installed
if not exist "node_modules\.bin\electron.cmd" (
    echo Installing Electron...
    call npm install electron@^27.0.0
    if errorlevel 1 (
        echo ERROR: Failed to install Electron
        echo Run as administrator or install manually:
        echo npm install electron@^27.0.0
        pause
        exit /b 1
    )
    echo SUCCESS: Electron installed
)

echo.
echo Starting LINE Sticker Capture App...
echo.
echo Usage:
echo   1. Enter LINE STORE sticker page URL in URL field
echo   2. Click "Start" button
echo   3. Manually close popups in browser
echo   4. Stickers will be captured automatically
echo.
echo To exit the app, close the window
echo WARNING: Keep this command prompt open while using the app
echo.

REM Start Electron app
call npm start

REM After app exits
echo.
echo LINE Sticker Capture App has exited
echo.
echo Captured files are saved to:
echo %CD%\captures\
echo.
pause