# Live DNS Site Autocomplete

A Chrome extension (Manifest V3). Type a bare word such as `amazon`, then press **Ctrl+Space**. The word becomes a website URL. If the word exists on several domains (`.com`, `.ca`, `.co.uk` and so on), a list pops up so you can choose one.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Version](https://img.shields.io/badge/version-3.3-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

- **Ctrl+Space trigger.** It works on Windows, Linux and macOS.
- **Live DNS lookup.** It uses Cloudflare DNS-over-HTTPS to check which domains exist.
- **Domain picker.** If a word resolves on more than one TLD, you choose from a list.
- **Direct insert.** If only one domain matches, it is inserted straight away.
- **Wide field support.** It works in `<input>`, `<textarea>` and `contenteditable` editors. It also works inside open shadow DOM and iframes.
- **Safe insertion.** Undo (Ctrl+Z) works. If you keep typing during the lookup, nothing is inserted.
- **Hardcoded shortcuts.** `gemini`, `gmail`, `drive` and `calendar` map to their Google subdomains.

## Project structure

```
live-dns-autocomplete/
├── manifest.json
├── background.js   # DNS lookups (service worker)
├── content.js      # Ctrl+Space handling, text replacement, picker UI
├── README.md
└── LICENSE
```

## Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/<your-username>/live-dns-autocomplete.git
   ```
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Refresh any tabs that were already open.

After you change any file, click **Reload** on the extension card, then refresh your tabs.

## Usage

1. Click in a text field and type a bare word, for example `amazon`.
2. Press **Ctrl+Space**.
3. Then:
   - One matching domain: the word is replaced with the URL.
   - Several matching domains: a list appears under the caret.
   - No match: nothing happens.

### Picker controls

| Key / action | Result |
|---|---|
| `↑` / `↓` | Move the selection |
| `Enter` or `Tab` | Insert the selected URL |
| `1`–`9` | Insert that item directly |
| `Ctrl+Space` | Move to the next item |
| `Esc`, click elsewhere, scroll or any other key | Close the list |
| Mouse click | Insert the clicked item |

### What counts as a "word"

- The last word before the caret.
- 2–63 characters: letters, digits and hyphens only.
- It must have no `.` or `/`, so existing URLs are left alone.
- Any selected text cancels the shortcut.

## Configuration

Edit `background.js`:

| Setting | Purpose |
|---|---|
| `TLDS` | The TLDs to check. **The array order is the order shown in the list.** |
| `MAX_RESULTS` | The maximum number of entries in the list (default `8`) |
| `INSTANT` | Words that map straight to a URL without a DNS lookup |
| Timeout (`3000` ms) | How long to wait for DNS before giving up |

Example: to put `.ca` first, reorder `TLDS` as `['.ca', '.com', ...]`.

### Changing the shortcut

In `content.js`, edit this line in the keydown listener:

```js
if (e.code !== 'Space' || !e.ctrlKey || e.shiftKey || e.altKey || e.metaKey || e.isComposing) return;
```

Example for Ctrl+Shift+L:

```js
if (e.code !== 'KeyL' || !e.ctrlKey || !e.shiftKey || e.altKey || e.metaKey || e.isComposing) return;
```

If you want the picker's "next item" key to match, update the `e.code === 'Space' && e.ctrlKey` check in the picker's `onKey` handler too.

## Where it works

- Search boxes, forms and comment fields
- Gmail, Slack, Notion, X and other `contenteditable` editors
- iframes and open shadow DOM

## Where it does not work

Chrome blocks content scripts in these places:

- The address bar (omnibox)
- `chrome://` pages, the new tab page and the Chrome Web Store
- Chrome's built-in PDF viewer
- `file://` pages, unless you turn on **Allow access to file URLs** in the extension's details
- Canvas-rendered editors (Google Docs and Sheets cells, some Monaco modes)
- Closed shadow roots

## Privacy and security

- **The word you type is sent to Cloudflare** (`cloudflare-dns.com`) as a DNS query, for example `amazon.com`. It is sent only when you press Ctrl+Space, not while you type.
- **Password fields are never read.** Only `text`, `search` and `url` inputs, `<textarea>` and `contenteditable` are supported.
- **Do not use it for sensitive text.** The word before the caret is sent to Cloudflare. That includes tokens, secrets and private names in any field.
- **A DNS record only means the domain exists.** It does not mean it is the site you want. Parked, squatted and lookalike domains also resolve. Check the URL before you open it.
- The extension requests no browser permissions. It only requests host access to `https://cloudflare-dns.com/*`. Its content script runs on all sites.
- Results are cached in memory in the background service worker.
- The extension has no analytics or telemetry, and it sends no data anywhere except Cloudflare DNS.

## Troubleshooting

| Problem | Fix |
|---|---|
| Nothing happens | Reload the extension, then **refresh the tab**. Tabs that were open before keep the old script. |
| Extension fails to load | Check the file names. The manifest expects `content.js` and `background.js`. |
| Ctrl+Space does nothing on Windows | Another app or the IME may be taking the shortcut. Change the IME hotkey in Windows settings. |
| Doesn't work on macOS | Ctrl+Space is the system input-source shortcut. Disable it in *System Settings → Keyboard → Keyboard Shortcuts → Input Sources*. |
| Picker doesn't appear | The word may match only one domain, which is inserted directly. If no domain matches, nothing happens. |
| Works on some sites but not others | The site may use a canvas editor or a closed shadow root. See "Where it does not work". |
| Slow results | Reduce the number of `TLDS`, or raise the timeout. |

## Known limitations

- DNS existence is not site verification.
- Only common TLDs are checked, so a word that exists only on an unlisted TLD returns nothing.
- Only the word directly before the caret is handled.
- The cache may be cleared when Chrome stops the idle service worker.

## Changelog

- **3.3.** Added the domain picker for words with multiple TLDs. `background.js` now returns a list of URLs.
- **3.2.** Added `contenteditable`, iframe and shadow DOM support. The extension now inserts text with `execCommand`, so undo works.
- **3.1.** Changed the trigger from Tab to Ctrl+Space. Added `background.js`, the password-field exclusion and the stale-input check.
- **3.0.** Original version: Tab trigger with sequential DNS lookups in the content script.

## Contributing

Issues and pull requests are welcome.

1. Fork the repository.
2. Create a branch: `git checkout -b feature/my-change`.
3. Commit your changes and open a pull request.

## License

[MIT](LICENSE)
