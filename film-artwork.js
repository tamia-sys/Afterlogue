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
  // Best-effort source for three distinct, landscape movie stills across the full
  // catalog. IMDbAPI's public image service is optional; failures never replace
  // the curated film artwork with unrelated images or posters.
  const galleryPending = new Map();
  const galleryCachePrefix = 'afterlogue:film-stills:v2:';
  const usableStill = record => {
    if (!record || typeof record !== 'object') return null;
    const type = String(record.type || record.imageType || record.kind || '').toLowerCase();
    if (type && (/poster|key.art|logo|portrait|event|behind.the.scenes|publicity|product|production.art/.test(type))) return null;
    if (type && !(/still|scene|frame/.test(type))) return null;
    const picture = record.image && typeof record.image === 'object' ? record.image : record;
    const url = picture.url || picture.imageUrl || picture.src || record.originalUrl || '';
    if (typeof url !== 'string') return null;
    try {
      const addr = new URL(url);
      if (addr.protocol !== 'https:' ||
          !['m.media-amazon.com','image.tmdb.org','images.metahub.space','images.stremio.com'].includes(addr.hostname)) return null;
    } catch (_) { return null; }
    const width = Number(picture.width || record.width || 0);
    const height = Number(picture.height || record.height || 0);
    if (width && height && (width < 320 || height < 180 || width / height < 1.25)) return null;
    return url;
  };
  async function resolveGallery(title, year, isTV) {
    const type = isTV ? 'series' : 'movie';
    const key = galleryCachePrefix + type + ':' + normalized(title) + ':' + String(year || '');
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (cached && Array.isArray(cached.urls) && Date.now() - cached.at < 7*24*3600*1000)
        return cached.urls;
    } catch (_) {}
    if (galleryPending.has(key)) return galleryPending.get(key);
    const task = (async () => {
      try {
        const results = await requestJson(ROOT + '/catalog/' + type + '/top/search=' + encodeURIComponent(title) + '.json');
        const y = Number(year);
        const candidates = (results.metas || []).filter(entry =>
          normalized(entry.name) === normalized(title) && /^tt\d+$/.test(entry.id || ''));
        const entryYear = entry => Number(String(entry.releaseInfo || entry.year || '').slice(0,4));
        candidates.sort((a,b) => Math.abs(entryYear(a)-y) - Math.abs(entryYear(b)-y));
        const chosen = candidates.find(entry => !y || !entryYear(entry) || Math.abs(entryYear(entry)-y) <= 2);
        if (!chosen) return [];
        const images = await requestJson('https://api.imdbapi.dev/titles/' + encodeURIComponent(chosen.id) + '/images?pageSize=60');
        const rows = Array.isArray(images.images) ? images.images :
          Array.isArray(images.images?.items) ? images.images.items :
          Array.isArray(images.data?.images?.items) ? images.data.images.items :
          Array.isArray(images.data?.images) ? images.data.images :
          Array.isArray(images.items) ? images.items : [];
        const seen = new Set();
        const urls = rows.map(usableStill).filter(url => {
          if (!url) return false;
          const key = url.split('?')[0];
          if (seen.has(key)) return false;
          seen.add(key); return true;
        }).slice(0,12);
        if (urls.length) {
          try { localStorage.setItem(key, JSON.stringify({at:Date.now(),urls})); } catch (_) {}
        }
        return urls;
      } catch (error) {
        console.warn('Optional film stills lookup unavailable for', title, error);
        return [];
      }
    })();
    galleryPending.set(key, task);
    try { return await task; } finally { galleryPending.delete(key); }
  }
  window.AfterlogueFilmArtwork = Object.freeze({resolve,resolveGallery});
})();
