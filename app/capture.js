const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

class StickerCapture {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isCapturing = false;
    }

    /**
     * URLから商品IDを抽出
     */
    extractProductId(url) {
        const match = url.match(/\/stickershop\/product\/(\d+)\//);
        return match ? match[1] : null;
    }

    /**
     * 出力フォルダを生成
     */
    generateOutputFolder(baseDir, productId) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
        return path.join(baseDir, `${productId}_${dateStr}`);
    }

    /**
     * フォルダを作成
     */
    async createFolder(folderPath) {
        try {
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            return true;
        } catch (error) {
            console.error('フォルダ作成エラー:', error);
            return false;
        }
    }

    /**
     * ブラウザを起動
     */
    async launchBrowser(browserType = 'chromium', headless = false) {
        try {
            let browserEngine;
            let launchOptions = {
                headless: headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            };

            switch (browserType) {
                case 'firefox':
                    browserEngine = firefox;
                    break;
                case 'webkit':
                    browserEngine = webkit;
                    break;
                default:
                    browserEngine = chromium;
                    // システムChromeを使用する場合のオプション
                    if (process.platform === 'darwin') {
                        const systemChromePaths = [
                            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                            '/Applications/Chromium.app/Contents/MacOS/Chromium'
                        ];
                        
                        for (const chromePath of systemChromePaths) {
                            const fs = require('fs');
                            if (fs.existsSync(chromePath)) {
                                launchOptions.executablePath = chromePath;
                                console.log(`🌐 システムChrome使用: ${chromePath}`);
                                break;
                            }
                        }
                    }
            }

            this.browser = await browserEngine.launch(launchOptions);

            this.page = await this.browser.newPage();
            
            // ページサイズを設定
            await this.page.setViewportSize({ width: 1200, height: 800 });
            
            return true;
        } catch (error) {
            console.error('ブラウザ起動エラー:', error);
            
            // Playwrightブラウザが利用できない場合、システムChromeを試行
            if (browserType === 'chromium' && !headless) {
                try {
                    console.log('💡 システムChromeでの起動を試行中...');
                    const fs = require('fs');
                    const systemChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
                    
                    if (fs.existsSync(systemChromePath)) {
                        this.browser = await chromium.launch({
                            executablePath: systemChromePath,
                            headless: headless,
                            args: ['--no-sandbox', '--disable-setuid-sandbox']
                        });
                        
                        this.page = await this.browser.newPage();
                        await this.page.setViewportSize({ width: 1200, height: 800 });
                        
                        console.log('✅ システムChromeでの起動成功');
                        return true;
                    }
                } catch (systemError) {
                    console.error('システムChrome起動エラー:', systemError);
                }
            }
            
            return false;
        }
    }

    /**
     * ページに移動
     */
    async navigateToPage(url) {
        try {
            console.log(`🌐 ページに移動中: ${url}`);
            
            // より寛容な読み込み設定
            await this.page.goto(url, { 
                waitUntil: 'domcontentloaded', 
                timeout: 60000 
            });
            
            // 追加で少し待機
            await this.page.waitForTimeout(3000);
            
            console.log('✅ ページ読み込み完了');
            return true;
        } catch (error) {
            console.error('ページナビゲーションエラー:', error);
            
            // フォールバック: より基本的な読み込み
            try {
                console.log('💡 基本的な読み込みを試行中...');
                await this.page.goto(url, { 
                    waitUntil: 'load', 
                    timeout: 45000 
                });
                await this.page.waitForTimeout(5000);
                console.log('✅ フォールバック読み込み成功');
                return true;
            } catch (fallbackError) {
                console.error('フォールバック読み込みも失敗:', fallbackError);
                return false;
            }
        }
    }

    /**
     * ポップアップの手動クローズを待機
     */
    async waitForManualPopupDismissal(waitSeconds = 30) {
        console.log('🖱️ 手動ポップアップ閉じモードを開始...');
        
        const popupIndicators = [
            ':has-text("メッセージを長押し")',
            ':has-text("リアクション")', 
            ':has-text("今すぐチェック")',
            ':has-text("閉じる")',
            ':has-text("message")',
            ':has-text("キャンペーン")',
            '[class*="popup"]',
            '[class*="modal"]',
            '[class*="overlay"]',
            '[class*="dialog"]',
            '[style*="position: fixed"]',
            '[role="dialog"]'
        ];

        // 初期ポップアップ検出
        let popupDetected = false;
        for (const indicator of popupIndicators) {
            try {
                const count = await this.page.locator(indicator).count();
                if (count > 0) {
                    popupDetected = true;
                    console.log('🖱️ ポップアップを検出しました');
                    break;
                }
            } catch (error) {
                // 無視
            }
        }

        if (!popupDetected) {
            console.log('✅ ポップアップは検出されませんでした');
            return true;
        }

        // 手動クローズ待機
        for (let remaining = waitSeconds; remaining > 0; remaining -= 5) {
            // ポップアップの状態を詳細チェック
            let popupStatus = [];
            let hasPopups = false;
            
            for (const indicator of popupIndicators.slice(0, 8)) {
                try {
                    const count = await this.page.locator(indicator).count();
                    if (count > 0) {
                        popupStatus.push(`${indicator}: ${count}個`);
                        hasPopups = true;
                    }
                } catch (error) {
                    // 無視
                }
            }

            if (hasPopups) {
                console.log(`🚨 ポップアップ検出: ${popupStatus.join(', ')}`);
                console.log(`🖱️ ポップアップを手動で閉じてください... 残り ${remaining} 秒`);
                console.log(`💡 ヒント: ×ボタンをクリックするか、ESCキーを押してください`);
            } else {
                console.log('✅ ポップアップが閉じられました（自動検出）');
                return true;
            }

            await this.page.waitForTimeout(5000);
        }

        // 追加クリーンアップ試行
        console.log('⚠️ 追加クリーンアップを実行中...');
        try {
            // ESCキーを複数回押す
            for (let i = 0; i < 3; i++) {
                await this.page.keyboard.press('Escape');
                await this.page.waitForTimeout(500);
            }

            // 安全な場所をクリック
            const safePositions = [
                { x: 10, y: 10 },
                { x: 100, y: 100 },
                { x: 10, y: 300 }
            ];

            for (const pos of safePositions) {
                try {
                    await this.page.click('body', { position: pos, timeout: 1000 });
                    await this.page.waitForTimeout(300);
                } catch (error) {
                    // 無視
                }
            }

            await this.page.waitForTimeout(2000);

            // 最終確認
            let finalCheck = false;
            for (const indicator of popupIndicators.slice(0, 8)) {
                try {
                    const count = await this.page.locator(indicator).count();
                    if (count > 0) {
                        finalCheck = true;
                        break;
                    }
                } catch (error) {
                    // 無視
                }
            }

            if (!finalCheck) {
                console.log('✅ クリーンアップ成功');
                return true;
            }
        } catch (error) {
            console.error('クリーンアップエラー:', error);
        }

        console.log('⚠️ ポップアップが残っている可能性があります');
        return false;
    }

    /**
     * ページ全体をスクロールしてコンテンツを読み込み
     */
    async ensureAllContentLoaded() {
        console.log('📜 ページをスクロールしてコンテンツを読み込み中...');
        
        try {
            const pageHeight = await this.page.evaluate(() => document.body.scrollHeight);
            const viewportHeight = await this.page.evaluate(() => window.innerHeight);
            const scrollSteps = Math.max(5, Math.floor(pageHeight / viewportHeight) + 2);

            console.log(`📜 ${scrollSteps}段階でスクロールします...`);

            for (let step = 0; step <= scrollSteps; step++) {
                const scrollPosition = Math.floor((step * pageHeight) / scrollSteps);
                await this.page.evaluate(pos => window.scrollTo(0, pos), scrollPosition);
                await this.page.waitForTimeout(800);

                // 新しいコンテンツが読み込まれたかチェック
                const newHeight = await this.page.evaluate(() => document.body.scrollHeight);
                if (newHeight > pageHeight) {
                    console.log(`📜 新しいコンテンツが読み込まれました (${newHeight}px)`);
                }
            }

            // 最上部に戻る
            await this.page.evaluate(() => window.scrollTo(0, 0));
            await this.page.waitForTimeout(1000);

            // 最終的な画像読み込み待機
            await this.page.waitForTimeout(2000);

            const finalHeight = await this.page.evaluate(() => document.body.scrollHeight);
            console.log(`✅ コンテンツ読み込み完了 (最終高さ: ${finalHeight}px)`);

            return true;
        } catch (error) {
            console.error('コンテンツ読み込みエラー:', error);
            return false;
        }
    }

    /**
     * スタンプ要素を検索
     */
    async findStickerElements() {
        console.log('🔍 スタンプ要素を検索中...');

        // より包括的なセレクター
        const selectors = [
            'img[src*="sticker_png"]',
            'img[src*="sticker.png"]',
            'img[src*="/sticker/"]',
            'img[src*="obs.line-scdn.net"]',
            'img[src*="stickershop"]',
            '.mdCMN09Image',
            '.FnStickerPreviewItem img',
            'li img[data-src*="sticker"]',
            'img[data-original*="sticker"]',
            '.sticker img',
            '[class*="Sticker"] img',
            '[class*="sticker"] img'
        ];

        let bestElements = [];
        let maxCount = 0;

        for (const selector of selectors) {
            try {
                await this.page.waitForTimeout(500);
                const count = await this.page.locator(selector).count();
                console.log(`🔍 セレクター '${selector}': ${count}個の要素`);

                if (count > 0) {
                    // 要素の詳細情報を取得
                    const elementInfo = await this.page.evaluate((sel) => {
                        const elements = document.querySelectorAll(sel);
                        const uniqueImages = new Map();

                        Array.from(elements).forEach((el, index) => {
                            const rect = el.getBoundingClientRect();
                            let src = el.src || el.dataset.src || el.dataset.original || '';
                            
                            // スタンプ画像かどうかの判定を強化
                            const isStickerImage = src.includes('sticker') || 
                                                 src.includes('obs.line') || 
                                                 src.includes('stickershop') ||
                                                 src.includes('/sticker/') ||
                                                 el.alt?.includes('sticker') ||
                                                 el.className?.includes('sticker');
                            
                            // 十分なサイズがあるかチェック
                            const hasValidSize = rect.width >= 80 && rect.height >= 80;
                            
                            if (isStickerImage && hasValidSize && rect.width > 0 && rect.height > 0) {
                                // 高解像度版のURLを探す
                                let highResSrc = src;
                                if (src.includes('/w/')) {
                                    // w/XXX を w/300 に変更
                                    highResSrc = src.replace(/\/w\/\d+/, '/w/300');
                                } else if (src.includes('=w')) {
                                    // =wXXX を =w300 に変更
                                    highResSrc = src.replace(/=w\d+/, '=w300');
                                }

                                // 重複を避けるためにsrcをキーとして使用
                                const key = highResSrc;
                                if (!uniqueImages.has(key)) {
                                    uniqueImages.set(key, {
                                        index,
                                        src: highResSrc,
                                        originalSrc: src,
                                        alt: el.alt || '',
                                        x: rect.x,
                                        y: rect.y,
                                        width: rect.width,
                                        height: rect.height,
                                        visible: true,
                                        isSticker: true,
                                        selector: sel
                                    });
                                }
                            }
                        });

                        return Array.from(uniqueImages.values());
                    }, selector);

                    if (elementInfo.length > maxCount) {
                        maxCount = elementInfo.length;
                        bestElements = elementInfo;
                        console.log(`✅ 新しい最良セレクター: '${selector}' (${elementInfo.length}個)`);
                    }
                }
            } catch (error) {
                console.error(`セレクターエラー '${selector}':`, error);
            }
        }

        if (bestElements.length > 0) {
            console.log(`🎯 最終選択: ${bestElements.length}個のユニークなスタンプ要素を発見`);
            // 位置でソート（上から下、左から右）
            bestElements.sort((a, b) => {
                if (Math.abs(a.y - b.y) < 50) {
                    return a.x - b.x;
                }
                return a.y - b.y;
            });
            return bestElements;
        }

        console.log('❌ スタンプ要素が見つかりませんでした');
        return [];
    }

    /**
     * 高解像度画像を直接ダウンロード
     */
    async downloadHighResImage(imageUrl, outputPath) {
        try {
            const response = await this.page.evaluate(async (url) => {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                return Array.from(new Uint8Array(arrayBuffer));
            }, imageUrl);

            const buffer = Buffer.from(response);
            fs.writeFileSync(outputPath, buffer);
            return true;
        } catch (error) {
            console.error(`画像ダウンロードエラー (${imageUrl}):`, error);
            return false;
        }
    }

    /**
     * スタンプ画像をキャプチャ
     */
    async captureStickerImages(elements, outputDir, onProgress = null) {
        console.log(`📸 ${elements.length}個のスタンプをキャプチャ開始...`);
        
        let capturedCount = 0;
        const totalElements = elements.length;

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            
            try {
                // 進捗報告
                if (onProgress) {
                    onProgress(i + 1, totalElements, `スタンプ ${i + 1}/${totalElements} をキャプチャ中...`);
                }

                console.log(`📸 処理中: ${element.src}`);

                // ファイル名生成
                const filename = `${String(capturedCount + 1).padStart(4, '0')}.png`;
                const filepath = path.join(outputDir, filename);

                // 高解像度画像の直接ダウンロードを試行
                let success = false;
                if (element.src && element.src.startsWith('http')) {
                    success = await this.downloadHighResImage(element.src, filepath);
                    if (success) {
                        console.log(`📥 高解像度ダウンロード成功: ${filename}`);
                        capturedCount++;
                        continue;
                    }
                }

                // ダウンロードが失敗した場合はスクリーンショットにフォールバック
                console.log(`📷 スクリーンショットにフォールバック: ${filename}`);

                // 要素を画面中央に表示
                await this.page.evaluate((y) => {
                    window.scrollTo(0, Math.max(0, y - window.innerHeight / 2));
                }, element.y);

                await this.page.waitForTimeout(500);

                // 高解像度スクリーンショット（2x拡大）
                await this.page.setViewportSize({ width: 2400, height: 1600 });
                await this.page.waitForTimeout(300);

                // 要素の現在位置を再取得
                const currentRect = await this.page.evaluate((elementData) => {
                    // srcから要素を見つける
                    const images = document.querySelectorAll('img');
                    for (let img of images) {
                        if (img.src === elementData.originalSrc || img.src === elementData.src) {
                            const rect = img.getBoundingClientRect();
                            return {
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height
                            };
                        }
                    }
                    return null;
                }, element);

                if (!currentRect || currentRect.width === 0 || currentRect.height === 0) {
                    console.log(`⚠️ 要素 ${i + 1} が見つからないためスキップ`);
                    continue;
                }

                // より大きなクリップサイズでスクリーンショット
                const minSize = 250;
                const clipWidth = Math.max(currentRect.width, minSize);
                const clipHeight = Math.max(currentRect.height, minSize);
                const clipX = Math.max(0, currentRect.x - (clipWidth - currentRect.width) / 2);
                const clipY = Math.max(0, currentRect.y - (clipHeight - currentRect.height) / 2);

                const screenshot = await this.page.screenshot({
                    clip: {
                        x: Math.round(clipX),
                        y: Math.round(clipY),
                        width: Math.round(clipWidth),
                        height: Math.round(clipHeight)
                    }
                });

                // ビューポートを元に戻す
                await this.page.setViewportSize({ width: 1200, height: 800 });

                // ファイル保存
                fs.writeFileSync(filepath, screenshot);
                capturedCount++;
                console.log(`📸 スクリーンショット完了: ${filename} (${clipWidth}x${clipHeight})`);

            } catch (error) {
                console.error(`❌ 要素 ${i + 1} のキャプチャ失敗:`, error);
                // エラーでも続行
            }
        }

        const successRate = totalElements > 0 ? (capturedCount / totalElements * 100).toFixed(1) : 0;
        console.log(`✅ キャプチャ完了: ${capturedCount}/${totalElements}個 (成功率: ${successRate}%)`);

        return capturedCount;
    }

    /**
     * メタデータを保存
     */
    async saveMetadata(outputDir, url, stickerCount, productId) {
        const metadata = {
            timestamp: new Date().toISOString(),
            source_url: url,
            product_id: productId,
            sticker_count: stickerCount,
            tool_version: '1.0.0-app'
        };

        const metadataPath = path.join(outputDir, 'meta.json');
        try {
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`📄 メタデータ保存: ${metadataPath}`);
            return true;
        } catch (error) {
            console.error('メタデータ保存エラー:', error);
            return false;
        }
    }

    /**
     * ブラウザを閉じる
     */
    async closeBrowser() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }
        } catch (error) {
            console.error('ブラウザクローズエラー:', error);
        }
    }

    /**
     * メインキャプチャプロセス
     */
    async captureStickers(url, outputBaseDir, options = {}) {
        const {
            browserType = 'chromium',
            headless = false,
            waitSeconds = 30,
            onProgress = null
        } = options;

        this.isCapturing = true;

        try {
            // 初期化
            const productId = this.extractProductId(url);
            if (!productId) {
                throw new Error('URLから商品IDを抽出できませんでした');
            }

            const outputDir = this.generateOutputFolder(outputBaseDir, productId);
            if (!await this.createFolder(outputDir)) {
                throw new Error('出力フォルダの作成に失敗しました');
            }

            // ブラウザ起動
            if (onProgress) onProgress(0, 100, 'ブラウザを起動中...');
            if (!await this.launchBrowser(browserType, headless)) {
                throw new Error('ブラウザの起動に失敗しました');
            }

            // ページに移動
            if (onProgress) onProgress(10, 100, 'ページを読み込み中...');
            if (!await this.navigateToPage(url)) {
                throw new Error('ページの読み込みに失敗しました');
            }

            // ポップアップ処理
            if (onProgress) onProgress(20, 100, 'ポップアップ確認中...');
            await this.waitForManualPopupDismissal(waitSeconds);

            // コンテンツ読み込み
            if (onProgress) onProgress(40, 100, 'コンテンツを読み込み中...');
            await this.ensureAllContentLoaded();

            // スタンプ要素検索
            if (onProgress) onProgress(60, 100, 'スタンプを検索中...');
            const elements = await this.findStickerElements();
            if (elements.length === 0) {
                throw new Error('スタンプ要素が見つかりませんでした');
            }

            // キャプチャ実行
            if (onProgress) onProgress(70, 100, 'スタンプをキャプチャ中...');
            const capturedCount = await this.captureStickerImages(elements, outputDir, onProgress);

            // メタデータ保存
            if (onProgress) onProgress(95, 100, 'メタデータを保存中...');
            await this.saveMetadata(outputDir, url, capturedCount, productId);

            // 完了
            if (onProgress) onProgress(100, 100, '完了！');

            return {
                success: true,
                outputDir,
                capturedCount,
                totalElements: elements.length,
                productId
            };

        } catch (error) {
            console.error('キャプチャエラー:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            await this.closeBrowser();
            this.isCapturing = false;
        }
    }
}

module.exports = StickerCapture;