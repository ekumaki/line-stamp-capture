@echo off
title Debug - LINE Sticker Capture App

echo =========================================
echo DEBUG MODE - LINE Sticker Capture App
echo =========================================
echo.

REM Set current directory to batch file location
cd /d "%~dp0"
echo Current Directory: %CD%
echo.

echo STEP 1: Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found
    echo Please install Node.js from https://nodejs.org/
    goto :error
)
echo SUCCESS: Node.js found
echo.

echo STEP 2: Checking npm...
npm --version
if errorlevel 1 (
    echo ERROR: npm not found
    goto :error
)
echo SUCCESS: npm found
echo.

echo STEP 3: Checking app directory...
if not exist "app" (
    echo ERROR: app directory not found
    echo Current directory contents:
    dir
    goto :error
)
echo SUCCESS: app directory found
echo.

echo STEP 4: Checking package.json...
if not exist "app\package.json" (
    echo ERROR: app\package.json not found
    echo app directory contents:
    dir app
    goto :error
)
echo SUCCESS: package.json found
echo.

echo STEP 5: Moving to app directory...
cd app
echo New directory: %CD%
echo.

echo STEP 6: Checking package.json content...
type package.json
echo.

echo STEP 7: Checking node_modules...
if not exist "node_modules" (
    echo WARNING: node_modules not found
    echo Running npm install...
    npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        goto :error
    )
    echo SUCCESS: npm install completed
) else (
    echo SUCCESS: node_modules exists
)
echo.

echo STEP 8: Testing npm start...
echo About to run: npm start
echo If this fails, we'll see the exact error
echo.
npm start
if errorlevel 1 (
    echo ERROR: npm start failed
    goto :error
)

echo SUCCESS: App started and closed normally
goto :end

:error
echo.
echo ==========================================
echo ERROR DETECTED
echo ==========================================
echo Check the messages above to identify the problem
echo.

:end
echo.
echo Press any key to close this window...
pause >nul