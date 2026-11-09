(function () {
  const ALLOWED_INPUT_TYPES = new Set(['text', 'search', 'url']); // password etc. are never touched
  const WORD_RE = /(?:^|\s)([a-z0-9-]{2,63})$/i;

  // Deepest active element, piercing open shadow roots
  function getDeepActive() {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }

  function getSelectionFor(el) {
    const root = el.getRootNode();
    return (root && typeof root.getSelection === 'function') ? root.getSelection() : window.getSelection();
  }

  // Returns a context object describing the word before the caret, or null
  function getContext(el) {
    if (!el || el.disabled || el.readOnly) return null;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';

    // <input> / <textarea>
    if (tag === 'textarea' || tag === 'input') {
      if (tag === 'input' && !ALLOWED_INPUT_TYPES.has((el.type || 'text').toLowerCase())) return null;
      const pos = el.selectionStart;
      if (pos == null || pos !== el.selectionEnd) return null;
      const m = el.value.slice(0, pos).match(WORD_RE);
      if (!m) return null;
      return { kind: 'field', el, word: m[1], pos, snapshot: el.value };
    }

    // contenteditable (and role=textbox editors)
    if (el.isContentEditable) {
      const sel = getSelectionFor(el);
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
      const r = sel.getRangeAt(0);
      const node = r.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return null;
      const offset = r.startOffset;
      const m = node.data.slice(0, offset).match(WORD_RE);
      if (!m) return null;
      return { kind: 'ce', el, sel, node, word: m[1], pos: offset, snapshot: node.data };
    }
    return null;
  }

  function stillValid(ctx) {
    if (ctx.kind === 'field') {
      return ctx.el.value === ctx.snapshot && ctx.el.selectionStart === ctx.pos && ctx.el.selectionEnd === ctx.pos;
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
      // insertText keeps undo history and fires native input events
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

  let busy = false;

  document.addEventListener('keydown', async (e) => {
    // Trigger: Ctrl+Space only (Windows / Linux / Mac)
    if (e.code !== 'Space' || !e.ctrlKey || e.shiftKey || e.altKey || e.metaKey || e.isComposing) return;
    if (busy) return;

    const ctx = getContext(getDeepActive());
    if (!ctx) return; // not a bare word, so let the page handle Ctrl+Space

    e.preventDefault();
    e.stopPropagation();
    busy = true;

    try {
      const resp = await chrome.runtime.sendMessage({ type: 'resolve', word: ctx.word.toLowerCase() });
      if (!resp || !resp.url) return;     // no DNS match, so leave the text as is
      if (!stillValid(ctx)) return;       // user typed or moved, so abort
      replaceWord(ctx, resp.url);
    } catch (_) {
      // extension reloaded or context invalidated: fail silently
    } finally {
      busy = false;
    }
  }, true);
})();
