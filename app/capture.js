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
    async waitForManualPopupDismissal(waitSeconds = 30, onProgress = null) {
        console.log('🖱️ 手動ポップアップ閉じモードを開始...');
        
        // 元のURLを保存（ページ遷移を監視するため）
        const originalUrl = this.page.url();
        console.log(`📄 元のURL: ${originalUrl}`);
        
        // バナークリックを防止するJavaScriptを注入
        await this.page.evaluate(() => {
            // 全てのリンクとクリック可能要素のクリックを無効化
            const clickableElements = document.querySelectorAll('a, button, [onclick], [class*="banner"], [class*="ad"]');
            clickableElements.forEach(element => {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🚫 クリックをブロック:', element);
                }, true);
                
                // hrefを一時的に無効化
                if (element.tagName === 'A') {
                    element.dataset.originalHref = element.href;
                    element.href = 'javascript:void(0)';
                }
            });
            
            // ページ上部のバナー要素を特別に無効化
            const banners = document.querySelectorAll('[class*="banner"], [class*="campaign"], [class*="ad"], header a');
            banners.forEach(banner => {
                banner.style.pointerEvents = 'none';
                banner.style.cursor = 'default';
            });
            
            console.log(`🚫 ${clickableElements.length}個の要素のクリックをブロックしました`);
        });
        
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
        let detectedPopups = [];
        for (const indicator of popupIndicators) {
            try {
                const count = await this.page.locator(indicator).count();
                if (count > 0) {
                    popupDetected = true;
                    detectedPopups.push(`${indicator}:${count}個`);
                    console.log(`🚨 ポップアップ検出: ${indicator} (${count}個)`);
                }
            } catch (error) {
                // 無視
            }
        }

        if (!popupDetected) {
            console.log('✅ ポップアップは検出されませんでした');
            if (onProgress) {
                onProgress(0, 0, 'ポップアップは検出されませんでした - 自動で処理を続行');
            }
            return true;
        } else {
            console.log(`🚨 ${detectedPopups.length}種類のポップアップを検出`);
            if (onProgress) {
                onProgress(0, 0, `ポップアップ検出: ${detectedPopups.join(', ')}`);
            }
        }

        // 手動クローズ待機
        for (let remaining = waitSeconds; remaining > 0; remaining -= 5) {
            // まずページ遷移をチェック（優先）
            const currentUrl = this.page.url();
            if (currentUrl !== originalUrl) {
                console.log(`🔄 ページ遷移を検出: ${currentUrl}`);
                console.log(`🔙 元のページに戻っています...`);
                if (onProgress) {
                    onProgress(0, 0, 'ページ遷移を検出 - 元のページに戻っています...');
                }
                
                try {
                    await this.page.goto(originalUrl, { waitUntil: 'networkidle' });
                    await this.page.waitForTimeout(3000);
                    console.log('✅ 元のページに正常に戻りました');
                    if (onProgress) {
                        onProgress(0, 0, '元のページに戻りました - 処理を続行');
                    }
                    return true;
                } catch (error) {
                    console.error('❌ 元のページへの復帰に失敗:', error);
                    throw new Error('ページ遷移後の復帰に失敗しました');
                }
            }

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
                console.log(`⚠️  注意: リンクをクリックしないでください（ページ遷移を防ぐため）`);
                if (onProgress) {
                    onProgress(0, 0, `ポップアップを手動で閉じてください... 残り ${remaining} 秒`);
                }
            } else {
                console.log('✅ ポップアップが閉じられました（自動検出）');
                if (onProgress) {
                    onProgress(0, 0, 'ポップアップが閉じられました - 処理を続行');
                }
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
     * デバッグ情報をファイルに出力
     */
    async writeDebugLog(message) {
        try {
            const fs = require('fs');
            const path = require('path');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const debugFile = path.join(process.cwd(), 'debug_log.txt');
            
            const logEntry = `[${new Date().toISOString()}] ${message}\n`;
            fs.appendFileSync(debugFile, logEntry);
            
            // コンソールにも出力
            console.log(message);
        } catch (error) {
            console.log(message); // ファイル出力に失敗してもコンソールには出力
        }
    }

    /**
     * スタンプ要素を検索
     */
    async findStickerElements(onProgress = null) {
        await this.writeDebugLog('🔍 スタンプ要素を検索中...');

        // まず、ページの基本情報を取得
        const pageInfo = await this.page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                bodyClasses: document.body?.className || '',
                allImages: document.querySelectorAll('img').length,
                hasStickers: document.querySelectorAll('img[src*="sticker"]').length
            };
        });
        await this.writeDebugLog('📄 ページ情報: ' + JSON.stringify(pageInfo, null, 2));

        // 詳細なDOM構造調査を実行
        await this.writeDebugLog('🔍 詳細DOM構造調査を開始...');
        await this.writeDebugLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await this.writeDebugLog('🚨 徹底的DOM調査モード - 参考画像のみ取得される問題を解決');
        await this.writeDebugLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const domAnalysis = await this.page.evaluate(() => {
            const analysis = {
                containerStructure: [],
                stickersByArea: {},
                suspiciousElements: [],
                rawImageData: [],
                cssClassAnalysis: {},
                potentialMainElements: [],
                emergencyMainSearch: []
            };

            // 🚨 緊急メインエリア探索 🚨
            console.log('🚨 緊急メインエリア探索を開始...');
            
            // 1. より幅広いセレクターでメインスタンプを探索（実際のスタンプ画像重視）
            const emergencySelectors = [
                // 実際のスタンプ画像を優先（main.pngではない）
                'img[src*="sticker"]:not([src*="main.png"])',
                'img[src*="obs.line"]:not([src*="main.png"])',
                'ul img[src*="sticker"]:not([src*="main.png"])',
                'li img[src*="sticker"]:not([src*="main.png"])',
                
                // サイズ指定でフィルタ（実際のスタンプは特定サイズ）
                'img[src*="sticker"][src*="w/96"]',
                'img[src*="sticker"][src*="w/180"]', 
                'img[src*="sticker"][src*="w/230"]',
                'img[src*="sticker"][src*="w/300"]',
                
                // LINE STOREの実際のスタンプパターン
                'img[src*="stickershop"]:not([src*="main.png"])',
                'img[src*="obs.line-scdn.net"]:not([src*="main.png"])',
                
                // クラスベース（サムネイル除外）
                '[class*="sticker"] img:not([src*="main.png"])',
                '[class*="Sticker"] img:not([src*="main.png"])',
                '[class*="mdCMN"] img[src*="sticker"]:not([src*="main.png"])',
                '[class*="mdIco"] img[src*="sticker"]:not([src*="main.png"])',
                
                // フォールバック（全てのスタンプ画像）
                'img[src*="sticker"]',
                'img[src*="obs.line"]'
            ];
            
            emergencySelectors.forEach((selector, index) => {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`🔍 緊急セレクター ${index + 1}: "${selector}" -> ${elements.length}個`);
                        elements.forEach((el, i) => {
                            if (i < 5) { // 最初の5個のみ記録
                                const rect = el.getBoundingClientRect();
                                analysis.emergencyMainSearch.push({
                                    selector,
                                    index: i,
                                    src: el.src,
                                    position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                                    className: el.className || '',
                                    parentClassName: el.parentElement?.className || '',
                                    grandParentClassName: el.parentElement?.parentElement?.className || ''
                                });
                            }
                        });
                    }
                } catch (error) {
                    console.log(`緊急セレクターエラー ${selector}:`, error);
                }
            });

            // まず、ページの全画像を徹底調査
            console.log('🔍 RAW画像データの収集中...');
            const allImages = document.querySelectorAll('img');
            allImages.forEach((img, index) => {
                if (img.src && (img.src.includes('sticker') || img.src.includes('obs.line'))) {
                    const rect = img.getBoundingClientRect();
                    const parentHierarchy = [];
                    let current = img.parentElement;
                    
                    // 親要素の階層を10レベルまで記録
                    for (let i = 0; i < 10 && current; i++) {
                        parentHierarchy.push({
                            level: i,
                            tagName: current.tagName,
                            className: current.className || '',
                            id: current.id || '',
                            textContent: current.textContent ? current.textContent.substring(0, 30) : ''
                        });
                        current = current.parentElement;
                    }
                    
                    analysis.rawImageData.push({
                        index,
                        src: img.src,
                        alt: img.alt || '',
                        className: img.className || '',
                        id: img.id || '',
                        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                        parentHierarchy,
                        immediateParentClass: img.parentElement?.className || '',
                        immediateParentTag: img.parentElement?.tagName || '',
                        isVisible: rect.width > 0 && rect.height > 0
                    });
                }
            });

            // CSSクラス使用頻度の分析
            console.log('🔍 CSSクラス分析中...');
            const allElements = document.querySelectorAll('*[class]');
            allElements.forEach(el => {
                const classes = el.className.split(' ');
                classes.forEach(cls => {
                    if (cls && cls.length > 0) {
                        if (!analysis.cssClassAnalysis[cls]) {
                            analysis.cssClassAnalysis[cls] = {
                                count: 0,
                                hasStickerImages: false,
                                elements: []
                            };
                        }
                        analysis.cssClassAnalysis[cls].count++;
                        
                        const stickerCount = el.querySelectorAll('img[src*="sticker"]').length;
                        if (stickerCount > 0) {
                            analysis.cssClassAnalysis[cls].hasStickerImages = true;
                            analysis.cssClassAnalysis[cls].elements.push({
                                tagName: el.tagName,
                                stickerCount,
                                rect: el.getBoundingClientRect()
                            });
                        }
                    }
                });
            });

            // 主要コンテナの分析（強化版）
            console.log('🔍 コンテナ構造分析中...');
            const containers = document.querySelectorAll('div, section, ul, main, article, li');
            containers.forEach((container, index) => {
                const className = container.className || 'no-class';
                const id = container.id || 'no-id';
                const stickerImages = container.querySelectorAll('img[src*="sticker"]');
                const allImages = container.querySelectorAll('img');
                
                if (stickerImages.length > 0) {
                    const rect = container.getBoundingClientRect();
                    const textContent = container.textContent || '';
                    
                    // より詳細な分析
                    const containerData = {
                        index,
                        tagName: container.tagName,
                        className,
                        id,
                        stickerCount: stickerImages.length,
                        allImageCount: allImages.length,
                        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                        textContent: textContent.substring(0, 200),
                        hasListStructure: container.tagName === 'UL' || container.tagName === 'OL',
                        childListItems: container.querySelectorAll('li').length,
                        estimatedType: 'unknown'
                    };
                    
                    // エリア推定ロジック強化
                    if (textContent.includes('サンプル') || textContent.includes('sample') || className.includes('sample')) {
                        containerData.estimatedType = 'sample';
                    } else if (textContent.includes('関連') || textContent.includes('related') || className.includes('related')) {
                        containerData.estimatedType = 'related';
                    } else if (textContent.includes('他の作品') || textContent.includes('おすすめ') || className.includes('recommend')) {
                        containerData.estimatedType = 'other-works';
                    } else if (className.includes('mdCMN09') || className.includes('MdIco01') || className.includes('sticker')) {
                        containerData.estimatedType = 'main-candidate';
                    } else if (stickerImages.length >= 20) {
                        containerData.estimatedType = 'main-candidate-by-count';
                    } else if (rect.y < 400) {
                        containerData.estimatedType = 'header-area';
                    } else {
                        containerData.estimatedType = 'unknown-large';
                    }
                    
                    analysis.containerStructure.push(containerData);
                    
                    // メイン候補の特別記録
                    if (containerData.estimatedType.includes('main-candidate')) {
                        analysis.potentialMainElements.push(containerData);
                    }
                }
            });

            // スタンプ画像の詳細分析（エリア別）
            const allStickerImages = document.querySelectorAll('img[src*="sticker"]');
            allStickerImages.forEach((img, index) => {
                const rect = img.getBoundingClientRect();
                let parentChain = [];
                let currentParent = img.parentElement;
                
                // 親要素を5レベルまで追跡
                for (let i = 0; i < 5 && currentParent; i++) {
                    parentChain.push({
                        tagName: currentParent.tagName,
                        className: currentParent.className || 'no-class',
                        id: currentParent.id || 'no-id'
                    });
                    currentParent = currentParent.parentElement;
                }

                // エリア分類の試行（徹底的に調査）
                let areaType = 'unknown';
                const parentText = img.closest('div, section, article')?.textContent?.toLowerCase() || '';
                const parentClasses = parentChain.map(p => p.className).join(' ').toLowerCase();
                
                // より詳細な分類ロジック
                if (parentText.includes('サンプル') || parentText.includes('sample') || parentText.includes('preview')) {
                    areaType = 'sample';
                } else if (parentText.includes('関連') || parentText.includes('related') || parentText.includes('recommend') || parentText.includes('おすすめ')) {
                    areaType = 'related';
                } else if (parentText.includes('他の作品') || parentText.includes('other') || parentText.includes('more') || parentText.includes('もっと見る')) {
                    areaType = 'other-works';
                } else if (parentClasses.includes('mdcmn09') || parentClasses.includes('stickerlist') || parentClasses.includes('mdico01')) {
                    areaType = 'main-candidate';
                } else if (rect.y < 300) {
                    areaType = 'header-area';
                } else if (rect.x > window.innerWidth * 0.7) {
                    areaType = 'sidebar';
                } else if (rect.y > 3000) {
                    // Y位置3000以下は関連・推奨エリアの可能性が高い
                    areaType = 'bottom-related';
                } else if (rect.y >= 800 && rect.y <= 2500 && rect.x < window.innerWidth * 0.65) {
                    // メインエリアの可能性が高い位置範囲
                    areaType = 'potential-main';
                } else {
                    // 詳細調査のためのサブカテゴリ
                    if (rect.y < 800) {
                        areaType = 'upper-unknown';
                    } else if (rect.y < 1500) {
                        areaType = 'middle-unknown';
                    } else if (rect.y < 2500) {
                        areaType = 'lower-middle-unknown';
                    } else {
                        areaType = 'bottom-unknown';
                    }
                }

                const stickerInfo = {
                    index,
                    src: img.src,
                    alt: img.alt || 'no-alt',
                    position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                    parentChain,
                    areaType,
                    nearbyText: parentText.substring(0, 50)
                };

                if (!analysis.stickersByArea[areaType]) {
                    analysis.stickersByArea[areaType] = [];
                }
                analysis.stickersByArea[areaType].push(stickerInfo);
            });

            return analysis;
        });

        // 徹底的分析結果の詳細表示
        await this.writeDebugLog('\n🔥 徹底的DOM分析結果 🔥');
        await this.writeDebugLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // 🚨 緊急メインエリア探索結果の表示 🚨
        await this.writeDebugLog('\n🚨 緊急メインエリア探索結果:');
        if (domAnalysis.emergencyMainSearch.length > 0) {
            await this.writeDebugLog(`✅ 緊急探索で ${domAnalysis.emergencyMainSearch.length}個の候補を発見!`);
            
            // セレクター別の統計
            const selectorStats = {};
            domAnalysis.emergencyMainSearch.forEach(item => {
                if (!selectorStats[item.selector]) {
                    selectorStats[item.selector] = 0;
                }
                selectorStats[item.selector]++;
            });
            
            Object.entries(selectorStats).forEach(([selector, count]) => {
                this.writeDebugLog(`  📍 "${selector}": ${count}個`);
            });
            
            // 詳細情報（最初の10個）
            await this.writeDebugLog('\n緊急探索詳細 (最初の10個):');
            domAnalysis.emergencyMainSearch.slice(0, 10).forEach((item, i) => {
                this.writeDebugLog(`  ${i + 1}. ${item.src.substring(item.src.lastIndexOf('/') + 1)} (Y:${Math.round(item.position.y)})`);
                this.writeDebugLog(`     セレクター: "${item.selector}"`);
                this.writeDebugLog(`     親クラス: "${item.parentClassName}"`);
                this.writeDebugLog(`     祖父母クラス: "${item.grandParentClassName}"`);
            });
        } else {
            await this.writeDebugLog('❌ 緊急探索でもメインスタンプが見つかりませんでした');
        }

        // UI経由でも主要情報を表示
        if (onProgress) {
            onProgress(0, 0, `DOM分析完了: ${domAnalysis.rawImageData.length}個の画像を発見, 緊急探索: ${domAnalysis.emergencyMainSearch.length}個`);
        }
        
        // 1. RAW画像データの詳細表示
        await this.writeDebugLog(`\n📸 RAW画像データ分析: ${domAnalysis.rawImageData.length}個のスタンプ関連画像`);
        domAnalysis.rawImageData.forEach((img, i) => {
            console.log(`\n  📷 画像 ${i + 1}: ${img.src.substring(img.src.lastIndexOf('/') + 1)}`);
            console.log(`     位置: (${Math.round(img.position.x)}, ${Math.round(img.position.y)}) サイズ: ${Math.round(img.position.width)}x${Math.round(img.position.height)}`);
            console.log(`     可視: ${img.isVisible}, ALT: "${img.alt}", クラス: "${img.className}"`);
            console.log(`     直上親: ${img.immediateParentTag}.${img.immediateParentClass}`);
            console.log(`     親階層:`);
            img.parentHierarchy.slice(0, 5).forEach((parent, j) => {
                console.log(`       L${j}: ${parent.tagName}.${parent.className} "${parent.textContent}"`);
            });
        });

        // 2. CSSクラス分析（スタンプを含むクラスのみ）
        console.log(`\n🎨 スタンプ含有CSSクラス分析:`);
        const stickerClasses = Object.entries(domAnalysis.cssClassAnalysis)
            .filter(([cls, data]) => data.hasStickerImages)
            .sort((a, b) => b[1].count - a[1].count);
        
        stickerClasses.slice(0, 10).forEach(([className, data]) => {
            console.log(`  📋 .${className}: ${data.count}個の要素, ${data.elements.length}個がスタンプ含有`);
            data.elements.forEach((el, i) => {
                if (i < 2) { // 最初の2個のみ表示
                    console.log(`    └─ ${el.tagName}: ${el.stickerCount}個のスタンプ (Y:${Math.round(el.rect.y)})`);
                }
            });
        });

        // 3. コンテナ構造分析
        console.log(`\n📦 コンテナ構造分析: ${domAnalysis.containerStructure.length}個`);
        domAnalysis.containerStructure
            .sort((a, b) => b.stickerCount - a.stickerCount) // スタンプ数でソート
            .forEach((container, i) => {
                console.log(`\n  📦 コンテナ ${i + 1}: ${container.tagName}.${container.className}`);
                console.log(`     タイプ: ${container.estimatedType}, スタンプ: ${container.stickerCount}個`);
                console.log(`     位置: Y=${Math.round(container.position.y)}, サイズ: ${Math.round(container.position.width)}x${Math.round(container.position.height)}`);
                console.log(`     リスト構造: ${container.hasListStructure}, 子li: ${container.childListItems}個`);
                console.log(`     テキスト: "${container.textContent.substring(0, 100)}"`);
            });

        // 4. メイン候補の特別表示
        console.log(`\n🎯 メイン候補要素: ${domAnalysis.potentialMainElements.length}個`);
        domAnalysis.potentialMainElements.forEach((el, i) => {
            console.log(`  🎯 候補 ${i + 1}: ${el.tagName}.${el.className} (${el.stickerCount}個)`);
            console.log(`     タイプ: ${el.estimatedType}`);
        });

        // 5. エリア別スタンプ分布
        console.log('\n🏷️ エリア別スタンプ分布:');
        Object.entries(domAnalysis.stickersByArea).forEach(([areaType, stickers]) => {
            console.log(`\n  📍 ${areaType}: ${stickers.length}個`);
            stickers.slice(0, 5).forEach((sticker, i) => {
                console.log(`    ${i + 1}. ${sticker.src.substring(sticker.src.lastIndexOf('/') + 1)} (Y:${Math.round(sticker.position.y)})`);
                console.log(`       親要素: ${sticker.parentChain[0]?.className}`);
                console.log(`       近傍テキスト: "${sticker.nearbyText}"`);
            });
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // DOM分析結果に基づいてメインエリアを特定
        console.log('\n🎯 メインスタンプエリア特定中...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // 🚨 34個の参考画像問題の原因特定 🚨
        await this.writeDebugLog('\n🚨 問題調査: 現在取得されている34個の画像の詳細分析');
        
        // すべてのスタンプ画像をY位置でソートして、どこから来ているかを調査
        const allFoundStickers = Object.values(domAnalysis.stickersByArea).flat();
        allFoundStickers.sort((a, b) => a.position.y - b.position.y);
        
        // UI経由で主要統計を表示
        if (onProgress) {
            onProgress(0, 0, `画像分析完了: 合計${allFoundStickers.length}個のスタンプ画像を発見`);
        }
        
        await this.writeDebugLog(`\n📍 発見されたスタンプの位置別詳細 (${allFoundStickers.length}個):`);
        for (let i = 0; i < Math.min(10, allFoundStickers.length); i++) {
            const sticker = allFoundStickers[i];
            await this.writeDebugLog(`  📷 ${i + 1}. Y:${Math.round(sticker.position.y)} - ${sticker.areaType} - ${sticker.src.substring(sticker.src.lastIndexOf('/') + 1)}`);
            await this.writeDebugLog(`       親: ${sticker.parentChain[0]?.className} - "${sticker.nearbyText}"`);
        }

        // エリア別の詳細分析
        await this.writeDebugLog(`\n📊 エリア別統計:`);
        const areaStats = [];
        Object.entries(domAnalysis.stickersByArea).forEach(([areaType, stickers]) => {
            if (stickers.length > 0) {
                const avgY = stickers.reduce((sum, s) => sum + s.position.y, 0) / stickers.length;
                const statLine = `  📍 ${areaType}: ${stickers.length}個 (平均Y位置: ${Math.round(avgY)})`;
                areaStats.push(statLine);
                this.writeDebugLog(statLine);
            }
        });

        // UI経由でエリア統計を表示
        if (onProgress && areaStats.length > 0) {
            onProgress(0, 0, `エリア分析: ${areaStats.length}個のエリアでスタンプを検出`);
        }

        // メインエリア候補をスコアリング（改良版 + 緊急探索統合）
        let mainAreaCandidates = [];
        
        await this.writeDebugLog('\n🎯 メインエリア候補の特定開始...');
        
        // 🚨 緊急探索結果を最優先で確認 🚨
        if (domAnalysis.emergencyMainSearch.length > 0) {
            await this.writeDebugLog('🚨 緊急探索結果を使用してメインエリアを特定...');
            
            // 緊急探索結果を適切な形式に変換
            const emergencyElements = domAnalysis.emergencyMainSearch.map((item, index) => {
                let highResSrc = item.src;
                if (item.src.includes('/w/')) {
                    highResSrc = item.src.replace(/\/w\/\d+/, '/w/300');
                } else if (item.src.includes('=w')) {
                    highResSrc = item.src.replace(/=w\d+/, '=w300');
                }

                return {
                    index,
                    src: highResSrc,
                    originalSrc: item.src,
                    alt: '',
                    x: item.position.x,
                    y: item.position.y,
                    width: item.position.width,
                    height: item.position.height,
                    visible: true,
                    isSticker: true,
                    selector: item.selector,
                    area: 'emergency-main',
                    className: item.className,
                    parentClassName: item.parentClassName,
                    grandParentClassName: item.grandParentClassName
                };
            });

            // 位置とサイズ、ファイル名で適切なメインスタンプをフィルタ
            const validMainStickers = emergencyElements.filter(el => {
                // main.png (サムネイル) を除外
                const isNotThumbnail = !el.originalSrc.includes('main.png');
                
                // 実際のスタンプファイル名パターンをチェック
                const hasValidStickerPattern = el.originalSrc.includes('sticker') || 
                                             el.originalSrc.includes('obs.line') ||
                                             /\/\d+\.png/.test(el.originalSrc) || // 数字.png パターン
                                             /sticker_\d+/.test(el.originalSrc); // sticker_数字 パターン
                
                // サイズチェック（より寛容に）
                const hasValidSize = el.width >= 50 && el.height >= 50;
                
                // Y位置チェック（メインコンテンツエリア）
                const isInMainContentArea = el.y > 600 && el.y < 4000; // より広い範囲
                
                // X位置チェック（サイドバー外）
                const isNotInSidebar = el.x < window.innerWidth * 0.8;
                
                console.log(`🔍 フィルタチェック: ${el.originalSrc.substring(el.originalSrc.lastIndexOf('/') + 1)}`);
                console.log(`  - サムネイルでない: ${isNotThumbnail}`);
                console.log(`  - スタンプパターン: ${hasValidStickerPattern}`);
                console.log(`  - サイズ: ${hasValidSize} (${el.width}x${el.height})`);
                console.log(`  - Y位置: ${isInMainContentArea} (Y:${el.y})`);
                console.log(`  - サイドバー外: ${isNotInSidebar} (X:${el.x})`);
                
                return isNotThumbnail && 
                       hasValidStickerPattern && 
                       hasValidSize && 
                       isInMainContentArea && 
                       isNotInSidebar;
            });

            if (validMainStickers.length > 0) {
                mainAreaCandidates = validMainStickers;
                await this.writeDebugLog(`✅ 緊急探索で ${validMainStickers.length}個の有効なメインスタンプを特定!`);
                if (onProgress) {
                    onProgress(0, 0, `緊急探索成功: ${validMainStickers.length}個のメインスタンプを発見`);
                }
            } else {
                await this.writeDebugLog('⚠️ 緊急探索結果をフィルタしたが、有効なメインスタンプが見つからない');
            }
        }
        
        // 緊急探索で見つからない場合の従来ロジック
        if (mainAreaCandidates.length === 0) {
            await this.writeDebugLog('🔄 従来のエリア分類ロジックにフォールバック...');
            
            // 優先順位でエリアを確認
            const priorityAreas = [
                'main-candidate',
                'potential-main', 
                'middle-unknown',
                'lower-middle-unknown',
                'upper-unknown'
            ];
        
            for (const areaType of priorityAreas) {
                if (domAnalysis.stickersByArea[areaType] && domAnalysis.stickersByArea[areaType].length > 0) {
                    mainAreaCandidates = domAnalysis.stickersByArea[areaType];
                    await this.writeDebugLog(`✅ ${areaType} エリアで ${mainAreaCandidates.length}個のスタンプを発見 - メイン候補として採用`);
                    if (onProgress) {
                        onProgress(0, 0, `メインエリア特定: ${areaType} (${mainAreaCandidates.length}個)`);
                    }
                    break;
                }
            }
        }

        // メインエリアが見つからない場合の詳細調査
        if (mainAreaCandidates.length === 0) {
            console.log('⚠️ メインエリア候補が見つからないため、より詳細な調査を実行...');
            
            // 位置ベースでのメインエリア推定
            const allStickers = Object.values(domAnalysis.stickersByArea).flat();
            
            // 中央エリア（サイドバーでない）で、ヘッダーエリアでもない画像を探す
            const centralStickers = allStickers.filter(sticker => {
                return sticker.position.x < window.innerWidth * 0.7 && // サイドバーでない
                       sticker.position.y > 300 && // ヘッダーエリアでない
                       sticker.position.width >= 80 && // 十分なサイズ
                       sticker.position.height >= 80;
            });
            
            console.log(`📍 位置ベース推定: ${centralStickers.length}個の中央エリアスタンプを発見`);
            
            if (centralStickers.length > 0) {
                mainAreaCandidates = centralStickers;
            }
        }

        // 段階的にセレクターを試行（メインエリア重視）
        const selectorGroups = [
            {
                name: 'LINE STORE メインエリア専用',
                selectors: [
                    '.mdCMN09Ul .mdCMN09Li .mdCMN09Image',
                    '.mdCMN09Ul li img[src*="sticker"]',
                    '.MdIco01Ul .mdCMN09Li img',
                    '.MdIco01Ul li img[src*="sticker"]'
                ]
            },
            {
                name: 'メインコンテンツ領域',
                selectors: [
                    'main img[src*="sticker"]',
                    '.main-content img[src*="sticker"]',
                    '#main img[src*="sticker"]',
                    'ul[class*="mdCMN09"] li img[src*="sticker"]'
                ]
            },
            {
                name: '分析結果ベース選択',
                selectors: ['ANALYSIS_BASED'] // 特別なマーカー
            }
        ];

        let bestElements = [];
        let maxCount = 0;
        let foundGroupName = '';

        // 段階的にセレクターグループを試行
        for (const group of selectorGroups) {
            console.log(`🎯 ${group.name}で検索中...`);
            
            for (const selector of group.selectors) {
                try {
                    // 分析結果ベースの特別処理
                    if (selector === 'ANALYSIS_BASED') {
                        console.log(`  🔍 分析結果ベース選択: ${mainAreaCandidates.length}個の候補`);
                        
                        if (mainAreaCandidates.length > 0) {
                            // DOM分析で特定したメインエリアの画像を直接使用
                            const elementInfo = mainAreaCandidates.map((candidate, index) => {
                                // 高解像度版のURLを探す
                                let highResSrc = candidate.src;
                                if (candidate.src.includes('/w/')) {
                                    highResSrc = candidate.src.replace(/\/w\/\d+/, '/w/300');
                                } else if (candidate.src.includes('=w')) {
                                    highResSrc = candidate.src.replace(/=w\d+/, '=w300');
                                }

                                return {
                                    index,
                                    src: highResSrc,
                                    originalSrc: candidate.src,
                                    alt: candidate.alt || '',
                                    x: candidate.position.x,
                                    y: candidate.position.y,
                                    width: candidate.position.width,
                                    height: candidate.position.height,
                                    visible: true,
                                    isSticker: true,
                                    selector: 'ANALYSIS_BASED',
                                    area: 'main-verified',
                                    areaType: candidate.areaType,
                                    parentChain: candidate.parentChain
                                };
                            });

                            console.log(`📊 分析ベース選択: ${elementInfo.length}個のメインスタンプを特定`);

                            if (elementInfo.length > maxCount) {
                                maxCount = elementInfo.length;
                                bestElements = elementInfo;
                                foundGroupName = group.name;
                                console.log(`✅ 分析ベース選択が最良候補 (${elementInfo.length}個)`);
                            }
                        }
                        continue;
                    }

                    await this.page.waitForTimeout(300);
                    const count = await this.page.locator(selector).count();
                    console.log(`  🔍 '${selector}': ${count}個`);

                    if (count > 0) {
                        // 要素の詳細情報を取得（強化された除外ロジック付き）
                        const elementInfo = await this.page.evaluate((sel) => {
                        const elements = document.querySelectorAll(sel);
                        const uniqueImages = new Map();

                        Array.from(elements).forEach((el, index) => {
                            // 除外エリアの厳密チェック
                            let parentElement = el.parentElement;
                            let isInExcludedArea = false;
                            
                            // 親要素を7レベルまでチェック（除外エリア判定）
                            for (let i = 0; i < 7 && parentElement; i++) {
                                const className = (parentElement.className || '').toLowerCase();
                                const id = (parentElement.id || '').toLowerCase();
                                const textContent = (parentElement.textContent || '').toLowerCase();
                                
                                // 除外するエリアの判定を強化
                                if (className.includes('related') || 
                                    className.includes('recommend') || 
                                    className.includes('similar') ||
                                    className.includes('sample') ||
                                    className.includes('preview') ||
                                    className.includes('example') ||
                                    className.includes('sidebar') ||
                                    className.includes('aside') ||
                                    id.includes('related') ||
                                    id.includes('recommend') ||
                                    id.includes('sample') ||
                                    id.includes('sidebar') ||
                                    textContent.includes('サンプル') ||
                                    textContent.includes('関連') ||
                                    textContent.includes('他の作品') ||
                                    textContent.includes('おすすめ')) {
                                    isInExcludedArea = true;
                                    break;
                                }
                                parentElement = parentElement.parentElement;
                            }

                            if (isInExcludedArea) {
                                return; // 除外エリアの画像はスキップ
                            }

                            const rect = el.getBoundingClientRect();
                            let src = el.src || el.dataset.src || el.dataset.original || '';
                            
                            // メインスタンプの判定条件を厳密化
                            const isStickerImage = src.includes('sticker') && 
                                                 (src.includes('obs.line') || src.includes('stickershop'));
                            
                            // 位置による除外（メインエリア外をフィルタ）
                            const isInMainArea = rect.y > 250 && // ヘッダー下
                                               rect.x < window.innerWidth * 0.75 && // サイドバー外
                                               rect.y < window.innerHeight * 1.5; // 無限スクロール上限
                            
                            // 十分なサイズがあるかチェック
                            const hasValidSize = rect.width >= 80 && rect.height >= 80;
                            
                            if (isStickerImage && hasValidSize && isInMainArea && rect.width > 0 && rect.height > 0) {
                                // 高解像度版のURLを探す
                                let highResSrc = src;
                                if (src.includes('/w/')) {
                                    highResSrc = src.replace(/\/w\/\d+/, '/w/300');
                                } else if (src.includes('=w')) {
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
                                        selector: sel,
                                        area: 'main-filtered'
                                    });
                                }
                            }
                        });

                        return Array.from(uniqueImages.values());
                    }, selector);

                        console.log(`📊 セレクター '${selector}': ${elementInfo.length}個のメインスタンプを発見`);

                        if (elementInfo.length > maxCount) {
                            maxCount = elementInfo.length;
                            bestElements = elementInfo;
                            foundGroupName = group.name;
                            console.log(`✅ 新しい最良セレクター: '${selector}' (${elementInfo.length}個)`);
                        }
                    }
                } catch (error) {
                    console.error(`セレクターエラー '${selector}':`, error);
                }
            }
            
            // 十分な数のメインスタンプが見つかったら終了
            if (bestElements.length >= 10 && bestElements[0]?.area?.includes('main')) {
                console.log(`🎯 ${group.name}で十分な数(${bestElements.length}個)のメインスタンプを発見、検索終了`);
                break;
            }
        }

        if (bestElements.length > 0) {
            console.log(`🎯 最終選択: ${bestElements.length}個のスタンプ要素を発見 (${foundGroupName})`);
            console.log(`📍 位置範囲: Y軸 ${Math.min(...bestElements.map(e => e.y))} - ${Math.max(...bestElements.map(e => e.y))}`);
            
            // 最初の5個の詳細を表示
            console.log('📋 発見されたスタンプ（最初の5個）:');
            bestElements.slice(0, 5).forEach((el, i) => {
                console.log(`  ${i + 1}. ${el.src} (${el.width}x${el.height}, Y:${el.y})`);
            });
            
            // 位置でソート（上から下、左から右）
            bestElements.sort((a, b) => {
                if (Math.abs(a.y - b.y) < 50) {
                    return a.x - b.x;
                }
                return a.y - b.y;
            });
            return bestElements;
        }

        // デバッグ: ページ上のすべての画像を調査
        console.log('🔍 デバッグ: ページ上のすべての画像を調査中...');
        const allImages = await this.page.evaluate(() => {
            const images = document.querySelectorAll('img');
            return Array.from(images).map((img, index) => ({
                index,
                src: img.src || 'no-src',
                alt: img.alt || 'no-alt',
                className: img.className || 'no-class',
                parentClassName: img.parentElement?.className || 'no-parent-class',
                width: img.getBoundingClientRect().width,
                height: img.getBoundingClientRect().height,
                y: img.getBoundingClientRect().y
            })).filter(img => 
                img.src.includes('sticker') || 
                img.src.includes('obs.line') ||
                img.alt.includes('sticker') ||
                img.className.includes('sticker')
            );
        });

        console.log(`🔍 デバッグ: ${allImages.length}個のスタンプ関連画像を発見:`);
        allImages.forEach((img, i) => {
            console.log(`  ${i + 1}. ${img.src} (${img.width}x${img.height}, Y:${img.y})`);
            console.log(`     クラス: ${img.className}`);
            console.log(`     親クラス: ${img.parentClassName}`);
        });

        console.log('❌ メインスタンプ要素が見つかりませんでした');
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

        // デバッグファイルを初期化
        try {
            const fs = require('fs');
            const path = require('path');
            const debugFile = path.join(process.cwd(), 'debug_log.txt');
            fs.writeFileSync(debugFile, `=== LINE Sticker Capture Debug Log ===\n開始時刻: ${new Date().toISOString()}\nURL: ${url}\n\n`);
        } catch (error) {
            console.log('デバッグファイル初期化エラー:', error);
        }

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
            await this.waitForManualPopupDismissal(waitSeconds, onProgress);

            // コンテンツ読み込み
            if (onProgress) onProgress(40, 100, 'コンテンツを読み込み中...');
            await this.ensureAllContentLoaded();

            // スタンプ要素検索
            if (onProgress) onProgress(60, 100, 'スタンプを検索中...');
            const elements = await this.findStickerElements(onProgress);
            if (elements.length === 0) {
                throw new Error('スタンプ要素が見つかりませんでした - デバッグログを確認してください (debug_log.txt)');
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