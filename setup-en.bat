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
set MISSING_FILES=0

if not exist "start-app.bat" (
    echo ERROR: start-app.bat not found
    set MISSING_FILES=1
)

if not exist "create-shortcut.ps1" (
    echo ERROR: create-shortcut.ps1 not found
    set MISSING_FILES=1
)

if not exist "app\package.json" (
    echo ERROR: app\package.json not found
    set MISSING_FILES=1
)

if %MISSING_FILES%==1 (
    echo.
    echo ERROR: Required files are missing
    echo Please ensure all project files are in place before running setup
    echo.
    pause
    exit /b 1
)

echo SUCCESS: All required files found
echo.

REM Check Node.js installation
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed
    echo.
    echo Please install Node.js first:
    echo https://nodejs.org/
    echo.
    echo Installation steps:
    echo 1. Visit the URL above
    echo 2. Download the "LTS" version
    echo 3. Run the installer
    echo 4. Re-run this setup after installation
    echo.
    set /p open_browser="Open Node.js download page in browser? (y/n): "
    if /i "%open_browser%"=="y" (
        start https://nodejs.org/
    )
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo SUCCESS: Node.js %NODE_VERSION% is installed
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

REM PowerShell execution policy check and setup
echo Configuring PowerShell execution policy...
powershell -Command "Get-ExecutionPolicy -Scope CurrentUser" | findstr /i "RemoteSigned Unrestricted" >nul
if errorlevel 1 (
    echo WARNING: PowerShell execution policy needs to be set
    echo.
    echo This is required for desktop shortcut creation.
    echo This is a security setting, but safe for this app.
    echo.
    set /p set_policy="Set PowerShell execution policy? (y/n): "
    
    if /i "%set_policy%"=="y" (
        echo Setting execution policy...
        powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"
        if errorlevel 1 (
            echo WARNING: Failed to set execution policy
            echo You can create the shortcut manually later
        ) else (
            echo SUCCESS: Execution policy set
        )
        echo.
    )
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

REM Setup complete
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo How to start the app:
echo   Method 1: Double-click "LINE Sticker Capture" on desktop
echo   Method 2: Double-click start-app.bat
echo.
echo Usage:
echo   1. App starts and opens a browser
echo   2. Enter LINE STORE sticker page URL
echo   3. Click "Start" button
echo   4. Manually close any popups in browser
echo   5. Stickers will be captured automatically
echo.
echo Capture files saved to:
echo   %CD%\app\captures\
echo.
echo IMPORTANT NOTES:
echo   - Do not close command prompt while using app
echo   - Internet connection required
echo   - For personal use only
echo.
echo Setup log file: setup.log
echo Check this file if you encounter problems
echo.
pause