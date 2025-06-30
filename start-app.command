#!/bin/bash

# LINE Sticker Capture App - macOS起動スクリプト
# ダブルクリックでElectronアプリを起動します

echo "🖼️  LINE Sticker Capture App を起動中..."
echo "========================================="

# スクリプトのディレクトリに移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 プロジェクトディレクトリ: $SCRIPT_DIR"

# Node.jsがインストールされているかチェック
if ! command -v node &> /dev/null; then
    echo "❌ Node.js がインストールされていません"
    echo ""
    echo "Node.js をインストールしてください:"
    echo "https://nodejs.org/"
    echo ""
    echo "インストール後、このスクリプトを再実行してください"
    read -p "Enterキーを押して終了..."
    exit 1
fi

echo "✅ Node.js バージョン: $(node --version)"

# npmがインストールされているかチェック
if ! command -v npm &> /dev/null; then
    echo "❌ npm がインストールされていません"
    read -p "Enterキーを押して終了..."
    exit 1
fi

echo "✅ npm バージョン: $(npm --version)"

# appディレクトリに移動
if [ -d "app" ]; then
    cd app
    echo "📂 appディレクトリに移動しました"
else
    echo "❌ appディレクトリが見つかりません"
    echo "このスクリプトをプロジェクトのルートディレクトリに配置してください"
    read -p "Enterキーを押して終了..."
    exit 1
fi

# package.jsonの存在確認
if [ ! -f "package.json" ]; then
    echo "❌ package.json が見つかりません"
    read -p "Enterキーを押して終了..."
    exit 1
fi

# node_modulesの存在確認と依存関係インストール
if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストール中..."
    echo "（初回起動時は時間がかかります）"
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依存関係のインストールに失敗しました"
        read -p "Enterキーを押して終了..."
        exit 1
    fi
    echo "✅ 依存関係のインストールが完了しました"
else
    echo "✅ 依存関係は既にインストール済みです"
fi

# Electronがインストールされているかチェック
if [ ! -f "node_modules/.bin/electron" ]; then
    echo "📦 Electronをインストール中..."
    npm install electron@^27.0.0
    if [ $? -ne 0 ]; then
        echo "❌ Electronのインストールに失敗しました"
        read -p "Enterキーを押して終了..."
        exit 1
    fi
fi

echo ""
echo "🚀 LINE Sticker Capture App を起動します..."
echo "✋ アプリを終了するには、ウィンドウを閉じるかターミナルで Ctrl+C を押してください"
echo ""

# Electronアプリを起動
npm start

echo ""
echo "👋 LINE Sticker Capture App が終了しました"
echo "何かキーを押してこのウィンドウを閉じてください..."
read -n 1