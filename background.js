// Ordered by priority: this is the order shown in the list
const TLDS = ['.com', '.ca', '.co.uk', '.org', '.net', '.io', '.co', '.ai',
              '.de', '.fr', '.es', '.it', '.nl', '.com.au', '.in'];
const MAX_RESULTS = 8;
const cache = new Map();

const INSTANT = {
  gemini: 'https://gemini.google.com',
  gmail: 'https://mail.google.com',
  drive: 'https://drive.google.com',
  calendar: 'https://calendar.google.com'
};

async function check(domain, signal) {
  try {
    const r = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      { headers: { Accept: 'application/dns-json' }, signal }
    );
    const d = await r.json();
    return d.Status === 0 && Array.isArray(d.Answer) && d.Answer.length > 0;
  } catch { return false; }
}

// Returns an array of URLs (priority order), possibly empty
async function resolveAll(word) {
  if (INSTANT[word]) return [INSTANT[word]];
  if (cache.has(word)) return cache.get(word);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 3000);
  const res = await Promise.all(TLDS.map(t => check(word + t, ac.signal)));
  clearTimeout(timer);

  const urls = TLDS.filter((_, i) => res[i]).slice(0, MAX_RESULTS).map(t => `https://${word}${t}`);
  if (urls.length) cache.set(word, urls);
  return urls;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'resolve') {
    resolveAll(String(msg.word)).then(urls => sendResponse({ urls }));
    return true; // async response
  }
});
