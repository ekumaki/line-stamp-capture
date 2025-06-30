const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
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

  // 開発者ツールを常に利用可能にする
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F12キーで開発者ツールを開く
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
    }
    // Ctrl+Shift+I でも開発者ツールを開く
    if (input.control && input.shift && input.key === 'I' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // コンソールログの有効化
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${level}: ${message} (line: ${line})`);
  });

  // 開発時のDevToolsを自動で開く
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// メニューを作成
function createMenu() {
  const template = [
    {
      label: 'ファイル',
      submenu: [
        {
          label: '終了',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '表示',
      submenu: [
        {
          label: '開発者ツール',
          accelerator: process.platform === 'darwin' ? 'F12' : 'F12',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          }
        },
        {
          label: '再読み込み',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.reload();
            }
          }
        }
      ]
    },
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'アプリについて',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'LINE Sticker Capture',
              message: 'LINE Sticker Capture v1.0.0\n\nLINE STOREのスタンプを個別にキャプチャするツールです。',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// アプリの準備完了
app.whenReady().then(() => {
  createWindow();
  createMenu();
});

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