# LINE Sticker Capture App - Final Desktop Shortcut Creation Script

Write-Host "LINE Sticker Capture App" -ForegroundColor Green
Write-Host "Final Desktop Shortcut Creation" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Yellow
Write-Host ""

# Get current script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Project Directory: $ScriptDir" -ForegroundColor Cyan

# Check for start-app.bat existence
$BatchFile = Join-Path $ScriptDir "start-app.bat"
if (-not (Test-Path $BatchFile)) {
    Write-Host "ERROR: start-app.bat not found" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host "SUCCESS: start-app.bat found" -ForegroundColor Green

# Get desktop path
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
Write-Host "Desktop Path: $DesktopPath" -ForegroundColor Cyan

# Shortcut file name
$ShortcutName = "LINE Sticker Capture.lnk"
$ShortcutPath = Join-Path $DesktopPath $ShortcutName

Write-Host ""
Write-Host "Creating desktop shortcut..." -ForegroundColor Yellow

try {
    # Create WScript.Shell object
    $WshShell = New-Object -ComObject WScript.Shell
    
    # Create shortcut object
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    
    # Set shortcut properties
    $Shortcut.TargetPath = $BatchFile
    $Shortcut.WorkingDirectory = $ScriptDir
    $Shortcut.Description = "LINE STORE Sticker Capture Desktop App"
    $Shortcut.WindowStyle = 1  # Normal window
    
    # Set icon (optional)
    $IconPath = Join-Path $ScriptDir "app-icon.ico"
    if (Test-Path $IconPath) {
        $Shortcut.IconLocation = "$IconPath,0"
        Write-Host "Custom icon applied" -ForegroundColor Green
    } else {
        $Shortcut.IconLocation = "%SystemRoot%\System32\shell32.dll,25"
        Write-Host "Default icon applied" -ForegroundColor Yellow
    }
    
    # Save shortcut
    $Shortcut.Save()
    
    Write-Host ""
    Write-Host "SUCCESS: Desktop shortcut created!" -ForegroundColor Green
    Write-Host "Shortcut: $ShortcutPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  1. Double-click 'LINE Sticker Capture' on desktop" -ForegroundColor White
    Write-Host "  2. The app will start automatically" -ForegroundColor White
    Write-Host "  3. Enter a LINE STORE URL and click Start" -ForegroundColor White
    Write-Host ""
    
    # Release COM object
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null
    
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create shortcut" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual creation:" -ForegroundColor Yellow
    Write-Host "Target: $BatchFile" -ForegroundColor Gray
    
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host ""
Write-Host "Setup completed successfully!" -ForegroundColor Green

Read-Host "Press Enter to exit..."