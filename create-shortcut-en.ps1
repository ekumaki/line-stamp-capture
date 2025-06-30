# LINE Sticker Capture App - Desktop Shortcut Creation Script (English)
# PowerShell execution policy setting may be required
# Run as administrator: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

Write-Host "LINE Sticker Capture App" -ForegroundColor Green
Write-Host "Desktop Shortcut Creation Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Yellow
Write-Host ""

# Get current script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Project Directory: $ScriptDir" -ForegroundColor Cyan

# Check for start-app-en.bat existence first, fallback to start-app.bat
$BatchFile = Join-Path $ScriptDir "start-app-en.bat"
if (-not (Test-Path $BatchFile)) {
    $BatchFile = Join-Path $ScriptDir "start-app.bat"
    if (-not (Test-Path $BatchFile)) {
        Write-Host "ERROR: Neither start-app-en.bat nor start-app.bat found" -ForegroundColor Red
        Write-Host "Please place this script in the project root directory" -ForegroundColor Yellow
        Read-Host "Press Enter to exit..."
        exit 1
    } else {
        Write-Host "Using start-app.bat (Japanese version)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Using start-app-en.bat (English version)" -ForegroundColor Green
}

Write-Host "SUCCESS: Batch file found: $BatchFile" -ForegroundColor Green

# Get desktop path
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
Write-Host "Desktop Path: $DesktopPath" -ForegroundColor Cyan

# Shortcut file name
$ShortcutName = "LINE Sticker Capture.lnk"
$ShortcutPath = Join-Path $DesktopPath $ShortcutName

Write-Host ""
Write-Host "Creating shortcut..." -ForegroundColor Yellow

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
        Write-Host "Custom icon set" -ForegroundColor Green
    } else {
        # Use default icon
        $Shortcut.IconLocation = "%SystemRoot%\System32\shell32.dll,25"
        Write-Host "Using default icon" -ForegroundColor Yellow
    }
    
    # Save shortcut
    $Shortcut.Save()
    
    Write-Host ""
    Write-Host "SUCCESS: Desktop shortcut created successfully!" -ForegroundColor Green
    Write-Host "Shortcut location: $ShortcutPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  1. Double-click 'LINE Sticker Capture' on desktop" -ForegroundColor White
    Write-Host "  2. Command prompt will open and app will start" -ForegroundColor White
    Write-Host "  3. First startup may take time for dependency installation" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANT NOTES:" -ForegroundColor Red
    Write-Host "  - Node.js must be installed" -ForegroundColor White
    Write-Host "  - Internet connection required (first time only)" -ForegroundColor White
    Write-Host "  - Do not close command prompt while using app" -ForegroundColor White
    
    # Release COM object
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null
    
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create shortcut" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Yellow
    Write-Host "1. Run PowerShell as administrator" -ForegroundColor White
    Write-Host "2. Set execution policy:" -ForegroundColor White
    Write-Host "   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Gray
    Write-Host "3. Temporarily disable antivirus software" -ForegroundColor White
    Write-Host "4. Create shortcut manually:" -ForegroundColor White
    Write-Host "   Target: $BatchFile" -ForegroundColor Gray
    
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host ""
Write-Host "SUCCESS: Setup completed!" -ForegroundColor Green
Write-Host "Launch 'LINE Sticker Capture' from desktop to start using the app." -ForegroundColor Green

Read-Host "Press Enter to exit..."