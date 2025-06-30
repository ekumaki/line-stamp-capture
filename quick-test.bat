@echo off
title Quick Test - LINE Sticker Capture App

echo =========================================
echo Quick Test - LINE Sticker Capture App
echo =========================================
echo.

REM Set current directory to batch file location
cd /d "%~dp0"
echo Current Directory: %CD%
echo.

REM Test 1: Check Node.js
echo Test 1: Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo FAIL: Node.js not installed
    echo Download from: https://nodejs.org/
    goto :end
) else (
    for /f "tokens=*" %%i in ('node --version') do echo PASS: Node.js %%i
)
echo.

REM Test 2: Check npm
echo Test 2: Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo FAIL: npm not available
    goto :end
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo PASS: npm %%i
)
echo.

REM Test 3: Check project structure
echo Test 3: Checking project structure...
if not exist "app\package.json" (
    echo FAIL: app\package.json not found
    goto :end
) else (
    echo PASS: app\package.json found
)
echo.

REM Test 4: Check PowerShell policy
echo Test 4: Checking PowerShell execution policy...
powershell -Command "Get-ExecutionPolicy -Scope CurrentUser" >temp_policy.txt 2>&1
set /p POLICY=<temp_policy.txt
del temp_policy.txt >nul 2>&1
echo Current policy: %POLICY%
echo NOTE: Should be "RemoteSigned" or "Unrestricted" for shortcuts
echo.

REM Test 5: Try to install basic dependencies
echo Test 5: Testing npm install...
cd app
call npm install --dry-run >nul 2>&1
if errorlevel 1 (
    echo WARN: npm install might fail (network/permission issue)
) else (
    echo PASS: npm install should work
)
cd ..
echo.

REM Test 6: Create manual shortcut test
echo Test 6: Manual shortcut creation test...
set DESKTOP=%USERPROFILE%\Desktop
echo Desktop path: %DESKTOP%
if exist "%DESKTOP%" (
    echo PASS: Desktop folder accessible
    echo You can manually create a shortcut pointing to:
    echo Target: %CD%\start-app-en.bat
) else (
    echo WARN: Desktop folder not found at standard location
)
echo.

echo =========================================
echo Quick Test Summary
echo =========================================
echo.
echo If all tests passed, try:
echo 1. setup-en.bat  (for automatic setup)
echo 2. start-app-en.bat  (to start the app directly)
echo.
echo For PowerShell issues, run as administrator:
echo Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
echo.

:end
pause