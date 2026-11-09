(function () {
  const ALLOWED_INPUT_TYPES = new Set(['text', 'search', 'url']); // never password etc.
  const WORD_RE = /(?:^|\s)([a-z0-9-]{2,63})$/i;

  /* ---------- helpers: find the word before the caret ---------- */

  function getDeepActive() {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }

  function getSelectionFor(el) {
    const root = el.getRootNode();
    return (root && typeof root.getSelection === 'function') ? root.getSelection() : window.getSelection();
  }

  function getContext(el) {
    if (!el || el.disabled || el.readOnly) return null;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';

    if (tag === 'textarea' || tag === 'input') {
      if (tag === 'input' && !ALLOWED_INPUT_TYPES.has((el.type || 'text').toLowerCase())) return null;
      const pos = el.selectionStart;
      if (pos == null || pos !== el.selectionEnd) return null;
      const m = el.value.slice(0, pos).match(WORD_RE);
      if (!m) return null;
      return { kind: 'field', el, word: m[1], pos, snapshot: el.value };
    }

    if (el.isContentEditable) {
      const sel = getSelectionFor(el);
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
      const r = sel.getRangeAt(0);
      const node = r.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return null;
      const m = node.data.slice(0, r.startOffset).match(WORD_RE);
      if (!m) return null;
      return { kind: 'ce', el, sel, node, word: m[1], pos: r.startOffset, snapshot: node.data };
    }
    return null;
  }

  function stillValid(ctx) {
    if (ctx.kind === 'field') {
      return ctx.el.isConnected && ctx.el.value === ctx.snapshot &&
             ctx.el.selectionStart === ctx.pos && ctx.el.selectionEnd === ctx.pos;
    }
    if (!ctx.node.isConnected || ctx.node.data !== ctx.snapshot) return false;
    if (!ctx.sel.rangeCount) return false;
    const r = ctx.sel.getRangeAt(0);
    return r.collapsed && r.startContainer === ctx.node && r.startOffset === ctx.pos;
  }

  function replaceWord(ctx, url) {
    const start = ctx.pos - ctx.word.length;
    if (ctx.kind === 'field') {
      ctx.el.focus();
      ctx.el.setSelectionRange(start, ctx.pos);
      if (!document.execCommand('insertText', false, url)) {
        ctx.el.setRangeText(url, start, ctx.pos, 'end');
        ctx.el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: url }));
      }
    } else {
      const range = document.createRange();
      range.setStart(ctx.node, start);
      range.setEnd(ctx.node, ctx.pos);
      ctx.sel.removeAllRanges();
      ctx.sel.addRange(range);
      if (!document.execCommand('insertText', false, url)) {
        range.deleteContents();
        range.insertNode(document.createTextNode(url));
        ctx.sel.collapseToEnd();
        ctx.el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: url }));
      }
    }
  }

  /* ---------- picker popup ---------- */

  let picker = null; // { host, items, index, ctx, onKey, onDown, close }

  function anchorRect(ctx) {
    if (ctx.kind === 'ce' && ctx.sel.rangeCount) {
      const rects = ctx.sel.getRangeAt(0).getClientRects();
      if (rects.length) return rects[rects.length - 1];
    }
    return ctx.el.getBoundingClientRect();
  }

  function closePicker() {
    if (!picker) return;
    document.removeEventListener('keydown', picker.onKey, true);
    document.removeEventListener('mousedown', picker.onDown, true);
    window.removeEventListener('scroll', picker.close, true);
    window.removeEventListener('blur', picker.close, true);
    picker.host.remove();
    picker = null;
  }

  function choose(url) {
    const ctx = picker.ctx;
    closePicker();
    if (stillValid(ctx)) replaceWord(ctx, url);
  }

  function openPicker(ctx, urls) {
    closePicker();

    const host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>
        .box{font:13px/1.3 system-ui,Segoe UI,Arial,sans-serif;background:#fff;color:#111;
             border:1px solid #c9ccd1;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.25);
             min-width:240px;max-width:360px;padding:4px;user-select:none}
        .hint{padding:4px 8px;color:#6b7280;font-size:11px}
        .row{display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:6px;cursor:pointer}
        .row.sel{background:#2563eb;color:#fff}
        .n{opacity:.6;width:14px;text-align:right}
        .u{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      </style>
      <div class="box"></div>`;
    const box = root.querySelector('.box');

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = '↑↓ choose · Enter/Tab insert · 1-9 quick pick · Esc cancel';
    box.appendChild(hint);

    const rows = urls.map((url, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<span class="n"></span><span class="u"></span>';
      row.children[0].textContent = i + 1;
      row.children[1].textContent = url.replace('https://', '');
      row.addEventListener('mouseenter', () => select(i));
      row.addEventListener('mousedown', (ev) => { ev.preventDefault(); ev.stopPropagation(); choose(url); });
      box.appendChild(row);
      return row;
    });

    function select(i) {
      picker.index = (i + urls.length) % urls.length;
      rows.forEach((r, j) => r.classList.toggle('sel', j === picker.index));
    }

    const onKey = (e) => {
      const k = e.key;
      let handled = true;
      if (k === 'ArrowDown') select(picker.index + 1);
      else if (k === 'ArrowUp') select(picker.index - 1);
      else if (k === 'Enter' || k === 'Tab') choose(urls[picker.index]);
      else if (k === 'Escape') closePicker();
      else if (/^[1-9]$/.test(k) && +k <= urls.length) choose(urls[+k - 1]);
      else if (e.code === 'Space' && e.ctrlKey) select(picker.index + 1); // Ctrl+Space again = next
      else if (['Shift', 'Control', 'Alt', 'Meta'].includes(k)) handled = false;
      else { closePicker(); handled = false; }                           // any other key: dismiss
      if (handled) { e.preventDefault(); e.stopPropagation(); }
    };
    const onDown = (e) => { if (!e.composedPath().includes(host)) closePicker(); };

    picker = { host, index: 0, ctx, onKey, onDown, close: closePicker };
    document.documentElement.appendChild(host);

    // Position under the caret / field, flip above if no room
    const rect = anchorRect(ctx);
    const h = host.getBoundingClientRect().height || 200;
    const w = host.getBoundingClientRect().width || 260;
    let top = rect.bottom + 4;
    if (top + h > window.innerHeight) top = Math.max(4, rect.top - h - 4);
    host.style.top = top + 'px';
    host.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - w - 4)) + 'px';

    select(0);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', closePicker, true);
    window.addEventListener('blur', closePicker, true);
  }

  /* ---------- trigger: Ctrl+Space ---------- */

  let busy = false;

  document.addEventListener('keydown', async (e) => {
    if (picker) return; // picker's own handler takes over
    if (e.code !== 'Space' || !e.ctrlKey || e.shiftKey || e.altKey || e.metaKey || e.isComposing) return;
    if (busy) return;

    const ctx = getContext(getDeepActive());
    if (!ctx) return; // not a bare word, so let the page handle Ctrl+Space

    e.preventDefault();
    e.stopPropagation();
    busy = true;

    try {
      const resp = await chrome.runtime.sendMessage({ type: 'resolve', word: ctx.word.toLowerCase() });
      const urls = (resp && resp.urls) || [];
      if (!urls.length || !stillValid(ctx)) return;
      if (urls.length === 1) replaceWord(ctx, urls[0]); // single match, insert directly
      else openPicker(ctx, urls);                       // several TLDs, show the list
    } catch (_) {
      // extension reloaded or context invalidated: fail silently
    } finally {
      busy = false;
    }
  }, true);
})();
