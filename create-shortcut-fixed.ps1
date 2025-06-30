# LINE Sticker Capture App - Fixed Desktop Shortcut Creation Script
# PowerShell execution policy setting may be required
# Run as administrator: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

Write-Host "LINE Sticker Capture App" -ForegroundColor Green
Write-Host "Fixed Desktop Shortcut Creation Script" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Yellow
Write-Host ""

# Get current script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Project Directory: $ScriptDir" -ForegroundColor Cyan

# Check for start-app-fixed.bat existence
$BatchFile = Join-Path $ScriptDir "start-app-fixed.bat"
if (-not (Test-Path $BatchFile)) {
    Write-Host "ERROR: start-app-fixed.bat not found" -ForegroundColor Red
    Write-Host "Please place this script in the project root directory" -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host "SUCCESS: start-app-fixed.bat found" -ForegroundColor Green

# Get desktop path
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
Write-Host "Desktop Path: $DesktopPath" -ForegroundColor Cyan

# Shortcut file name
$ShortcutName = "LINE Sticker Capture (Fixed).lnk"
$ShortcutPath = Join-Path $DesktopPath $ShortcutName

Write-Host ""
Write-Host "Creating shortcut..." -ForegroundColor Yellow

try {
    # Create WScript.Shell object
    $WshShell = New-Object -ComObject WScript.Shell
    
    # Create shortcut object
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    
    # Set shortcut properties - directly point to the batch file
    $Shortcut.TargetPath = $BatchFile
    $Shortcut.WorkingDirectory = $ScriptDir
    $Shortcut.Description = "LINE STORE Sticker Capture Desktop App (Fixed Version)"
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
    Write-Host "  1. Double-click 'LINE Sticker Capture (Fixed)' on desktop" -ForegroundColor White
    Write-Host "  2. The app will start automatically" -ForegroundColor White
    Write-Host "  3. GPU warnings are normal and don't affect functionality" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANT NOTES:" -ForegroundColor Red
    Write-Host "  - Keep the command prompt window open while using the app" -ForegroundColor White
    Write-Host "  - Close the app window to exit completely" -ForegroundColor White
    
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
Write-Host "Launch 'LINE Sticker Capture (Fixed)' from desktop to start using the app." -ForegroundColor Green

Read-Host "Press Enter to exit..."