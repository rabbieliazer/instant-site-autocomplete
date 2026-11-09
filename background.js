const TLDS = ['.com', '.org', '.net', '.io', '.co', '.ai', '.de', '.co.uk', '.ca'];
const cache = new Map();

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

async function resolve(word) {
  if (cache.has(word)) return cache.get(word);
  const instant = {
    gemini: 'https://gemini.google.com',
    gmail: 'https://mail.google.com',
    drive: 'https://drive.google.com',
    calendar: 'https://calendar.google.com'
  };
  if (instant[word]) return instant[word];

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 2500);
  const res = await Promise.all(TLDS.map(t => check(word + t, ac.signal)));
  clearTimeout(timer);
  const i = res.findIndex(Boolean); // keeps TLD priority order
  const url = i >= 0 ? `https://${word}${TLDS[i]}` : null;
  if (url) cache.set(word, url);
  return url;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'resolve') {
    resolve(String(msg.word)).then(url => sendResponse({ url }));
    return true; // async response
  }
});
