@echo off
title LINE Sticker Capture App - Debug Mode

echo =========================================
echo Starting LINE Sticker Capture App
echo Debug Mode - Window will stay open
echo =========================================

REM Keep command prompt open even if there's an error
cmd /k "cd /d "%~dp0" && start-app-en.bat"