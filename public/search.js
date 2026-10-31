// Türkçe için küçük arama motoru. Harf sayısını korur, böylece vurgulama konumları tutar.
export function fold(text) {
  let out = '';
  for (const ch of text.normalize('NFC')) {
    if (ch === 'ı' || ch === 'I' || ch === 'İ') out += 'i';
    else out += ch.length > 1 ? ch : ch.normalize('NFD')[0].toLowerCase();
  }
  return out;
}

const WORD = /[\p{L}\p{N}]+/gu;
const words = (folded) => [...folded.matchAll(WORD)].map((m) => ({ word: m[0], at: m.index }));

// köpek → köpeğim, kitap → kitabı, ağaç → ağacı, kanat → kanadı
const SOFT = { k: 'g', p: 'b', t: 'd', c: 'c' };
const soften = (w) => (w.length > 2 && SOFT[w.at(-1)] ? w.slice(0, -1) + SOFT[w.at(-1)] : w);

function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // yer değiştiren iki harf tek hata sayılır: kitpa → kitap
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], before[j - 2] + 1);
    }
    before = prev;
    prev = row;
  }
  return prev[b.length];
}

// 0: eşleşmez, 3: aynı kelime, 2: ekli hali, 1: aranan kelime ekli, metindeki kök
function matchWord(term, word) {
  if (word === term) return 3;
  if (word.startsWith(term) || word.startsWith(soften(term))) return 2;
  if (word.length >= 3 && term.length - word.length <= 5 && (term.startsWith(word) || term.startsWith(soften(word)))) return 1;
  return 0;
}

function typoMatch(term, word) {
  if (term.length < 4) return false;
  const max = term.length >= 8 ? 2 : 1;
  return distance(term, word, max) <= max || distance(term, word.slice(0, term.length), max) <= max;
}

export function prepare(posts) {
  return posts.map((post) => {
    const fields = {
      title: fold(post.title),
      description: fold(post.description),
      body: fold(post.body),
    };
    return {
      ...post,
      fields,
      index: { title: words(fields.title), description: words(fields.description), body: words(fields.body) },
    };
  });
}

const WEIGHT = { title: 10, description: 3, body: 1 };

function scorePost(post, terms, matcher) {
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of ['title', 'description', 'body']) {
      let hits = 0;
      for (const { word } of post.index[field]) {
        const tier = matcher(term, word);
        if (tier) hits = Math.min(hits + tier, 15);
      }
      best += hits * WEIGHT[field];
    }
    if (!best) return 0; // her kelime bulunmalı
    total += best;
  }
  return total;
}

function run(prepared, terms, matcher) {
  return prepared
    .map((post) => ({ post, score: scorePost(post, terms, matcher) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function highlight(original, spans) {
  let html = '';
  let pos = 0;
  for (const [start, end] of spans) {
    html += escapeHtml(original.slice(pos, start)) + '<mark>' + escapeHtml(original.slice(start, end)) + '</mark>';
    pos = end;
  }
  return html + escapeHtml(original.slice(pos));
}

function snippet(post, terms, matcher, size = 180) {
  const original = post.body.normalize('NFC');
  const hits = post.index.body.filter(({ word }) => terms.some((t) => matcher(t, word)));
  if (!hits.length) return escapeHtml(post.description);
  let start = Math.max(0, hits[0].at - 60);
  if (start > 0) start = original.indexOf(' ', start) + 1;
  let end = Math.min(original.length, start + size);
  if (end < original.length) {
    const space = original.lastIndexOf(' ', end);
    if (space > start) end = space;
  }
  const spans = hits
    .filter((h) => h.at >= start && h.at + h.word.length <= end)
    .map((h) => [h.at - start, h.at - start + h.word.length]);
  return (start > 0 ? '… ' : '') + highlight(original.slice(start, end), spans) + (end < original.length ? ' …' : '');
}

export function search(prepared, query) {
  const terms = words(fold(query)).map((w) => w.word);
  if (!terms.length) return [];
  let matcher = matchWord;
  let found = run(prepared, terms, matcher);
  if (!found.length) {
    matcher = (t, w) => matchWord(t, w) || (typoMatch(t, w) ? 1 : 0);
    found = run(prepared, terms, matcher);
  }
  return found.map(({ post }) => ({
    url: post.url,
    title: post.title,
    excerpt: snippet(post, terms, matcher),
  }));
}
