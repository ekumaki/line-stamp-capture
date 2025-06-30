@echo off
title LINE Sticker Capture App

echo =========================================
echo Starting LINE Sticker Capture App...
echo =========================================

REM Set current directory to batch file location
cd /d "%~dp0"

echo Project Directory: %CD%
echo.

REM Check if Node.js is installed
echo Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo SUCCESS: Node.js is available
echo.

REM Check if npm is installed
echo Checking npm...
npm --version
if errorlevel 1 (
    echo ERROR: npm is not installed
    echo.
    pause
    exit /b 1
)
echo SUCCESS: npm is available
echo.

REM Move to app directory
echo Moving to app directory...
if exist "app" (
    cd app
    echo Current directory: %CD%
) else (
    echo ERROR: app directory not found
    echo Make sure this file is in the project root directory
    echo.
    pause
    exit /b 1
)
echo.

REM Check package.json existence
if not exist "package.json" (
    echo ERROR: package.json not found in app directory
    echo.
    pause
    exit /b 1
)
echo SUCCESS: package.json found
echo.

REM Check node_modules
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        echo.
        pause
        exit /b 1
    )
    echo SUCCESS: Dependencies installed
) else (
    echo SUCCESS: Dependencies already installed
)
echo.

echo Starting the app...
echo Note: GPU warnings are normal and don't affect functionality
echo Close the app window to stop it
echo.

REM Start the Electron app
call npm start

echo.
echo App has been closed
echo.
pause