# Instant Site Autocomplete 🚀

A lightweight, high-speed browser extension for Chromium-based browsers that instantly resolves and autocompletes real-world web domains as you type, triggered seamlessly by the **Tab** key.

## Features

- **Live DNS Resolution:** Queries Cloudflare’s secure DNS-over-HTTPS API on the fly to verify and fetch actual live web domains (e.g., turning `kreml` into `kremlin.ru`).
- **Tab-Triggered:** Press **Tab** while typing any bare word to instantly convert it into its verified real-world URL without cluttered popups or interface distractions.
- **Universal Compatibility:** Injects into all frames, iframes, shadow DOMs, standard text inputs, textareas, and complex rich-text or grid interfaces (like Google Sheets).
- **Manifest V3:** Built using modern Chrome extension standards.
- **Zero Dependencies:** Pure vanilla JavaScript with no heavy build tools or external tracking libraries.

---

## Installation & Setup

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the folder containing these extension files.

---

## How to Use

1. Go to any website with an input field, search bar, or text editor.
2. Type a brand or site name (for example: `github`, `kreml`, or `wikipedia`).
3. Press **Tab**. 
4. The extension will instantly look up the live domain registry and replace your text with the correct verified URL!

---

## License

MIT License — Feel free to use, modify, and distribute.
