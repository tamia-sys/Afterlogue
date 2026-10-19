
/* AFTERLOGUE — PERSONAL LOG
   The three archive sections read existing authenticated Supabase data.
   Private notes and favorites live in the separately RLS-protected log_entries table.
   Notes remain private unless sharing preferences explicitly include them.
*/
(function () {
  'use strict';

  const catalogue = {"mean-girls":{"title":"Mean Girls","year":2004,"poster":"https://www.themoviedb.org/t/p/w1280/2ZkuQXvVhh45uSvkBej4S7Ix1NJ.jpg","category":"movies"},"moonlight":{"title":"Moonlight","year":2016,"poster":"https://www.themoviedb.org/t/p/w1280/qLnfEmPrDjJfPyyddLJPkXmshkp.jpg","category":"movies"},"jurassic-park":{"title":"Jurassic Park","year":1993,"poster":"https://image.tmdb.org/t/p/original/d9mtMGQDLANKieb9PbD3yK7xxzo.jpg","category":"movies"},"the-sound-of-music":{"title":"The Sound of Music","year":1965,"poster":"https://image.tmdb.org/t/p/original/pV7zAVpD6QpR5J1KihhTVNN7d0u.jpg","category":"movies"},"get-out":{"title":"Get Out","year":2017,"poster":"https://image.tmdb.org/t/p/original/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg","category":"movies"},"little-miss-sunshine":{"title":"Little Miss Sunshine","year":2006,"poster":"https://image.tmdb.org/t/p/original/niNdhTpPHSgw22tK0PLjQMV640v.jpg","category":"movies"},"the-truman-show":{"title":"The Truman Show","year":1998,"poster":"https://image.tmdb.org/t/p/original/nwBCPprRB4FzIQPTiSZ3HuF60mC.jpg","category":"movies"},"spirited-away":{"title":"Spirited Away","year":2001,"poster":"https://image.tmdb.org/t/p/original/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg","category":"movies"},"parasite":{"title":"Parasite","year":2019,"poster":"https://image.tmdb.org/t/p/original/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg","category":"movies"},"titanic":{"title":"Titanic","year":1997,"poster":"https://image.tmdb.org/t/p/original/5bTWA20cL9LCIGNpde4Epc2Ijzn.jpg","category":"movies"},"ex-machina":{"title":"Ex Machina","year":2014,"poster":"https://image.tmdb.org/t/p/original/4fsMsA9cWZDsOYUc4tidaBD4OBb.jpg","category":"movies"},"shrek":{"title":"Shrek","year":2001,"poster":"https://image.tmdb.org/t/p/original/o04jZs5SXhbvhqO4981W7KJXOWZ.jpg","category":"movies"},"malcolm-in-the-middle":{"title":"Malcolm in the Middle","year":2000,"poster":"https://www.themoviedb.org/t/p/w1280/uftxEWbn3OSykTy4DX4BrdVeiuv.jpg","category":"tv"},"abbott-elementary":{"title":"Abbott Elementary","year":2021,"poster":"https://www.themoviedb.org/t/p/w1280/nBe1e3JJEZ6veGrVXNF0fRoLu56.jpg","category":"tv"},"gilmore-girls":{"title":"Gilmore Girls","year":2000,"poster":"https://www.themoviedb.org/t/p/w1280/gwtzCwU2wdLLf8oejQu2TINiWfQ.jpg","category":"tv"},"insecure":{"title":"Insecure","year":2016,"poster":"https://www.themoviedb.org/t/p/w1280/sGMwPIE6m9QI3LzCRXnZG8opZtB.jpg","category":"tv"},"bridgerton":{"title":"Bridgerton","year":2020,"poster":"https://www.themoviedb.org/t/p/w1280/nmfeD2peJEgVHG30FdafSAmP8I9.jpg","category":"tv"},"gossip-girl":{"title":"Gossip Girl","year":2007,"poster":"https://www.themoviedb.org/t/p/w1280/mRvSUuU1VQQkZZ578jKJpcUCuL8.jpg","category":"tv"},"stranger-things":{"title":"Stranger Things","year":2016,"poster":"https://www.themoviedb.org/t/p/w1280/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg","category":"tv"},"chernobyl":{"title":"Chernobyl","year":2019,"poster":"https://www.themoviedb.org/t/p/w1280/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg","category":"tv"},"demon-slayer":{"title":"Demon Slayer","year":2019,"poster":"https://www.themoviedb.org/t/p/w1280/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg","category":"tv"},"avatar-the-last-airbender":{"title":"Avatar: The Last Airbender","year":2005,"poster":"https://www.themoviedb.org/t/p/w1280/yaGt4GIutpbXHsv48tWceWg6s56.jpg","category":"tv"},"love-island-usa":{"title":"Love Island USA","year":2019,"poster":"https://www.themoviedb.org/t/p/w1280/kU2y21cls8WargMaX7KI47URMjD.jpg","category":"tv"},"criminal-minds":{"title":"Criminal Minds","year":2005,"poster":"https://www.themoviedb.org/t/p/w1280/hWSb4UnIjlTvnvrP98NbFSO60HA.jpg","category":"tv"},"the-farewell":{"title":"The Farewell","year":2019,"poster":"images/posters/The%20Farewell.webp","category":"movies"},"booksmart":{"title":"Booksmart","year":2019,"poster":"images/posters/booksmart%20jpg.webp","category":"movies"},"perfect-days":{"title":"Perfect Days","year":2023,"poster":"images/posters/Perfect%20Days.webp","category":"movies"},"past-lives":{"title":"Past Lives","year":2023,"poster":"images/posters/PastLives.webp","category":"movies"},"aftersun":{"title":"Aftersun","year":2022,"poster":"images/posters/Aftersun.webp","category":"movies"},"knives-out":{"title":"Knives Out","year":2019,"poster":"images/posters/KnivesOut.webp","category":"movies"},"everything-everywhere-all-at-once":{"title":"Everything Everywhere All at Once","year":2022,"poster":"images/posters/EverythingEverywhere.webp","category":"movies"},"the-grand-budapest-hotel":{"title":"The Grand Budapest Hotel","year":2014,"poster":"images/posters/GrandBudapestHotel.webp","category":"movies"},"lady-bird":{"title":"Lady Bird","year":2017,"poster":"images/posters/LadyBird.webp","category":"movies"},"arrival":{"title":"Arrival","year":2016,"poster":"images/posters/Arrival.webp","category":"movies"},"whiplash":{"title":"Whiplash","year":2014,"poster":"images/posters/Whiplash.webp","category":"movies"},"the-florida-project":{"title":"The Florida Project","year":2017,"poster":"images/posters/FloridaProject.webp","category":"movies"},"gone-girl":{"title":"Gone Girl","year":2014,"poster":"images/posters/GoneGirl.webp","category":"movies"},"spider-man-into-the-spider-verse":{"title":"Spider-Man: Into the Spider-Verse","year":2018,"poster":"images/posters/SpiderVerse.webp","category":"movies"},"before-sunrise":{"title":"Before Sunrise","year":1995,"poster":"images/posters/%20BeforeSunrise.webp","category":"movies"},"mindhunter":{"title":"Mindhunter","year":2017,"poster":"images/posters/Mindhunter.webp","category":"tv"},"fullmetal-alchemist-brotherhood":{"title":"Fullmetal Alchemist: Brotherhood","year":2009,"poster":"images/posters/Fullmetal%20Alchemist.webp","category":"tv"},"station-eleven":{"title":"Station Eleven","year":2021,"poster":"images/posters/Station%20Eleven.webp","category":"tv"},"severance":{"title":"Severance","year":2022,"poster":"images/posters/Severance.webp","category":"tv"},"the-leftovers":{"title":"The Leftovers","year":2014,"poster":"images/posters/TheLeftovers.webp","category":"tv"},"the-bear":{"title":"The Bear","year":2022,"poster":"images/posters/TheBear.webp","category":"tv"},"fleabag":{"title":"Fleabag","year":2016,"poster":"images/posters/Fleabag.webp","category":"tv"},"succession":{"title":"Succession","year":2018,"poster":"images/posters/Succession.webp","category":"tv"},"atlanta":{"title":"Atlanta","year":2016,"poster":"images/posters/Atlanta.webp","category":"tv"},"dark":{"title":"Dark","year":2017,"poster":"images/posters/Dark.webp","category":"tv"},"the-good-place":{"title":"The Good Place","year":2016,"poster":"images/posters/TheGoodPlace.webp","category":"tv"},"sh-gun":{"title":"Shōgun","year":2024,"poster":"images/posters/Shogun.webp","category":"tv"},"breaking-bad":{"title":"Breaking Bad","year":2008,"poster":"images/posters/BreakingBad.webp","category":"tv"},"beef":{"title":"Beef","year":2023,"poster":"images/posters/Beef.webp","category":"tv"},"yellowjackets":{"title":"Yellowjackets","year":2021,"poster":"images/posters/Yellowjackets.webp","category":"tv"}};
  const client = window.afterlogueSupabase;
  const grid = document.getElementById('archive-grid');
  const empty = document.getElementById('archive-empty');
  const counter = document.getElementById('archive-count');
  const feedback = document.getElementById('archive-feedback');
  const tabs = Array.from(document.querySelectorAll('[data-archive-tab]'));
  const categories = Array.from(document.querySelectorAll('[data-archive-category]'));
  const dialog = document.getElementById('archive-dialog');
  const form = document.getElementById('archive-form');
  const fieldRating = document.getElementById('dialog-rating');
  const fieldNote = document.getElementById('dialog-note');
  const removeWatchlist = document.getElementById('dialog-remove-watchlist');
  const dialogError = document.getElementById('dialog-error');
  const saveButton = document.getElementById('dialog-save');
  const fieldSharePreference = document.getElementById('dialog-share-preference');
  const shareDialog = document.getElementById('archive-share-dialog');
  const shareIncludeNote = document.getElementById('share-include-note');
  const sharePreview = document.getElementById('share-preview');
  const settingsDialog = document.getElementById('archive-settings-dialog');
  const settingsDefault = document.getElementById('account-note-share-default');
  const settingsError = document.getElementById('share-settings-error');
  const settingsSave = document.getElementById('share-settings-save');
  let pendingShareRecord = null;

  const state = {
    user: null,
    currentTab: 'watched',
    category: 'movies',
    impressions: [],
    watchlist: [],
    metadata: [],
    openKey: null,
    saving: false,
    shareDefault: 'ask'
  };

  const validRatings = ['Loved', 'Liked', 'Okay', 'Not for me'];
  const tvKeys = new Set(Object.keys(catalogue)
    .filter(function (key) { return catalogue[key].category === 'tv'; }));

  function titleCase(key) {
    return key.split('-').filter(Boolean).map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join(' ');
  }

  function info(key, categoryOverride) {
    const data = catalogue[key] || {};
    return {
      key: key,
      title: data.title || titleCase(key),
      year: data.year || '',
      poster: data.poster || '',
      category: categoryOverride || data.category || (tvKeys.has(key) ? 'tv' : 'movies')
    };
  }

  function impression(key) {
    return state.impressions.find(function (item) { return item.title_key === key; }) || null;
  }
  function watchlistItem(key) {
    return state.watchlist.find(function (item) { return item.title_key === key; }) || null;
  }
  function metadata(key) {
    return state.metadata.find(function (item) { return item.title_key === key; }) || null;
  }

  function collection() {
    let base;
    if (state.currentTab === 'watched') base = state.impressions;
    else if (state.currentTab === 'watchlist') base = state.watchlist;
    else base = state.metadata.filter(function (item) { return item.is_favorite; });

    const seen = new Set();
    return base.filter(function (item) {
      if (seen.has(item.title_key)) return false;
      seen.add(item.title_key);
      const row = info(item.title_key, item.category || (metadata(item.title_key) || {}).category);
      return row.category === state.category;
    }).map(function (item) {
      return info(item.title_key, item.category || (metadata(item.title_key) || {}).category);
    });
  }

  function el(tag, className, textValue) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue !== undefined) node.textContent = textValue;
    return node;
  }

  function action(textValue, label, onClick) {
    const button = el('button', 'archive-action', textValue);
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.addEventListener('click', onClick);
    return button;
  }

  function showMessage(message) {
    feedback.textContent = message;
  }

  function buildCard(record) {
    const rated = impression(record.key);
    const extra = metadata(record.key);
    const card = el('article', 'archive-card');
    const poster = el('div', 'archive-poster');
    const posterFallback = el('span', 'archive-poster-fallback', record.title);
    poster.appendChild(posterFallback);
    if (record.poster) {
      const image = el('img');
      image.src = record.poster;
      image.alt = record.title + ' poster';
      image.loading = 'lazy';
      image.addEventListener('error', function () { image.remove(); });
      poster.appendChild(image);
    }
    card.appendChild(poster);

    const body = el('div', 'archive-card-body');
    const heading = el('div', 'archive-card-heading');
    heading.appendChild(el('h3', 'archive-card-title', record.title));
    const favorite = el('button', 'archive-favorite', extra && extra.is_favorite ? '♥' : '♡');
    favorite.type = 'button';
    favorite.setAttribute('aria-label', (extra && extra.is_favorite ? 'Remove ' : 'Add ') +
      record.title + (extra && extra.is_favorite ? ' from' : ' to') + ' Favorites');
    favorite.setAttribute('aria-pressed', String(Boolean(extra && extra.is_favorite)));
    favorite.title = 'Favorites';
    favorite.addEventListener('click', function () { toggleFavorite(record, favorite); });
    heading.appendChild(favorite);
    body.appendChild(heading);

    body.appendChild(el('p', 'archive-meta',
      (record.year || 'Year unavailable') + ' · ' + (record.category === 'tv' ? 'TV' : 'Film')));

    const ratingLabel = el('div', 'archive-rating');
    if (rated && validRatings.includes(rated.rating)) {
      const symbols = { 'Loved': '♥', 'Liked': '♡', 'Okay': '●', 'Not for me': '×' };
      ratingLabel.appendChild(el('span', 'archive-rating-icon', symbols[rated.rating]));
      ratingLabel.appendChild(document.createTextNode(rated.rating));
    } else {
      ratingLabel.classList.add('is-neutral');
      ratingLabel.textContent = state.currentTab === 'watchlist' ? 'Saved for later' : 'Not yet rated';
    }
    body.appendChild(ratingLabel);

    const controls = el('div', 'archive-actions');
    controls.appendChild(action('◉ Details', 'Edit details for ' + record.title,
      function () { openDetails(record); }));
    controls.appendChild(action('♧ Share', 'Share ' + record.title,
      function () { shareTitle(record); }));
    body.appendChild(controls);

    const note = el('div', 'archive-note');
    note.setAttribute('role', 'button');
    note.setAttribute('tabindex', '0');
    note.setAttribute('aria-label', 'Edit private note for ' + record.title);
    note.appendChild(el('span', 'archive-note-label', 'PRIVATE NOTE'));
    note.appendChild(el('p', 'archive-note-text',
      extra && extra.private_note ? extra.private_note : 'Add a private note…'));
    note.addEventListener('click', function () { openDetails(record); });
    note.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetails(record); }
    });
    body.appendChild(note);
    card.appendChild(body);
    return card;
  }

  function render() {
    tabs.forEach(function (button) {
      const active = button.dataset.archiveTab === state.currentTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    categories.forEach(function (button) {
      const active = button.dataset.archiveCategory === state.category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    grid.replaceChildren();
    const records = collection();
    counter.textContent = records.length + ' ' +
      (records.length === 1 ? 'STORY' : 'STORIES') + ' / ' +
      (state.currentTab === 'watchlist' ? 'WATCHLIST' : state.currentTab.toUpperCase());
    if (!records.length) {
      empty.hidden = false;
      grid.hidden = true;
      const kind = state.category === 'tv' ? 'series' : 'films';
      if (state.currentTab === 'watched') {
        empty.textContent = 'No ' + kind + ' in your watched collection yet. Your saved impressions will appear here.';
      } else if (state.currentTab === 'watchlist') {
        empty.replaceChildren();
        empty.appendChild(document.createTextNode('Your ' + kind + ' watchlist is empty. Save stories from '));
        const link = el('a', '', 'Discover');
        link.href = 'discover.html';
        empty.appendChild(link);
        empty.appendChild(document.createTextNode(' to see them here.'));
      } else {
        empty.textContent = 'No favorite ' + kind + ' yet. Select the heart on a story to keep it close.';
      }
      return;
    }
    empty.hidden = true;
    grid.hidden = false;
    records.forEach(function (record) { grid.appendChild(buildCard(record)); });
  }

  async function toggleFavorite(record, button) {
    if (!state.user || button.disabled) return;
    button.disabled = true;
    showMessage('');
    const existing = metadata(record.key);
    const updated = {
      user_id: state.user.id,
      title_key: record.key,
      category: record.category,
      private_note: existing ? existing.private_note : '',
      is_favorite: !(existing && existing.is_favorite),
      share_note_preference: (existing && existing.share_note_preference) || 'inherit',
      updated_at: new Date().toISOString()
    };
    try {
      const response = await client.from('log_entries').upsert(updated,
        { onConflict: 'user_id,title_key' });
      if (response.error) throw response.error;
      state.metadata = state.metadata.filter(function (item) { return item.title_key !== record.key; });
      state.metadata.unshift(updated);
      render();
      showMessage(updated.is_favorite ? 'Added to Favorites.' : 'Removed from Favorites.');
    } catch (error) {
      console.error('Afterlogue favorite update failed', error);
      button.disabled = false;
      showMessage('Could not update Favorites. Please try again.');
    }
  }

  function openDetails(record) {
    state.openKey = record.key;
    const rated = impression(record.key);
    const extra = metadata(record.key);
    document.getElementById('dialog-title').textContent = record.title;
    document.getElementById('dialog-meta').textContent =
      (record.year || 'Year unavailable') + ' · ' + (record.category === 'tv' ? 'TV' : 'Film');
    fieldRating.value = rated && validRatings.includes(rated.rating) ? rated.rating : '';
    fieldNote.value = extra ? extra.private_note : '';
    fieldSharePreference.value = extra ? (extra.share_note_preference || 'inherit') : 'inherit';
    removeWatchlist.hidden = !watchlistItem(record.key);
    dialogError.textContent = '';
    dialog.showModal();
  }

  async function saveDetails(event) {
    event.preventDefault();
    if (state.saving || !state.user || !state.openKey) return;
    const key = state.openKey;
    const oldRating = impression(key);
    const oldNote = metadata(key);
    const latest = info(key, (watchlistItem(key) || oldNote || {}).category);
    const wantedRating = fieldRating.value;
    const wantedNote = fieldNote.value.trim();
    const wantedSharePreference = fieldSharePreference.value;
    if (wantedNote.length > 4000) { dialogError.textContent = 'Keep your note under 4,000 characters.'; return; }

    state.saving = true;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';
    dialogError.textContent = '';

    try {
      if ((oldRating ? oldRating.rating : '') !== wantedRating) {
        if (wantedRating) {
          const result = await client.from('impressions').upsert({
            user_id: state.user.id, title_key: key, rating: wantedRating,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,title_key' });
          if (result.error) throw result.error;
          state.impressions = state.impressions.filter(function (row) { return row.title_key !== key; });
          state.impressions.unshift({ title_key: key, rating: wantedRating });
        } else if (oldRating) {
          const result = await client.from('impressions').delete()
            .eq('user_id', state.user.id).eq('title_key', key);
          if (result.error) throw result.error;
          state.impressions = state.impressions.filter(function (row) { return row.title_key !== key; });
        }
      }

      if (wantedNote !== (oldNote ? oldNote.private_note : '') ||
          wantedSharePreference !== (oldNote ? (oldNote.share_note_preference || 'inherit') : 'inherit')) {
        const row = {
          user_id: state.user.id, title_key: key, category: latest.category,
          private_note: wantedNote,
          is_favorite: Boolean(oldNote && oldNote.is_favorite),
          share_note_preference: wantedSharePreference,
          updated_at: new Date().toISOString()
        };
        const response = await client.from('log_entries').upsert(row,
          { onConflict: 'user_id,title_key' });
        if (response.error) throw response.error;
        state.metadata = state.metadata.filter(function (item) { return item.title_key !== key; });
        state.metadata.unshift(row);
      }

      dialog.close();
      render();
      showMessage('Your Log has been updated.');
    } catch (error) {
      console.error('Afterlogue Log save failed', error);
      dialogError.textContent = 'Could not save your changes. Please try again.';
    } finally {
      state.saving = false;
      saveButton.disabled = false;
      saveButton.textContent = 'Save changes';
    }
  }

  async function removeFromWatchlist() {
    const key = state.openKey;
    if (!key || !state.user || state.saving) return;
    state.saving = true;
    removeWatchlist.disabled = true;
    dialogError.textContent = '';
    try {
      const result = await client.from('watchlist').delete()
        .eq('user_id', state.user.id).eq('title_key', key);
      if (result.error) throw result.error;
      state.watchlist = state.watchlist.filter(function (row) { return row.title_key !== key; });
      dialog.close();
      render();
      showMessage('Removed from Watchlist.');
    } catch (error) {
      console.error('Afterlogue Watchlist removal failed', error);
      dialogError.textContent = 'Could not remove this story from Watchlist.';
    } finally {
      state.saving = false;
      removeWatchlist.disabled = false;
    }
  }

  function shareMessage(record, includeNote) {
    const rated = impression(record.key);
    const extra = metadata(record.key);
    const parts = [record.title + (record.year ? ' (' + record.year + ')' : '')];
    if (rated && validRatings.includes(rated.rating)) {
      parts.push('My impression: ' + rated.rating + '.');
    }
    if (includeNote && extra && extra.private_note && extra.private_note.trim()) {
      parts.push('My note:\n' + extra.private_note.trim());
    }
    parts.push('— Shared from Afterlogue');
    return parts.join('\n\n');
  }

  async function performShare(record, includeNote) {
    const message = shareMessage(record, includeNote);
    try {
      if (navigator.share) {
        await navigator.share({ title: record.title + ' — Afterlogue', text: message });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
        showMessage(includeNote
          ? 'Copied with your personal note.'
          : 'Copied without your personal note.');
      } else {
        const input = el('textarea');
        input.value = message;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        showMessage(copied ? 'Share text copied.' : 'Sharing is unavailable here.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') showMessage('Sharing is unavailable. Please try again.');
    }
  }

  function effectiveNotePreference(record) {
    const extra = metadata(record.key);
    const perStory = extra && extra.share_note_preference;
    if (perStory === 'ask' || perStory === 'include' || perStory === 'exclude') {
      return perStory;
    }
    return state.shareDefault;
  }

  function updateSharePreview() {
    if (!pendingShareRecord) return;
    sharePreview.textContent = shareMessage(pendingShareRecord, shareIncludeNote.checked);
  }

  function shareTitle(record) {
    const extra = metadata(record.key);
    const hasNote = Boolean(extra && extra.private_note && extra.private_note.trim());
    const preference = effectiveNotePreference(record);
    if (hasNote && preference === 'ask') {
      pendingShareRecord = record;
      shareIncludeNote.checked = false;
      updateSharePreview();
      shareDialog.showModal();
      return;
    }
    // Automatic inclusion is only possible after the member opts into it.
    performShare(record, hasNote && preference === 'include');
  }

  function openShareSettings() {
    const menu = document.querySelector('.account-menu');
    if (menu) menu.open = false;
    settingsDefault.value = state.shareDefault;
    settingsError.textContent = '';
    settingsDialog.showModal();
  }

  async function saveShareSettings(event) {
    event.preventDefault();
    if (!state.user || settingsSave.disabled) return;
    const chosen = settingsDefault.value;
    if (!['ask','include','exclude'].includes(chosen)) return;
    settingsSave.disabled = true;
    settingsSave.textContent = 'Saving…';
    settingsError.textContent = '';
    try {
      const result = await client.from('log_share_settings').upsert({
        user_id: state.user.id,
        note_share_default: chosen,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (result.error) throw result.error;
      state.shareDefault = chosen;
      settingsDialog.close();
      showMessage('Your sharing preference has been saved.');
    } catch (error) {
      console.error('Afterlogue sharing preferences save failed', error);
      settingsError.textContent = 'Unable to save sharing preference. Please try again.';
    } finally {
      settingsSave.disabled = false;
      settingsSave.textContent = 'Save preference';
    }
  }

  async function loadAccount() {
    if (!client) { showMessage('Unable to connect to Afterlogue. Refresh to try again.'); return; }
    const email = document.getElementById('account-email');
    const accountStatus = document.getElementById('account-status');
    const signout = document.getElementById('account-signout');
    try {
      const current = await client.auth.getUser();
      if (current.error) throw current.error;
      if (!current.data.user) { location.replace('signup.html?mode=signin'); return; }
      state.user = current.data.user;
      email.textContent = state.user.email || 'Afterlogue member';
      accountStatus.textContent = '● Signed in';
      signout.hidden = false;

      const result = await Promise.all([
        client.from('impressions').select('title_key,rating,updated_at')
          .eq('user_id', state.user.id).order('updated_at', { ascending: false }),
        client.from('watchlist').select('title_key,category,created_at')
          .eq('user_id', state.user.id).order('created_at', { ascending: false }),
        client.from('log_entries').select('title_key,category,private_note,is_favorite,share_note_preference,updated_at')
          .eq('user_id', state.user.id).order('updated_at', { ascending: false }),
        client.from('log_share_settings').select('note_share_default')
          .eq('user_id', state.user.id).maybeSingle()
      ]);
      const broken = result.find(function (r) { return r.error; });
      if (broken) throw broken.error;
      state.impressions = result[0].data || [];
      state.watchlist = result[1].data || [];
      state.metadata = result[2].data || [];
      state.shareDefault = (result[3].data && result[3].data.note_share_default) || 'ask';
      showMessage('');
      render();
    } catch (error) {
      console.error('Afterlogue Log loading error', error);
      counter.textContent = '';
      empty.hidden = false;
      empty.textContent = 'We could not load your collection. Refresh the page to try again.';
      showMessage('Your saved stories have not been changed.');
      accountStatus.textContent = 'Unable to load collection';
    }
  }

  tabs.forEach(function (button) {
    button.addEventListener('click', function () {
      state.currentTab = button.dataset.archiveTab;
      showMessage('');
      if (state.user) render();
    });
  });
  categories.forEach(function (button) {
    button.addEventListener('click', function () {
      state.category = button.dataset.archiveCategory;
      showMessage('');
      if (state.user) render();
    });
  });
  document.getElementById('dialog-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });
  form.addEventListener('submit', saveDetails);
  removeWatchlist.addEventListener('click', removeFromWatchlist);

  // A note never gets shared on the default "ask" path without this explicit choice.
  shareIncludeNote.addEventListener('change', updateSharePreview);
  document.getElementById('share-dialog-confirm').addEventListener('click', function () {
    if (!pendingShareRecord) return;
    const record = pendingShareRecord;
    const includeNote = shareIncludeNote.checked;
    pendingShareRecord = null;
    shareDialog.close();
    performShare(record, includeNote);
  });
  function closeShareDialog() { pendingShareRecord = null; shareDialog.close(); }
  document.getElementById('share-dialog-close').addEventListener('click', closeShareDialog);
  document.getElementById('share-dialog-cancel').addEventListener('click', closeShareDialog);
  shareDialog.addEventListener('close', function () { pendingShareRecord = null; });
  document.getElementById('log-sharing-settings-open').addEventListener('click', openShareSettings);
  document.getElementById('share-settings-close').addEventListener('click', function () {
    settingsDialog.close();
  });
  document.getElementById('share-settings-cancel').addEventListener('click', function () {
    settingsDialog.close();
  });
  document.getElementById('archive-settings-form').addEventListener('submit', saveShareSettings);

  document.getElementById('account-signout').addEventListener('click', async function () {
    try {
      const result = await client.auth.signOut();
      if (result.error) throw result.error;
      location.replace('index.html');
    } catch (error) {
      showMessage('Could not sign out. Please try again.');
    }
  });

  loadAccount();
})();
