"""
Configuration constants for LINE STORE Sticker Capture Tool.
"""

# Modal/Popup dismiss settings
POPUP_CLOSE_SELECTORS = [
    # LINE STORE specific selectors
    'div[class*="modal"] button',          # Generic modal button
    'div[class*="popup"] button',          # Generic popup button
    'div[class*="overlay"] button',        # Overlay button
    '[class*="dialog"] button',            # Dialog button
    '[role="dialog"] button',              # ARIA dialog button
    '[class*="Modal"] button',             # Capital M modal
    '[class*="Popup"] button',             # Capital P popup
    
    # Text-based selectors (more specific)
    'button:has-text("閉じる")',           # Japanese "Close"
    'button:has-text("Close")',            # English "Close"
    'button:has-text("×")',                # X symbol
    'button:has-text("✕")',                # Alternative X
    'button:has-text("OK")',               # OK button
    'button:has-text("はい")',             # Japanese "Yes"
    
    # Attribute-based selectors
    '[data-testid="modal-close"]',         # Common data attribute
    '[data-testid*="close"]',              # Any close-related testid
    '[aria-label="Close"]',                # Accessibility label
    '[aria-label="閉じる"]',               # Japanese accessibility label
    '[aria-label*="close"]',               # Any close-related aria-label
    
    # Class-based selectors
    '.modal-close',                        # Common CSS class
    '.popup-close',                        # Alternative CSS class
    '.dialog-close',                       # Dialog close
    '.overlay-close',                      # Overlay close
    
    # Generic close patterns
    'button[title="Close"]',               # Title attribute
    'button[title="閉じる"]',              # Japanese title
    'button[title*="close"]',              # Any close-related title
    '*[onclick*="close"]',                 # onclick with close
]

POPUP_DISMISS_TIMEOUT_MS = 2000  # Maximum wait time for popup detection

# Screenshot settings
SCREENSHOT_TIMEOUT_MS = 10000    # Timeout for individual element screenshots
SCROLL_TIMEOUT_MS = 5000         # Timeout for scrolling elements into view