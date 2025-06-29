const { ipcRenderer } = require('electron');
const path = require('path');
const StickerCapture = require('./capture.js');

// DOM要素
const urlInput = document.getElementById('url-input');
const startBtn = document.getElementById('start-btn');
const browserView = document.getElementById('browser-view');
const browserOverlay = document.getElementById('browser-overlay');
const progressText = document.getElementById('progress-text');
const progressCount = document.getElementById('progress-count');
const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status-text');
const outputPath = document.getElementById('output-path');
const openFolderBtn = document.getElementById('open-folder-btn');
const helpModal = document.getElementById('help-modal');
const popupHelpBtn = document.getElementById('popup-help-btn');
const closeModal = document.querySelector('.close');

// アプリケーション状態
let isCapturing = false;
let currentOutputFolder = '';

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    updateUI();
    
    // デフォルトの保存先を設定
    const defaultPath = path.join(process.cwd(), 'captures');
    outputPath.textContent = defaultPath;
}

function setupEventListeners() {
    // 開始ボタン
    startBtn.addEventListener('click', handleStart);
    
    // URL入力（Enterキー）
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isCapturing) {
            handleStart();
        }
    });
    
    // URL入力変更時の検証
    urlInput.addEventListener('input', validateUrl);
    
    // フォルダを開くボタン
    openFolderBtn.addEventListener('click', openOutputFolder);
    
    // ヘルプモーダル
    popupHelpBtn.addEventListener('click', () => {
        helpModal.style.display = 'block';
    });
    
    closeModal.addEventListener('click', () => {
        helpModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.style.display = 'none';
        }
    });
    
    // WebViewの準備完了
    browserView.addEventListener('dom-ready', () => {
        console.log('Browser WebView ready');
    });
    
    // WebViewのナビゲーション完了
    browserView.addEventListener('did-finish-load', () => {
        console.log('Browser page loaded');
        if (isCapturing) {
            // ページが読み込まれたら、少し待ってからキャプチャ処理を開始
            setTimeout(() => {
                startCaptureProcess();
            }, 3000);
        }
    });
}

function validateUrl() {
    const url = urlInput.value.trim();
    const isValid = url.startsWith('https://store.line.me/stickershop/product/');
    
    startBtn.disabled = !isValid || isCapturing;
    
    if (url && !isValid) {
        urlInput.style.borderColor = '#ff6b6b';
        statusText.textContent = '有効なLINE STOREのスタンプURLを入力してください';
    } else {
        urlInput.style.borderColor = '#e1e8ed';
        if (!isCapturing) {
            statusText.textContent = 'URLを入力して開始してください';
        }
    }
}

function extractProductId(url) {
    const match = url.match(/\/stickershop\/product\/(\d+)\//);
    return match ? match[1] : null;
}

function generateOutputFolder(productId) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
    return path.join(outputPath.textContent, `${productId}_${dateStr}`);
}

async function handleStart() {
    if (isCapturing) return;
    
    const url = urlInput.value.trim();
    if (!url.startsWith('https://store.line.me/stickershop/product/')) {
        alert('有効なLINE STOREのスタンプURLを入力してください');
        return;
    }
    
    const productId = extractProductId(url);
    if (!productId) {
        alert('URLから商品IDを取得できませんでした');
        return;
    }
    
    try {
        isCapturing = true;
        updateUI();
        
        // 出力フォルダのベースパスを設定
        const baseOutputDir = path.dirname(outputPath.textContent);
        
        // UI更新
        progressText.textContent = '初期化中...';
        statusText.textContent = 'キャプチャプロセスを開始しています';
        progressBar.style.width = '0%';
        
        // ブラウザオーバーレイを非表示（実際のキャプチャはバックグラウンドで実行）
        browserOverlay.classList.add('hidden');
        
        // キャプチャを実行
        const capture = new StickerCapture();
        const result = await capture.captureStickers(url, baseOutputDir, {
            browserType: 'chromium',
            headless: false,
            waitSeconds: 30,
            onProgress: updateCaptureProgress
        });
        
        if (result.success) {
            currentOutputFolder = result.outputDir;
            outputPath.textContent = currentOutputFolder;
            
            // 完了UI更新
            progressText.textContent = '完了！';
            statusText.textContent = `${result.capturedCount}個のスタンプを正常にキャプチャしました`;
            progressBar.style.width = '100%';
            progressCount.textContent = `${result.capturedCount}/${result.totalElements}`;
            openFolderBtn.disabled = false;
            
            // 成功通知
            alert(`✅ キャプチャ完了！\n${result.capturedCount}個のスタンプを保存しました。\n\n保存先: ${currentOutputFolder}`);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('開始エラー:', error);
        alert(`エラーが発生しました: ${error.message}`);
        
        // エラー時のUI復旧
        progressText.textContent = 'エラー';
        statusText.textContent = `エラー: ${error.message}`;
        progressBar.style.width = '0%';
        
    } finally {
        isCapturing = false;
        updateUI();
    }
}

// プログレス更新のコールバック関数
function updateCaptureProgress(current, total, message) {
    // パーセンテージ計算
    let percentage = 0;
    if (total > 0) {
        percentage = Math.round((current / total) * 100);
    }
    
    // UI更新
    progressBar.style.width = `${percentage}%`;
    progressCount.textContent = total > 0 ? `${current}/${total}` : '';
    
    // ステージに応じたメッセージ表示
    if (current <= 10) {
        progressText.textContent = '初期化中...';
    } else if (current <= 20) {
        progressText.textContent = 'ページ読み込み中...';
    } else if (current <= 40) {
        progressText.textContent = 'ポップアップ処理中...';
    } else if (current <= 60) {
        progressText.textContent = 'コンテンツ読み込み中...';
    } else if (current <= 70) {
        progressText.textContent = 'スタンプ検索中...';
    } else if (current < 100) {
        progressText.textContent = 'スタンプキャプチャ中...';
    } else {
        progressText.textContent = '完了！';
    }
    
    statusText.textContent = message || '';
    
    // ログ出力
    console.log(`Progress: ${current}/${total} (${percentage}%) - ${message}`);
}

async function openOutputFolder() {
    if (currentOutputFolder) {
        await ipcRenderer.invoke('open-folder', currentOutputFolder);
    }
}

function updateUI() {
    startBtn.disabled = isCapturing;
    urlInput.disabled = isCapturing;
    
    if (!isCapturing) {
        validateUrl();
    }
    
    if (isCapturing) {
        startBtn.textContent = '実行中...';
        progressBar.style.width = '0%';
        progressCount.textContent = '';
    } else {
        startBtn.textContent = '開始';
        if (progressCount.textContent === '') {
            progressText.textContent = '待機中...';
            statusText.textContent = 'URLを入力して開始してください';
        }
    }
}