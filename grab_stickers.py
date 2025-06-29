#!/usr/bin/env python3
"""
LINE STORE Sticker Capture Tool

A CLI tool that captures individual sticker images from a LINE STORE product page
and saves them as PNG screenshots for private viewing only.

Author: ekumaki
License: MIT (code only - sticker images remain copyrighted by LINE/creators)
"""

import argparse
import json
import logging
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse, parse_qs

from playwright.sync_api import sync_playwright, Page, Browser, TimeoutError as PlaywrightTimeoutError

from line_selectors import STICKER_SELECTORS, STICKER_XPATH_SELECTORS
from config import POPUP_CLOSE_SELECTORS, POPUP_DISMISS_TIMEOUT_MS, SCREENSHOT_TIMEOUT_MS, SCROLL_TIMEOUT_MS

__version__ = "1.0.0"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def extract_product_id(url: str) -> Optional[str]:
    """Extract product ID from LINE STORE URL."""
    try:
        # Pattern: https://store.line.me/stickershop/product/{product_id}/ja
        match = re.search(r'/stickershop/product/(\d+)/', url)
        if match:
            return match.group(1)
        return None
    except Exception as e:
        logger.error(f"Error extracting product ID: {e}")
        return None


def setup_output_directory(out_dir: Optional[str], product_id: str) -> Path:
    """Setup and create output directory."""
    if out_dir:
        output_path = Path(out_dir)
    else:
        output_path = Path("output") / product_id
    
    output_path.mkdir(parents=True, exist_ok=True)
    logger.info(f"Output directory: {output_path.absolute()}")
    return output_path


def wait_for_manual_popup_dismissal(page: Page, wait_seconds: int, original_url: str = "") -> bool:
    """
    Wait for user to manually dismiss popup in GUI mode.
    Returns True if popup appears to be dismissed, False otherwise.
    """
    logger.info("🖱️  MANUAL POPUP DISMISSAL MODE")
    logger.info("🖱️  Please manually close any popups in the browser window")
    logger.info(f"🖱️  Waiting {wait_seconds} seconds for you to dismiss popups...")
    logger.info("🖱️  Close any advertising banners, modals, or popups you see")
    logger.info("🖱️  IMPORTANT: Make sure ALL popups are completely closed!")
    
    # Enhanced popup detection patterns
    popup_indicators = [
        # Text-based indicators
        ':has-text("メッセージを長押し")',
        ':has-text("リアクション")', 
        ':has-text("今すぐチェック")',
        ':has-text("閉じる")',
        ':has-text("message")',
        ':has-text("キャンペーン")',
        ':has-text("広告")',
        ':has-text("通知")',
        
        # Class-based indicators
        '[class*="popup"]',
        '[class*="modal"]',
        '[class*="overlay"]',
        '[class*="dialog"]',
        '[class*="banner"]',
        '[class*="promotion"]',
        '[class*="advertisement"]',
        
        # Position-based indicators (fixed/absolute positioning often indicates overlays)
        '[style*="position: fixed"]',
        '[style*="position: absolute"][style*="z-index"]',
        
        # Common popup/modal patterns
        '[role="dialog"]',
        '[role="alertdialog"]',
        '[aria-modal="true"]',
        '.popup',
        '.modal',
        '.overlay',
        '.dialog',
    ]
    
    initial_popup_detected = False
    for indicator in popup_indicators:
        try:
            if page.locator(indicator).count() > 0:
                initial_popup_detected = True
                logger.info(f"🖱️  Popup detected: Please close it manually")
                break
        except:
            continue
    
    if not initial_popup_detected:
        logger.info("✅ No popup detected - proceeding")
        return True
    
    # Wait for manual dismissal with progress updates
    for remaining in range(wait_seconds, 0, -5):
        logger.info(f"🖱️  {remaining} seconds remaining... (close popups now)")
        page.wait_for_timeout(5000)  # 5 second intervals
        
        # Check if popup is gone
        popup_still_exists = False
        for indicator in popup_indicators:
            try:
                if page.locator(indicator).count() > 0:
                    popup_still_exists = True
                    break
            except:
                continue
        
        if not popup_still_exists:
            logger.info("✅ Popup appears to be dismissed - continuing")
            return True
    
    # Final check
    popup_still_exists = False
    for indicator in popup_indicators:
        try:
            if page.locator(indicator).count() > 0:
                popup_still_exists = True
                logger.warning(f"⚠️  Popup still detected: {indicator}")
                break
        except:
            continue
    
    if popup_still_exists:
        logger.warning("⚠️  Popup still visible after manual dismissal")
        logger.warning("⚠️  Performing additional cleanup attempts...")
        
        # Try additional cleanup
        try:
            # Press ESC multiple times
            for _ in range(3):
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)
            
            # Click outside any potential popup areas
            safe_positions = [
                {'x': 10, 'y': 10},
                {'x': 100, 'y': 100}, 
                {'x': 10, 'y': 300},
            ]
            
            for pos in safe_positions:
                try:
                    page.click('body', position=pos, timeout=1000)
                    page.wait_for_timeout(300)
                except:
                    continue
            
            # Final verification after cleanup
            page.wait_for_timeout(2000)
            final_popup_check = False
            for indicator in popup_indicators[:8]:  # Check most critical indicators
                try:
                    if page.locator(indicator).count() > 0:
                        final_popup_check = True
                        logger.debug(f"Final check - popup still exists: {indicator}")
                        break
                except:
                    continue
            
            if not final_popup_check:
                logger.info("✅ Popup cleanup successful - continuing")
                
                # Verify we're still on the correct page after cleanup
                current_url = page.url
                if not current_url.startswith("https://store.line.me/stickershop/product/"):
                    logger.warning(f"Page redirected during cleanup to: {current_url}")
                    logger.info("Returning to original sticker page...")
                    page.goto(original_url, wait_until="networkidle")
                    page.wait_for_timeout(2000)
                
                return True
            else:
                logger.warning("⚠️  Popup persists - images may contain overlay")
                return False
                
        except Exception as e:
            logger.debug(f"Popup cleanup failed: {e}")
            logger.warning("⚠️  Images may contain popup overlay")
            return False
    else:
        logger.info("✅ All popups appear to be dismissed")
        return True


def dismiss_popup(page: Page, original_url: str) -> bool:
    """
    Detect and dismiss advertising popup/modal that may appear on page load.
    Returns True if popup was successfully closed, False otherwise.
    """
    # Store original URL to check for redirects
    current_url = page.url
    logger.debug(f"Original URL: {original_url}")
    logger.debug(f"Current URL before popup dismissal: {current_url}")
    
    # Wait for popup to appear
    logger.debug("Waiting for popup to appear...")
    page.wait_for_timeout(3000)
    
    # First check: Look for the specific popup content we're trying to close
    popup_indicators = [
        ':has-text("メッセージを長押し")',
        ':has-text("リアクション")', 
        ':has-text("今すぐチェック")',
        ':has-text("閉じる")',
        ':has-text("message")',
        '[class*="popup"]',
        '[class*="modal"]',
        '[class*="overlay"]',
        '[class*="dialog"]',
    ]
    
    popup_exists = False
    for indicator in popup_indicators:
        try:
            if page.locator(indicator).count() > 0:
                popup_exists = True
                logger.debug(f"Popup detected with indicator: {indicator}")
                break
        except:
            continue
    
    if not popup_exists:
        logger.info("No popup detected ✔")
        return True
    
    logger.info("Popup detected - using page refresh to bypass...")
    
    # Strategy 1: Reload the page to bypass popup (safest method)
    logger.debug("Reloading page to bypass popup...")
    try:
        page.goto(original_url, wait_until="networkidle")
        page.wait_for_timeout(3000)  # Wait for page to load
        
        # Check if popup still appears after reload
        popup_still_exists = False
        for indicator in popup_indicators[:4]:
            try:
                if page.locator(indicator).count() > 0:
                    popup_still_exists = True
                    logger.debug(f"Popup still visible after reload: {indicator}")
                    break
            except:
                continue
        
        if not popup_still_exists:
            logger.info("✅ Popup bypassed by page reload!")
            return True
        else:
            logger.debug("Popup still present after reload, trying other methods...")
            
    except Exception as e:
        logger.debug(f"Page reload failed: {e}")
    
    # Strategy 2: Try ESC key
    logger.debug("Trying ESC key to close popup...")
    try:
        for _ in range(5):
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
        
        page.wait_for_timeout(1000)
        
        # Check if popup is closed
        popup_still_exists = False
        for indicator in popup_indicators[:4]:  # Include "閉じる" in check
            try:
                if page.locator(indicator).count() > 0:
                    popup_still_exists = True
                    logger.debug(f"Popup still visible after ESC: {indicator}")
                    break
            except:
                continue
        
        if not popup_still_exists:
            logger.info("✅ Popup successfully closed with ESC key!")
            return True
            
    except Exception as e:
        logger.debug(f"ESC key failed: {e}")
    
    # Strategy 3: Look for close buttons specifically near the popup content (last resort)
    logger.debug("Searching for close buttons near popup content...")
    close_button_selectors = [
        # PRIORITY: Direct "閉じる" button text
        'button:has-text("閉じる")',
        '*:has-text("閉じる")',
        '[onclick*="close"]',
        
        # Look for close buttons near specific popup content
        ':has-text("今すぐチェック") ~ button',
        ':has-text("今すぐチェック") + button',
        ':has-text("メッセージを長押し") ~ button',
        ':has-text("メッセージを長押し") + button', 
        ':has-text("リアクション") ~ button',
        ':has-text("リアクション") + button',
        
        # X symbols and close patterns
        'button:has-text("×")',
        'button:has-text("✕")', 
        'button:has-text("x")',
        'button:has-text("X")',
        
        # Close buttons in positioned containers
        '[style*="position: absolute"] button',
        '[style*="position: fixed"] button',
        
        # Small buttons (typically close buttons)
        'button[style*="width: 2"]:visible',
        'button[style*="height: 2"]:visible',
        
        # Bottom area buttons (where "閉じる" typically appears)
        'button[style*="bottom"]',
        '*[style*="bottom"] button',
    ]
    
    for i, selector in enumerate(close_button_selectors):
        try:
            elements = page.locator(selector).all()
            if not elements:
                continue
                
            logger.debug(f"Found {len(elements)} close button candidates with: {selector}")
            
            for j, element in enumerate(elements):
                try:
                    if element.is_visible():
                        logger.debug(f"Clicking close button {j+1}")
                        
                        # Click the close button
                        element.click(timeout=3000)
                        page.wait_for_timeout(1000)
                        
                        # Verify popup is actually closed
                        popup_still_exists = False
                        for indicator in popup_indicators[:4]:  # Check main indicators including "閉じる"
                            try:
                                if page.locator(indicator).count() > 0:
                                    popup_still_exists = True
                                    logger.debug(f"Popup still detected with: {indicator}")
                                    break
                            except:
                                continue
                        
                        if not popup_still_exists:
                            logger.info(f"✅ Popup successfully closed with close button!")
                            return True
                        else:
                            logger.debug("Popup still visible after click, trying next element")
                            
                except Exception as click_e:
                    logger.debug(f"Failed to click close button {j+1}: {click_e}")
                    continue
                    
        except Exception as e:
            logger.debug(f"Error with close button selector '{selector}': {e}")
            continue
    
    # Strategy 2: Try ESC key
    logger.debug("Trying ESC key to close popup...")
    try:
        for _ in range(5):
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
        
        page.wait_for_timeout(1000)
        
        # Check if popup is closed
        popup_still_exists = False
        for indicator in popup_indicators[:4]:  # Include "閉じる" in check
            try:
                if page.locator(indicator).count() > 0:
                    popup_still_exists = True
                    logger.debug(f"Popup still visible after ESC: {indicator}")
                    break
            except:
                continue
        
        if not popup_still_exists:
            logger.info("✅ Popup successfully closed with ESC key!")
            return True
            
    except Exception as e:
        logger.debug(f"ESC key failed: {e}")
    
    # Strategy 3: Click outside popup
    logger.debug("Trying to click outside popup area...")
    try:
        # Click in safe areas away from popup
        safe_positions = [
            {'x': 10, 'y': 10},
            {'x': 50, 'y': 50}, 
            {'x': 10, 'y': 200},
        ]
        
        for pos in safe_positions:
            page.click('body', position=pos, timeout=1000)
            page.wait_for_timeout(500)
        
        page.wait_for_timeout(1000)
        
        # Check if popup is closed
        popup_still_exists = False
        for indicator in popup_indicators[:4]:  # Include "閉じる" in check
            try:
                if page.locator(indicator).count() > 0:
                    popup_still_exists = True
                    logger.debug(f"Popup still visible after ESC: {indicator}")
                    break
            except:
                continue
        
        if not popup_still_exists:
            logger.info("✅ Popup successfully closed by clicking outside!")
            return True
            
    except Exception as e:
        logger.debug(f"Click outside failed: {e}")
    
    # Final check - ensure we're still on the right page
    final_url = page.url
    if not final_url.startswith("https://store.line.me/stickershop/product/"):
        logger.warning(f"URL changed unexpectedly: {final_url}")
        logger.info(f"Returning to original sticker page: {original_url}")
        page.goto(original_url, wait_until="networkidle")
        page.wait_for_timeout(2000)
    
    # Final verification
    popup_still_exists = False
    for indicator in popup_indicators[:4]:  # Include "閉じる" in final check
        try:
            if page.locator(indicator).count() > 0:
                popup_still_exists = True
                logger.debug(f"Final check - popup still exists: {indicator}")
                break
        except:
            continue
    
    if popup_still_exists:
        logger.warning("❌ Popup still visible after all attempts")
        logger.warning("❌ Proceeding with capture - images may contain popup overlay")
        logger.warning("❌ This is a known issue with persistent LINE STORE popups")
        return False
    else:
        logger.info("✅ Popup appears to be closed")
        return True


def wait_for_page_load(page: Page, delay: float) -> None:
    """Wait for page to load completely."""
    try:
        page.wait_for_load_state("networkidle", timeout=30000)
        if delay > 0:
            logger.debug(f"Additional delay: {delay}s")
            page.wait_for_timeout(int(delay * 1000))
    except Exception as e:
        logger.warning(f"Page load timeout: {e}")


def ensure_all_content_loaded(page: Page) -> None:
    """
    Scroll through the entire page to trigger lazy loading of all sticker images.
    This is essential for LINE STORE pages that use dynamic loading.
    """
    logger.info("📜 Scrolling page to load all sticker content...")
    
    try:
        # Get initial page height
        page_height = page.evaluate("document.body.scrollHeight")
        logger.debug(f"Initial page height: {page_height}px")
        
        # Scroll in steps to trigger lazy loading
        viewport_height = page.evaluate("window.innerHeight")
        scroll_steps = max(5, int(page_height / viewport_height) + 2)
        
        logger.debug(f"Performing {scroll_steps} scroll steps...")
        
        for step in range(scroll_steps):
            # Calculate scroll position
            scroll_position = int((step * page_height) / scroll_steps)
            
            # Scroll to position
            page.evaluate(f"window.scrollTo(0, {scroll_position})")
            
            # Wait for content to load at this scroll position
            page.wait_for_timeout(800)  # Allow time for lazy loading
            
            # Check if new content was loaded
            new_height = page.evaluate("document.body.scrollHeight")
            if new_height > page_height:
                logger.debug(f"Page height increased to {new_height}px")
                page_height = new_height
        
        # Scroll to top after loading everything
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(1000)
        
        # Final wait for all images to be ready
        logger.debug("Waiting for all images to finish loading...")
        page.wait_for_timeout(2000)
        
        # Check final page height
        final_height = page.evaluate("document.body.scrollHeight")
        logger.info(f"✅ Content loading complete. Final page height: {final_height}px")
        
    except Exception as e:
        logger.warning(f"Content loading scroll failed: {e}")
        # Continue anyway - partial loading is better than none


def find_sticker_elements(page: Page) -> list:
    """Find all sticker image elements on the page."""
    elements = []
    
    # Debug: Check current page state
    logger.debug(f"Current page URL: {page.url}")
    logger.debug(f"Page title: {page.title()}")
    
    # Verify we're on the correct sticker page
    if not page.url.startswith("https://store.line.me/stickershop/product/"):
        logger.error(f"Not on a sticker product page! Current URL: {page.url}")
        return []
    
    # Wait for the main content to be visible
    try:
        page.wait_for_selector('body', timeout=5000)
        logger.debug("Page body is loaded")
    except Exception as e:
        logger.warning(f"Page body load timeout: {e}")
    
    # Wait longer for dynamic content on sticker pages
    logger.debug("Waiting for sticker content to load...")
    page.wait_for_timeout(3000)
    
    # Try CSS selectors first (original sticker page selectors)
    for selector in STICKER_SELECTORS:
        try:
            # Additional wait for this specific selector
            page.wait_for_timeout(1000)
            
            locator = page.locator(selector)
            count = locator.count()
            logger.debug(f"Selector '{selector}' found {count} elements")
            
            if count > 0:
                logger.info(f"Found {count} elements with selector: {selector}")
                return [locator.nth(i) for i in range(count)]
        except Exception as e:
            logger.debug(f"CSS selector '{selector}' failed: {e}")
    
    # Try XPath selectors as fallback
    for xpath in STICKER_XPATH_SELECTORS:
        try:
            page.wait_for_timeout(1000)
            
            locator = page.locator(f"xpath={xpath}")
            count = locator.count()
            logger.debug(f"XPath '{xpath}' found {count} elements")
            
            if count > 0:
                logger.info(f"Found {count} elements with XPath: {xpath}")
                return [locator.nth(i) for i in range(count)]
        except Exception as e:
            logger.debug(f"XPath selector '{xpath}' failed: {e}")
    
    # If still no luck, try sticker-specific selectors for LINE STORE
    sticker_specific_selectors = [
        'img[src*="sticker"]',              # Only sticker images
        'img[src*="stickershop"]',          # Sticker shop images  
        '.FnStickerPreviewItem img',        # Specific sticker preview class
        '[class*="Sticker"] img',           # Any class containing "Sticker"
        '.mdCMN09Image',                    # Try again with wait
        'li img[alt*="sticker"]',           # Images with sticker in alt text
    ]
    
    logger.debug("Trying sticker-specific selectors...")
    for alt_selector in sticker_specific_selectors:
        try:
            page.wait_for_timeout(500)
            alt_count = page.locator(alt_selector).count()
            logger.debug(f"Sticker-specific selector '{alt_selector}': {alt_count} elements")
            if alt_count > 0:
                logger.info(f"Found {alt_count} elements with sticker-specific selector: {alt_selector}")
                return [page.locator(alt_selector).nth(i) for i in range(alt_count)]
        except Exception as e:
            logger.debug(f"Sticker-specific selector '{alt_selector}' failed: {e}")
    
    # Final debug info
    try:
        all_images = page.locator('img').count()
        logger.warning(f"No stickers found, but {all_images} total images on page")
        
        # List first few image sources for debugging
        for i in range(min(5, all_images)):
            try:
                img_src = page.locator('img').nth(i).get_attribute('src')
                logger.debug(f"Image {i+1} src: {img_src}")
            except:
                pass
                
    except Exception as e:
        logger.debug(f"Debug image search failed: {e}")
    
    return elements


def capture_sticker_screenshots(elements: list, output_dir: Path, page: Page) -> int:
    """Capture screenshots of all sticker elements with enhanced error handling."""
    captured_count = 0
    total_elements = len(elements)
    
    logger.info(f"📸 Starting capture of {total_elements} sticker elements...")
    
    for i, element in enumerate(elements, 1):
        try:
            filename = f"{i:04d}.png"
            filepath = output_dir / filename
            
            # Progress reporting
            if i % 10 == 0 or i <= 5:
                logger.info(f"📸 Processing element {i}/{total_elements}...")
            
            # Enhanced visibility checks
            try:
                # Check if element is visible before attempting screenshot
                is_visible = element.is_visible()
                if not is_visible:
                    logger.debug(f"Element {i} not visible, attempting scroll...")
                    
                    # Try scrolling to element
                    element.scroll_into_view_if_needed(timeout=3000)
                    page.wait_for_timeout(500)  # Wait for scroll to complete
                    
                    # Re-check visibility after scroll
                    is_visible = element.is_visible()
                    if not is_visible:
                        logger.debug(f"Element {i} still not visible after scroll, trying force scroll...")
                        
                        # Get element position and scroll manually
                        try:
                            bbox = element.bounding_box()
                            if bbox:
                                page.evaluate(f"window.scrollTo(0, {bbox['y'] - 100})")
                                page.wait_for_timeout(800)
                                is_visible = element.is_visible()
                        except:
                            pass
                
                if not is_visible:
                    logger.warning(f"Element {i} remains invisible, skipping...")
                    continue
                    
            except Exception as visibility_e:
                logger.debug(f"Visibility check failed for element {i}: {visibility_e}")
                # Continue anyway - try to capture
            
            # Attempt screenshot with reduced timeout for faster processing
            try:
                element.screenshot(path=str(filepath), timeout=5000)
                logger.debug(f"Captured: {filename}")
                captured_count += 1
                
            except Exception as screenshot_e:
                # If screenshot fails, try one more time with page scroll
                logger.debug(f"Screenshot failed for element {i}, retrying with scroll: {screenshot_e}")
                try:
                    # Scroll to element again and wait
                    element.scroll_into_view_if_needed(timeout=2000)
                    page.wait_for_timeout(1000)
                    
                    # Retry screenshot
                    element.screenshot(path=str(filepath), timeout=3000)
                    logger.debug(f"Captured on retry: {filename}")
                    captured_count += 1
                    
                except Exception as retry_e:
                    logger.warning(f"Failed to capture sticker {i} after retry: {retry_e}")
                    continue
            
        except Exception as e:
            logger.warning(f"Failed to capture sticker {i}: {e}")
            continue
    
    success_rate = (captured_count / total_elements * 100) if total_elements > 0 else 0
    logger.info(f"✅ Capture complete: {captured_count}/{total_elements} images ({success_rate:.1f}% success rate)")
    return captured_count


def save_metadata(output_dir: Path, url: str, sticker_count: int, product_id: str) -> None:
    """Save metadata JSON file."""
    metadata = {
        "timestamp": datetime.now().isoformat(),
        "source_url": url,
        "product_id": product_id,
        "sticker_count": sticker_count,
        "tool_version": __version__
    }
    
    metadata_path = output_dir / "meta.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Metadata saved: {metadata_path}")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Capture LINE STORE sticker images for private viewing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python grab_stickers.py -u "https://store.line.me/stickershop/product/4891267/ja"
  python grab_stickers.py -u "https://store.line.me/stickershop/product/4891267/ja" -o ./my_stickers --delay 3
  python grab_stickers.py -u "https://store.line.me/stickershop/product/4891267/ja" --no-headless --verbose
  python grab_stickers.py -u "https://store.line.me/stickershop/product/4891267/ja" --no-headless --manual-popup

IMPORTANT COPYRIGHT NOTICE:
This tool is for PRIVATE VIEWING ONLY. Sticker images remain copyrighted by LINE
and their creators. Redistribution or public use is prohibited and may violate
copyright law and LINE's Terms of Service.
        """
    )
    
    parser.add_argument(
        "-u", "--url",
        required=True,
        help="LINE STORE product page URL"
    )
    
    parser.add_argument(
        "-o", "--outdir",
        help="Output directory (default: ./output/<product_id>/)"
    )
    
    parser.add_argument(
        "--lang",
        choices=["ja", "en"],
        help="Override page language"
    )
    
    parser.add_argument(
        "--delay",
        type=float,
        default=2.0,
        help="Extra wait time after page load in seconds (default: 2.0)"
    )
    
    parser.add_argument(
        "--headless",
        action="store_true",
        default=True,
        help="Run browser in headless mode (default: True)"
    )
    
    parser.add_argument(
        "--no-headless",
        action="store_false",
        dest="headless",
        help="Run browser in GUI mode"
    )
    
    parser.add_argument(
        "--browser",
        choices=["chromium", "firefox", "webkit"],
        default="chromium",
        help="Browser to use (default: chromium)"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose debug logging"
    )
    
    parser.add_argument(
        "--manual-popup",
        action="store_true",
        help="Wait for manual popup dismissal (requires --no-headless)"
    )
    
    parser.add_argument(
        "--manual-wait",
        type=int,
        default=30,
        help="Seconds to wait for manual popup dismissal (default: 30)"
    )
    
    args = parser.parse_args()
    
    # Setup logging
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")
    
    # Validate manual popup mode
    if args.manual_popup and args.headless:
        logger.error("Manual popup mode requires --no-headless (GUI mode)")
        sys.exit(1)
    
    # Validate URL
    if not args.url.startswith("https://store.line.me/stickershop/product/"):
        logger.error("Invalid URL. Must be a LINE STORE product page.")
        sys.exit(1)
    
    # Extract product ID
    product_id = extract_product_id(args.url)
    if not product_id:
        logger.error("Could not extract product ID from URL")
        sys.exit(1)
    
    logger.info(f"Product ID: {product_id}")
    
    # Setup output directory
    output_dir = setup_output_directory(args.outdir, product_id)
    
    # Modify URL for language if specified
    target_url = args.url
    if args.lang:
        target_url = re.sub(r'/[a-z]{2}$', f'/{args.lang}', target_url)
        logger.info(f"Language override: {args.lang}")
    
    logger.info(f"Target URL: {target_url}")
    
    # Launch browser and capture stickers
    try:
        with sync_playwright() as p:
            if args.browser == "firefox":
                browser: Browser = p.firefox.launch(headless=args.headless)
            elif args.browser == "webkit":
                browser: Browser = p.webkit.launch(headless=args.headless)
            else:
                browser: Browser = p.chromium.launch(headless=args.headless)
            page: Page = browser.new_page()
            
            logger.info("Loading page...")
            page.goto(target_url, wait_until="networkidle")
            
            # Handle popup dismissal based on mode
            if args.manual_popup:
                popup_closed = wait_for_manual_popup_dismissal(page, args.manual_wait, target_url)
            else:
                popup_closed = dismiss_popup(page, target_url)
            
            if not popup_closed:
                logger.warning("⚠️  Popup could not be closed - proceeding anyway")
                logger.warning("⚠️  Captured images may include popup overlay")
            
            # Wait for page to stabilize after popup dismissal
            wait_for_page_load(page, args.delay)
            
            # Additional wait for content to load after popup is dismissed
            logger.debug("Waiting for content to load after popup dismissal...")
            page.wait_for_timeout(2000)
            
            # Ensure all content is loaded by scrolling through the page
            ensure_all_content_loaded(page)
            
            logger.info("Searching for sticker elements...")
            sticker_elements = find_sticker_elements(page)
            
            if not sticker_elements:
                logger.error("No sticker elements found on the page")
                browser.close()
                sys.exit(1)
            
            logger.info(f"Found {len(sticker_elements)} sticker elements")
            
            # Capture screenshots
            captured_count = capture_sticker_screenshots(sticker_elements, output_dir, page)
            
            # Save metadata
            save_metadata(output_dir, target_url, captured_count, product_id)
            
            browser.close()
            
            if captured_count == 0:
                logger.error("No stickers were successfully captured")
                sys.exit(1)
            
            logger.info(f"✅ Complete! Captured {captured_count} stickers to {output_dir}")
            
    except KeyboardInterrupt:
        logger.info("Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()