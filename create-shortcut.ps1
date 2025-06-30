# LINE Sticker Capture App - デスクトップショートカット作成スクリプト
# PowerShell実行ポリシーの設定が必要な場合があります
# 管理者権限で実行: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

Write-Host "🖼️  LINE Sticker Capture App" -ForegroundColor Green
Write-Host "デスクトップショートカット作成スクリプト" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Yellow
Write-Host ""

# 現在のスクリプトディレクトリを取得
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "📁 プロジェクトディレクトリ: $ScriptDir" -ForegroundColor Cyan

# start-app.batの存在確認
$BatchFile = Join-Path $ScriptDir "start-app.bat"
if (-not (Test-Path $BatchFile)) {
    Write-Host "❌ start-app.bat が見つかりません" -ForegroundColor Red
    Write-Host "このスクリプトをプロジェクトのルートディレクトリに配置してください" -ForegroundColor Yellow
    Read-Host "Enterキーを押して終了..."
    exit 1
}

Write-Host "✅ start-app.bat が見つかりました" -ForegroundColor Green

# デスクトップパスを取得
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
Write-Host "🖥️  デスクトップパス: $DesktopPath" -ForegroundColor Cyan

# ショートカットファイル名
$ShortcutName = "LINE Sticker Capture.lnk"
$ShortcutPath = Join-Path $DesktopPath $ShortcutName

Write-Host ""
Write-Host "🔧 ショートカットを作成中..." -ForegroundColor Yellow

try {
    # WScript.Shell オブジェクトを作成
    $WshShell = New-Object -ComObject WScript.Shell
    
    # ショートカットオブジェクトを作成
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    
    # ショートカットのプロパティを設定
    $Shortcut.TargetPath = "$env:SystemRoot\System32\cmd.exe"
    $Shortcut.Arguments = "/c `"cd /d `"$ScriptDir`" && start-app.bat`""
    $Shortcut.WorkingDirectory = $ScriptDir
    $Shortcut.Description = "LINE STORE Sticker Capture Desktop App"
    $Shortcut.WindowStyle = 1  # Normal window
    
    # アイコンの設定（オプション）
    $IconPath = Join-Path $ScriptDir "app-icon.ico"
    if (Test-Path $IconPath) {
        $Shortcut.IconLocation = "$IconPath,0"
        Write-Host "🎨 カスタムアイコンを設定しました" -ForegroundColor Green
    } else {
        # デフォルトアイコンを使用
        $Shortcut.IconLocation = "%SystemRoot%\System32\shell32.dll,25"
        Write-Host "🎨 デフォルトアイコンを使用します" -ForegroundColor Yellow
    }
    
    # ショートカットを保存
    $Shortcut.Save()
    
    Write-Host ""
    Write-Host "✅ デスクトップショートカットが正常に作成されました！" -ForegroundColor Green
    Write-Host "📍 ショートカット位置: $ShortcutPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🚀 使用方法:" -ForegroundColor Yellow
    Write-Host "  1. デスクトップの 'LINE Sticker Capture' をダブルクリック" -ForegroundColor White
    Write-Host "  2. コマンドプロンプトが開き、アプリが起動します" -ForegroundColor White
    Write-Host "  3. 初回起動時は依存関係のインストールで時間がかかります" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  注意事項:" -ForegroundColor Red
    Write-Host "  - Node.js がインストールされている必要があります" -ForegroundColor White
    Write-Host "  - インターネット接続が必要です（初回のみ）" -ForegroundColor White
    Write-Host "  - アプリ使用中はコマンドプロンプトを閉じないでください" -ForegroundColor White
    
    # COMオブジェクトを解放
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null
    
} catch {
    Write-Host ""
    Write-Host "❌ ショートカットの作成に失敗しました" -ForegroundColor Red
    Write-Host "エラー詳細: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "解決方法:" -ForegroundColor Yellow
    Write-Host "1. PowerShellを管理者権限で実行してください" -ForegroundColor White
    Write-Host "2. 実行ポリシーを設定してください:" -ForegroundColor White
    Write-Host "   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Gray
    Write-Host "3. ウイルス対策ソフトを一時的に無効にしてください" -ForegroundColor White
    
    Read-Host "Enterキーを押して終了..."
    exit 1
}

Write-Host ""
Write-Host "🎉 セットアップが完了しました！" -ForegroundColor Green
Write-Host "デスクトップから 'LINE Sticker Capture' を起動してお楽しみください。" -ForegroundColor Green

Read-Host "Enterキーを押して終了..."