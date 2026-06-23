const PEXELS_API = 'https://api.pexels.com/v1/search';
const API_KEY = process.env.PEXELS_API_KEY;

const MAINTENANCE_KEYWORDS = [
  'industrial maintenance', 'factory engineer', 'industrial machinery',
  'manufacturing plant', 'industry technician', 'GMAO maintenance',
  'industrial equipment', 'factory worker', 'industry 4.0',
  'industrial automation', 'mechanical engineering', 'machine maintenance',
  'industrial safety', 'technical inspection', 'industrial dashboard',
];

function pickKeywords(title, hashtags, corps) {
  const words = [
    ...(title || '').toLowerCase().split(/\s+/),
    ...(hashtags || []).map(h => h.replace('#', '').toLowerCase()),
    ...(corps || '').toLowerCase().split(/\s+/).filter(w => w.length > 5),
  ];

  const scored = MAINTENANCE_KEYWORDS.map(kw => ({
    keyword: kw,
    score: words.filter(w => w.includes(kw.split(' ')[0])).length,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.keyword);
}

async function fetchImage(query) {
  if (!API_KEY) return null;

  try {
    const url = `${PEXELS_API}?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const res = await fetch(url, {
      headers: { Authorization: API_KEY },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.photos?.length) return null;

    const photo = data.photos[0];
    return {
      url: photo.src.large || photo.src.medium,
      photographer: photo.photographer,
      photographer_url: photo.photographer_url,
      alt: photo.alt || query,
    };
  } catch {
    return null;
  }
}

async function findImageForArticle({ titre_interne, hashtags, corps }) {
  const keywords = pickKeywords(titre_interne, hashtags, corps);
  for (const kw of keywords) {
    const result = await fetchImage(kw);
    if (result) return result;
  }
  return null;
}

module.exports = { findImageForArticle };
