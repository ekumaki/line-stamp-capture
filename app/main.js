const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// メインウィンドウを保持
let mainWindow;

function createWindow() {
  // メインウィンドウを作成
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // WebViewで外部サイトにアクセスするため
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false // 準備完了まで非表示
  });

  // HTMLファイルを読み込み
  mainWindow.loadFile('index.html');

  // 準備完了で表示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // ウィンドウが閉じられた時
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 開発時のDevToolsを開く
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// アプリの準備完了
app.whenReady().then(createWindow);

// 全ウィンドウが閉じられた時
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリがアクティベートされた時（macOS）
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPCハンドラー

// フォルダ選択ダイアログ
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'キャプチャ画像の保存先を選択'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// フォルダ作成
ipcMain.handle('create-folder', async (event, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('フォルダ作成エラー:', error);
    return false;
  }
});

// ファイル保存
ipcMain.handle('save-file', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data);
    return true;
  } catch (error) {
    console.error('ファイル保存エラー:', error);
    return false;
  }
});

// メタデータ保存
ipcMain.handle('save-metadata', async (event, filePath, metadata) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
    return true;
  } catch (error) {
    console.error('メタデータ保存エラー:', error);
    return false;
  }
});

// フォルダを開く
ipcMain.handle('open-folder', async (event, folderPath) => {
  const { shell } = require('electron');
  try {
    await shell.openPath(folderPath);
    return true;
  } catch (error) {
    console.error('フォルダオープンエラー:', error);
    return false;
  }
});