@echo off
chcp 65001 >nul
title LINE Sticker Capture App - Initial Setup

echo LINE Sticker Capture App
echo Initial Setup - Windows Version
echo =========================================
echo.

REM Administrator privilege check
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Administrator privileges are recommended for this setup
    echo.
    echo How to run as administrator:
    echo 1. Right-click this file
    echo 2. Select "Run as administrator"
    echo.
    echo Continue anyway? (y/n)
    set /p choice="Choice: "
    if /i not "%choice%"=="y" (
        echo Setup cancelled
        pause
        exit /b 0
    )
    echo.
)

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
    echo ❌ 必要なファイルが不足しています
    echo プロジェクトファイルを正しく配置してからセットアップを実行してください
    echo.
    pause
    exit /b 1
)

echo ✅ 必要なファイルがすべて揃っています
echo.

REM Node.jsインストール確認
echo 🔍 Node.js インストール状況をチェック中...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js がインストールされていません
    echo.
    echo 📦 Node.js を先にインストールしてください:
    echo    https://nodejs.org/
    echo.
    echo インストール手順:
    echo 1. 上記URLにアクセス
    echo 2. "LTS" 版をダウンロード
    echo 3. インストーラーを実行
    echo 4. インストール後、このセットアップを再実行
    echo.
    set /p open_browser="ブラウザでNode.jsダウンロードページを開きますか？ (y/n): "
    if /i "%open_browser%"=="y" (
        start https://nodejs.org/
    )
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% がインストールされています
echo.

REM 依存関係の事前インストール（オプション）
echo 📦 依存関係の事前インストール
echo.
echo アプリの初回起動を高速化するため、
echo 今すぐ依存関係をインストールできます。
echo （数分かかる場合があります）
echo.
set /p install_deps="依存関係を今すぐインストールしますか？ (y/n): "

if /i "%install_deps%"=="y" (
    echo.
    echo 📦 依存関係をインストール中...
    cd app
    call npm install
    if errorlevel 1 (
        echo ❌ 依存関係のインストールに失敗しました
        echo 手動でインストールするか、後で初回起動時にインストールされます
    ) else (
        echo ✅ 依存関係のインストールが完了しました
    )
    cd ..
    echo.
)

REM PowerShell実行ポリシーの確認と設定
echo 🔧 PowerShell実行ポリシーを確認中...
powershell -Command "Get-ExecutionPolicy -Scope CurrentUser" | findstr /i "RemoteSigned Unrestricted" >nul
if errorlevel 1 (
    echo ⚠️  PowerShellの実行ポリシーを設定する必要があります
    echo.
    echo ショートカット作成のため、PowerShellの実行ポリシーを変更します。
    echo これはセキュリティ設定ですが、このアプリでは安全です。
    echo.
    set /p set_policy="PowerShell実行ポリシーを設定しますか？ (y/n): "
    
    if /i "%set_policy%"=="y" (
        echo 実行ポリシーを設定中...
        powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"
        if errorlevel 1 (
            echo ⚠️  実行ポリシーの設定に失敗しました
            echo 後で手動でショートカットを作成してください
        ) else (
            echo ✅ 実行ポリシーが設定されました
        )
        echo.
    )
)

REM デスクトップショートカット作成
echo 🖥️  デスクトップショートカットを作成中...
powershell -ExecutionPolicy Bypass -File "create-shortcut.ps1"
if errorlevel 1 (
    echo ⚠️  ショートカット作成に失敗しました
    echo.
    echo 手動作成方法:
    echo 1. デスクトップで右クリック
    echo 2. 「新規作成」→「ショートカット」
    echo 3. 場所: %CD%\start-app.bat
    echo 4. 名前: LINE Sticker Capture
    echo.
) else (
    echo ✅ デスクトップショートカットが作成されました
    echo.
)

REM セットアップ完了
echo ==========================================
echo 🎉 セットアップが完了しました！
echo ==========================================
echo.
echo 🚀 アプリの起動方法:
echo   方法1: デスクトップの「LINE Sticker Capture」をダブルクリック
echo   方法2: start-app.bat をダブルクリック
echo.
echo 📖 使用方法:
echo   1. アプリが起動したらLINE STOREのURLを入力
echo   2. 「開始」ボタンをクリック
echo   3. ブラウザでポップアップを手動で閉じる
echo   4. 自動でスタンプがキャプチャされます
echo.
echo 📁 キャプチャファイル保存先:
echo   %CD%\app\captures\
echo.
echo ⚠️  重要な注意事項:
echo   - アプリ使用中はコマンドプロンプトを閉じないでください
echo   - インターネット接続が必要です
echo   - 私的利用のみでご使用ください
echo.
echo セットアップログファイル: setup.log
echo 問題が発生した場合は上記ファイルを確認してください
echo.
pause