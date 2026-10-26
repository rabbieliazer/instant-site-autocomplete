(function() {
    function getActiveTextElement() {
        let el = document.activeElement;
        while (el) {
            if (el.shadowRoot && el.shadowRoot.activeElement) {
                el = el.shadowRoot.activeElement;
                continue;
            }
            break;
        }

        if (!el) return null;

        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        const isInput = tag === 'input' || tag === 'textarea';
        const isEditable = el.isContentEditable || el.getAttribute('role') === 'textbox' || el.classList.contains('cell-input');

        return (isInput || isEditable) ? el : null;
    }

    // Query Cloudflare's live DNS to find the real website address
    async function resolveRealDomain(word) {
        const w = word.toLowerCase().trim();
        
        // Instant hard-overrides for known complex paths where DNS alone isn't enough (e.g. subpaths)
        const instantMap = {
            'gemini': 'https://gemini.google.com',
            'gmail': 'https://mail.google.com',
            'drive': 'https://drive.google.com',
            'calendar': 'https://calendar.google.com'
        };
        if (instantMap[w]) return instantMap[w];

        // TLDs to check in order of likelihood
        const tlds = ['.com', '.ru', '.org', '.net', '.io', '.co', '.ai', '.de', '.co.uk', '.ca'];

        for (const tld of tlds) {
            const domain = `${w}${tld}`;
            try {
                // Perform a fast DNS query (HTTPS request to Cloudflare DNS)
                const response = `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`;
                const res = await fetch(response, {
                    headers: { 'Accept': 'application/dns-json' }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    // If the domain has a valid DNS record (Answer section exists), it exists in the real world!
                    if (data.Answer && data.Answer.length > 0) {
                        return `https://${domain}`;
                    }
                }
            } catch (e) {
                // Skip on network error and try next TLD
            }
        }
        
        // Ultimate fallback if no DNS record responds instantly
        return `https://${w}.com`;
    }

    // Listen for Tab key press
    document.addEventListener('keydown', async function(event) {
        if (event.key !== 'Tab') return;

        const target = getActiveTextElement();
        if (!target) return;

        const text = target.value || target.innerText || target.textContent || '';
        const cursorPos = typeof target.selectionStart === 'number' ? target.selectionStart : text.length;
        
        const textBeforeCursor = text.substring(0, cursorPos);
        const textAfterCursor = text.substring(cursorPos);
        const words = textBeforeCursor.split(/\s+/);
        const lastWord = words[words.length - 1].toLowerCase();

        if (!lastWord || lastWord.includes('.') || lastWord.includes('/') || !/^[a-zA-Z0-9\-]+$/.test(lastWord)) {
            return; // Let normal tab behavior happen if not typing a bare word
        }

        event.preventDefault(); // Stop default tab movement

        // Fetch real link via live DNS
        const realUrl = await resolveRealDomain(lastWord);

        // Replace word with the fetched real URL
        words[words.length - 1] = realUrl;
        const updatedBefore = words.join(' ');
        const updatedText = updatedBefore + ' ' + textAfterCursor;

        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            target.value = updatedText;
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
            
            const newCursorPos = updatedBefore.length + 1;
            target.setSelectionRange(newCursorPos, newCursorPos);
        } else {
            target.innerText = updatedText;
        }
    }, true);
})();