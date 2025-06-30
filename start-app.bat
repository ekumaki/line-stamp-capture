@echo off
chcp 65001 >nul
title LINE Sticker Capture App

echo 🖼️  LINE Sticker Capture App を起動中...
echo =========================================

REM 現在のディレクトリをバッチファイルの場所に設定
cd /d "%~dp0"

echo 📁 プロジェクトディレクトリ: %CD%

REM Node.jsがインストールされているかチェック
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js がインストールされていません
    echo.
    echo Node.js をインストールしてください:
    echo https://nodejs.org/
    echo.
    echo ダウンロード手順:
    echo 1. 上記URLにアクセス
    echo 2. "LTS" バージョンをダウンロード
    echo 3. インストーラーを実行
    echo 4. インストール後、このファイルを再実行
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js バージョン: %NODE_VERSION%

REM npmがインストールされているかチェック
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm がインストールされていません
    echo Node.jsと一緒にnpmもインストールされるはずです
    echo Node.jsを再インストールしてください
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm バージョン: %NPM_VERSION%

REM appディレクトリに移動
if exist "app" (
    cd app
    echo 📂 appディレクトリに移動しました
) else (
    echo ❌ appディレクトリが見つかりません
    echo.
    echo このファイルをプロジェクトのルートディレクトリに配置してください
    echo プロジェクト構成:
    echo   line-stamp-capture/
    echo   ├── start-app.bat  ← このファイル
    echo   └── app/
    echo       ├── package.json
    echo       └── ...
    echo.
    pause
    exit /b 1
)

REM package.jsonの存在確認
if not exist "package.json" (
    echo ❌ package.json が見つかりません
    echo appディレクトリが正しく設定されていない可能性があります
    pause
    exit /b 1
)

REM node_modulesの存在確認と依存関係インストール
if not exist "node_modules" (
    echo 📦 依存関係をインストール中...
    echo （初回起動時は数分かかります。しばらくお待ちください）
    echo.
    call npm install
    if errorlevel 1 (
        echo ❌ 依存関係のインストールに失敗しました
        echo.
        echo 解決方法:
        echo 1. インターネット接続を確認
        echo 2. ウイルス対策ソフトを一時的に無効にする
        echo 3. 管理者権限でこのファイルを実行
        echo.
        pause
        exit /b 1
    )
    echo ✅ 依存関係のインストールが完了しました
) else (
    echo ✅ 依存関係は既にインストール済みです
)

REM Electronがインストールされているかチェック
if not exist "node_modules\.bin\electron.cmd" (
    echo 📦 Electronをインストール中...
    call npm install electron@^27.0.0
    if errorlevel 1 (
        echo ❌ Electronのインストールに失敗しました
        echo 管理者権限で実行するか、手動でインストールしてください:
        echo npm install electron@^27.0.0
        pause
        exit /b 1
    )
    echo ✅ Electronのインストールが完了しました
)

echo.
echo 🚀 LINE Sticker Capture App を起動します...
echo.
echo 📖 使用方法:
echo   1. URLフィールドにLINE STOREのスタンプページURLを入力
echo   2. 「開始」ボタンをクリック
echo   3. ブラウザでポップアップを手動で閉じる
echo   4. 自動でスタンプをキャプチャ
echo.
echo ✋ アプリを終了するには、ウィンドウを閉じてください
echo ⚠️  このコマンドプロンプトは開いたままにしてください
echo.

REM Electronアプリを起動
call npm start

REM アプリ終了後
echo.
echo 👋 LINE Sticker Capture App が終了しました
echo.
echo キャプチャされたファイルは以下のフォルダに保存されます:
echo %CD%\captures\
echo.
pause