"""
CSS selectors and XPath expressions for LINE STORE sticker pages.
Centralized to improve maintainability when DOM structure changes.
"""

from typing import List

# Primary selectors for sticker images
STICKER_SELECTORS: List[str] = [
    ".mdCMN09Image",  # Main CSS class for sticker images
    "li img[src*='stickershop']",  # Alternative selector for sticker shop images
]

# XPath selectors as fallback
STICKER_XPATH_SELECTORS: List[str] = [
    "//li/img[contains(@src,'stickershop')]",
    "//img[contains(@class,'mdCMN09Image')]",
]

# Page loading selectors
PAGE_READY_SELECTORS: List[str] = [
    ".mdCMN09Image",
    ".FnStickerPreviewItem",
]