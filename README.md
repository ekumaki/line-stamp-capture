# LINE STORE Sticker Capture Tool

A Python CLI tool that captures individual sticker images from LINE STORE product pages as PNG screenshots for private viewing only.

## ⚠️ Important Copyright Notice

**This tool is for PRIVATE VIEWING ONLY.**

- Sticker images remain copyrighted by LINE Corporation and their respective creators
- Any redistribution, public sharing, or commercial use is strictly prohibited
- Usage must comply with LINE's Terms of Service and applicable copyright laws
- This tool is provided under the private copying exemption for personal use only

## Features

- Captures all sticker images from a LINE STORE product page
- Saves individual PNG screenshots with sequential numbering
- Generates metadata JSON with capture details
- **Auto-dismisses advertising popups/modals** that may appear on page load
- Configurable output directory and browser settings
- Structured logging with debug mode
- Cross-platform support (Windows, macOS, Linux)

## Requirements

- Python ≥ 3.11
- Playwright ≥ 1.45

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ekumaki/line-stamp-capture.git
cd line-stamp-capture
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install Playwright browser:
```bash
playwright install chromium
```

## Usage

### Basic Usage
```bash
python grab_stickers.py -u "https://store.line.me/stickershop/product/4891267/ja"
```

### Advanced Options
```bash
python grab_stickers.py \
  -u "https://store.line.me/stickershop/product/4891267/ja" \
  -o ./my_stickers \
  --delay 3 \
  --no-headless \
  --verbose
```

### Command Line Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `-u, --url` | string | LINE STORE product page URL | **Required** |
| `-o, --outdir` | string | Output directory | `./output/<product_id>/` |
| `--lang` | ja/en | Override page language | Auto-detect |
| `--delay` | float | Extra wait time after page load (seconds) | 2.0 |
| `--headless/--no-headless` | bool | Browser headless mode | True |
| `--verbose` | flag | Enable debug logging | False |

## Output Structure

The tool creates the following files in the output directory:

```
output/
└── <product_id>/
    ├── 0001.png        # First sticker image
    ├── 0002.png        # Second sticker image
    ├── ...
    ├── 0040.png        # Last sticker image
    └── meta.json       # Capture metadata
```

### Metadata Format

```json
{
  "timestamp": "2024-01-15T10:30:45.123456",
  "source_url": "https://store.line.me/stickershop/product/4891267/ja",
  "product_id": "4891267",
  "sticker_count": 40,
  "tool_version": "1.0.0"
}
```

## Performance

- Typical capture time: ~5 seconds for 40 stickers on standard broadband
- Memory usage: ~50MB during execution
- Animated stickers (APNG/GIF) are saved as static PNG frames

## Troubleshooting

### No stickers found
- Check if the URL is correct and accessible
- Try running with `--no-headless` to see the browser
- Use `--verbose` for detailed logging
- LINE may have changed their page structure (check selectors.py)

### Browser launch fails
- Ensure Playwright is properly installed: `playwright install chromium`
- Check system requirements for Chromium
- Try running with `--no-headless` to diagnose issues

### Network timeouts
- Increase `--delay` value for slow connections
- Check firewall and proxy settings
- Ensure stable internet connection

## Technical Details

### Architecture
- `grab_stickers.py`: Main CLI application
- `line_selectors.py`: Centralized CSS/XPath selectors for maintainability
- `config.py`: Configuration constants including popup selectors and timeouts
- Uses Playwright for JavaScript rendering and element screenshots

### Pop-up Auto-Close Feature
The tool automatically detects and dismisses advertising popups/modals that may appear when loading LINE STORE pages:

- **Multi-language support**: Detects "閉じる" (Japanese) and "Close" (English) buttons
- **Robust selector patterns**: Uses multiple CSS selectors to handle UI variations
- **Fast detection**: 2-second timeout to avoid delays when no popup exists
- **Fallback mechanism**: Presses ESC key as additional fallback method
- **Non-blocking**: Continues execution if popup dismissal fails

### Selector Strategy
The tool uses multiple fallback selectors to handle DOM changes:
1. Primary CSS: `.mdCMN09Image`
2. Alternative CSS: `li img[src*='stickershop']`
3. XPath fallbacks for robustness

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test thoroughly with different sticker pages
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

**Note:** The MIT license applies only to the source code. Captured sticker images remain copyrighted by LINE Corporation and their creators and are not covered by this license.

## Disclaimer

This tool is not affiliated with LINE Corporation. Use at your own risk and in compliance with all applicable laws and terms of service. The author is not responsible for any misuse or copyright violations.