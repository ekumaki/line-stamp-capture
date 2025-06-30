@echo off
title LINE Sticker Capture App - Safe Mode

echo =========================================
echo Starting LINE Sticker Capture App...
echo Safe Mode - Window stays open for debugging
echo =========================================

REM Set current directory to batch file location
cd /d "%~dp0"

echo Project Directory: %CD%
echo.

REM Check if Node.js is installed
echo Checking Node.js...
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
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo SUCCESS: Node.js version: %NODE_VERSION%

REM Check if npm is installed
echo Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed
    echo npm should be installed with Node.js
    echo Please reinstall Node.js
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo SUCCESS: npm version: %NPM_VERSION%
echo.

REM Move to app directory
echo Checking app directory...
if exist "app" (
    cd app
    echo Moved to app directory: %CD%
) else (
    echo ERROR: app directory not found
    echo.
    echo Please place this file in the project root directory
    echo Project structure should be:
    echo   line-stamp-capture/
    echo   ├── start-app-safe.bat  ← this file
    echo   └── app/
    echo       ├── package.json
    echo       └── ...
    echo.
    echo Current directory contents:
    dir
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

REM Check package.json existence
echo Checking package.json...
if not exist "package.json" (
    echo ERROR: package.json not found
    echo app directory may not be configured correctly
    echo.
    echo app directory contents:
    dir
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo SUCCESS: package.json found
echo.

REM Check node_modules and install dependencies
echo Checking dependencies...
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
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo SUCCESS: Dependencies installed
) else (
    echo SUCCESS: Dependencies already installed
)
echo.

REM Check if Electron is installed
echo Checking Electron...
if not exist "node_modules\.bin\electron.cmd" (
    echo Installing Electron...
    call npm install electron@^27.0.0
    if errorlevel 1 (
        echo ERROR: Failed to install Electron
        echo Run as administrator or install manually:
        echo npm install electron@^27.0.0
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo SUCCESS: Electron installed
) else (
    echo SUCCESS: Electron already installed
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
echo Running: npm start
call npm start

REM After app exits
echo.
echo LINE Sticker Capture App has exited
echo.
echo Captured files are saved to:
echo %CD%\captures\
echo.
echo Press any key to close this window...
pause >nul