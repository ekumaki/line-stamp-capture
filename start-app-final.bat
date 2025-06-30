@echo off
title LINE Sticker Capture App

echo =========================================
echo Starting LINE Sticker Capture App...
echo =========================================
echo.

REM Set current directory to batch file location
cd /d "%~dp0"
echo Project Directory: %CD%
echo.

REM Check if app directory exists
if not exist "app" (
    echo ERROR: app directory not found
    echo Please make sure this file is in the correct location
    pause
    exit /b 1
)

echo Moving to app directory...
cd app
echo Current Directory: %CD%
echo.

REM Check package.json
if not exist "package.json" (
    echo ERROR: package.json not found
    pause
    exit /b 1
)

echo Starting the application...
echo.
echo Note: 
echo - GPU warnings are normal and don't affect functionality
echo - Close the app window to stop the application
echo - Keep this command window open while using the app
echo.

REM Start the app
npm start

echo.
echo Application has been closed
pause