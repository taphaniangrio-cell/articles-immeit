const KEYWORDS = [
  'AMDEC', 'RCM', 'fiabilité', 'GMAO', 'maintenance prédictive',
  'maintenance préventive', 'Industrie 4.0', 'jumeau numérique',
  'IoT industriel', 'maintenance conditionnelle', 'CMMS',
  'reliability', 'predictive maintenance', 'industrie 5.0',
  'asset management', 'vibration analysis', 'thermography',
  'oil analysis', 'condition monitoring', 'maintien en condition',
  'sûreté de fonctionnement', 'disponibilité', 'MTBF', 'FMEA',
];

const RSS_FEEDS = [
  // Anglophone
  { url: 'https://www.plantengineering.com/feed/', lang: 'en' },
  { url: 'https://www.reliabilityweb.com/feed/', lang: 'en' },
  { url: 'https://www.efficientplantmag.com/feed/', lang: 'en' },
  { url: 'https://www.maintenanceworld.com/feed/', lang: 'en' },
  { url: 'https://www.uptimeinstitute.com/feed', lang: 'en' },
  { url: 'https://www.controleng.com/feed/', lang: 'en' },
  { url: 'https://www.manufacturing.net/rss/38', lang: 'en' },
  { url: 'https://www.industryweek.com/feed/', lang: 'en' },

  // Francophone
  { url: 'https://www.techniques-ingenieur.fr/feed/actualites', lang: 'fr' },
  { url: 'https://www.usinenouvelle.com/rss/actualites.xml', lang: 'fr' },
  { url: 'https://www.industrie-technologies.com/feed/', lang: 'fr' },
  { url: 'https://www.industrie-mag.com/feed/', lang: 'fr' },
  { url: 'http://feeds.feedburner.com/IndustrieDuFutur', lang: 'fr' },

  // Google News searches (maintenance industrielle + GMAO)
  { url: 'https://news.google.com/rss/search?q=maintenance+industrielle+fiabilit%C3%A9+GMAO&hl=fr&gl=FR&ceid=FR:fr', lang: 'fr' },
  { url: 'https://news.google.com/rss/search?q=industrial+maintenance+reliability+prediction&hl=en&gl=US&ceid=US:en', lang: 'en' },
];

function extractTag(xml, tag, startIdx = 0) {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const s = xml.indexOf(open, startIdx);
  if (s === -1) return { value: '', end: startIdx };
  const contentStart = s + open.length;
  const e = xml.indexOf(close, contentStart);
  if (e === -1) return { value: '', end: startIdx };
  return { value: xml.slice(contentStart, e), end: e + close.length };
}

function extractCDATA(xml, tag, startIdx = 0) {
  const open = `<${tag}`;
  const s = xml.indexOf(open, startIdx);
  if (s === -1) return { value: '', end: startIdx };
  const closeBracket = xml.indexOf('>', s);
  if (closeBracket === -1) return { value: '', end: startIdx };
  const contentStart = closeBracket + 1;
  const close = `</${tag}>`;
  const e = xml.indexOf(close, contentStart);
  if (e === -1) return { value: '', end: startIdx };

  let raw = xml.slice(contentStart, e);
  const cdataMatch = raw.match(/<!\[CDATA\[(.*?)\]\]>/s);
  return { value: cdataMatch ? cdataMatch[1].trim() : raw.trim(), end: e + close.length };
}

function extractAttrLink(xml, startIdx = 0) {
  const open = `<link`;
  const s = xml.indexOf(open, startIdx);
  if (s === -1) return { value: '', end: startIdx };
  const close = `</link>`;
  const closeTag = xml.indexOf(close, s);
  const closeBracket = xml.indexOf('>', s);

  if (closeBracket === -1) return { value: '', end: startIdx };

  // <link>text</link>
  if (closeTag !== -1 && (closeTag < closeBracket || closeBracket === s + open.length)) {
    const start = s + open.length + 1;
    if (closeTag > start) {
      return { value: xml.slice(start, closeTag).trim(), end: closeTag + close.length };
    }
    return { value: '', end: closeTag + close.length };
  }

  // <link href="..." />
  const hrefMatch = xml.slice(s, closeBracket).match(/href="([^"]*)"/);
  if (hrefMatch) {
    const endTagEnd = closeBracket + 1;
    return { value: hrefMatch[1], end: endTagEnd };
  }

  return { value: '', end: closeBracket + 1 };
}

function parseRSS(xml) {
  const items = [];
  let pos = 0;

  while (true) {
    const itemStart = xml.indexOf('<item>', pos);
    if (itemStart === -1) break;
    const itemEnd = xml.indexOf('</item>', itemStart);
    if (itemEnd === -1) break;
    const block = xml.slice(itemStart, itemEnd + 7);

    const title = extractTag(block, 'title') || extractCDATA(block, 'title');
    const link = extractAttrLink(block);
    const desc = extractTag(block, 'description') || extractCDATA(block, 'description');
    const date = extractTag(block, 'pubDate');
    const guid = extractTag(block, 'guid');
    const dcDate = extractTag(block, 'dc:date');

    const cleanDesc = desc.value.replace(/<[^>]+>/g, '').replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1').trim();

    items.push({
      title: title.value,
      link: link.value || guid.value,
      description: cleanDesc,
      pubDate: date.value || dcDate.value,
    });

    pos = itemEnd + 7;
  }

  return items;
}

function filterByKeywords(items) {
  const results = [];
  for (const item of items) {
    const text = (item.title + ' ' + item.description).toLowerCase();
    if (KEYWORDS.some(k => text.includes(k.toLowerCase()))) {
      results.push(item);
    }
  }
  return results;
}

async function fetchRSS(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IMMEIT-Articles/1.0; +https://github.com/taphaniangrio-cell/articles-immeit)' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNews() {
  const allItems = [];

  for (const feed of RSS_FEEDS) {
    try {
      const xml = await fetchRSS(feed.url);
      const items = parseRSS(xml);
      const filtered = filterByKeywords(items);

      for (const item of filtered) {
        allItems.push({
          titre: item.title,
          url: item.link,
          source: new URL(feed.url).hostname,
          date: item.pubDate,
          resume: item.description.slice(0, 300),
        });
      }
    } catch {
      continue;
    }
  }

  const seen = new Set();
  return allItems
    .filter(i => {
      const k = i.titre.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 20);
}

module.exports = { fetchNews, RSS_FEEDS };
