/* AFTERLOGUE — TEXT-FREE CINEMATIC ARTWORK
 * Fetches the real film/TV backdrop instead of a poster with lettering.
 * Matches the title and release year before using a result.
 * Only public title/year information is sent; no member or account data.
 */
(() => {
  'use strict';
  const ROOT = 'https://v3-cinemeta.strem.io';
  const PREFIX = 'afterlogue:film-artwork:v1:';
  const MAX_AGE = 21 * 24 * 60 * 60 * 1000;
  const normalized = value => String(value || '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const pending = new Map();
  const validImage = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (
        url.hostname === 'image.tmdb.org' ||
        url.hostname === 'images.metahub.space' ||
        url.hostname === 'images.stremio.com'
      );
    } catch (_) { return false; }
  };
  async function requestJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8500);
    try {
      const response = await fetch(url, {signal: controller.signal});
      if (!response.ok) throw new Error('Artwork service unavailable');
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async function resolve(title, year, isTV) {
    const type = isTV ? 'series' : 'movie';
    const cacheKey = PREFIX + type + ':' + normalized(title) + ':' + String(year || '');
    try {
      const saved = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (saved && Date.now() - saved.at < MAX_AGE) return saved.image || null;
    } catch (_) {}
    if (pending.has(cacheKey)) return pending.get(cacheKey);
    const task = (async () => {
      try {
        const searchUrl = ROOT + '/catalog/' + type + '/top/search=' + encodeURIComponent(title) + '.json';
        const search = await requestJson(searchUrl);
        const candidates = (search.metas || []).filter(entry =>
          normalized(entry.name) === normalized(title) && /^tt\d+$/.test(entry.id || '')
        );
        const release = entry => Number(String(entry.releaseInfo || entry.year || '').slice(0, 4));
        const target = Number(year);
        candidates.sort((a,b) => Math.abs(release(a)-target)-Math.abs(release(b)-target));
        const match = candidates.find(entry => !target || !release(entry) || Math.abs(release(entry)-target) <= 2);
        if (!match) return null;
        const full = await requestJson(ROOT + '/meta/' + type + '/' + match.id + '.json');
        const image = validImage(full.meta?.background) ? full.meta.background : null;
        try { localStorage.setItem(cacheKey, JSON.stringify({image,at:Date.now()})); } catch (_) {}
        return image;
      } catch (error) {
        console.warn('Could not load cinematic artwork for', title, error);
        return null;
      }
    })();
    pending.set(cacheKey, task);
    try { return await task; } finally { pending.delete(cacheKey); }
  }
  window.AfterlogueFilmArtwork = Object.freeze({resolve});
})();
