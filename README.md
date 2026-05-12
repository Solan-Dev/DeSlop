# DeSlop (LinkedIn Feed Filter)

A Chrome Manifest V3 extension that filters noise from the LinkedIn feed (`linkedin.com/feed`) while keeping all processing local in your browser.

## Features

- Runs on LinkedIn feed pages only.
- Hides sponsored/promoted posts.
- Hides suggested/recommended feed posts.
- Supports a user-configurable keyword blacklist.
- Supports a muted-authors list.
- Optional **collapse instead of hide** behavior.
- Stores settings with `chrome.storage.sync`.
- Includes an options page for managing settings.
- Sends no browsing data anywhere.

## Install locally (developer mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the cloned repository folder containing this extension.

## Configure

1. In `chrome://extensions`, open **Details** for DeSlop.
2. Open **Extension options**.
3. Add blacklist keywords and muted author names (one per line or comma-separated).
4. Choose whether to collapse posts instead of hiding them.
5. Click **Save settings**.

## Privacy

DeSlop performs all filtering logic locally in the content script and stores settings in Chrome storage. It does not transmit feed content, keywords, or browsing data to external services.
