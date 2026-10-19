/* AFTERLOGUE — DISCUSS / SHARED PAGE BEHAVIOR */
(() => {
  'use strict';
  const client = window.afterlogueSupabase;
  const byId = id => document.getElementById(id);
  const make = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  const fmtDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? '' : date.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };
  const showSpoilerText = (container, value) => {
    container.replaceChildren();
    const chunks = String(value || '').split(/(\|\|[\s\S]*?\|\|)/g);
    chunks.forEach(chunk => {
      if (chunk.startsWith('||') && chunk.endsWith('||') && chunk.length > 4) {
        const btn = make('button', 'discuss-spoiler-inline', 'Spoiler — reveal');
        btn.type = 'button';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Reveal marked spoiler');
        const spoiler = chunk.slice(2, -2);
        btn.addEventListener('click', () => {
          const reveal = btn.getAttribute('aria-expanded') !== 'true';
          btn.setAttribute('aria-expanded', String(reveal));
          btn.setAttribute('aria-label', reveal ? 'Hide spoiler' : 'Reveal marked spoiler');
          btn.textContent = reveal ? spoiler : 'Spoiler — reveal';
        });
        container.appendChild(btn);
      } else {
        container.appendChild(document.createTextNode(chunk));
      }
    });
  };
  const initAccount = async () => {
    if (!client) throw new Error('Afterlogue connection is unavailable.');
    const {data, error} = await client.auth.getUser();
    if (error) console.warn('Discuss authentication lookup', error);
    const user = error ? null : data.user;
    const email = byId('account-email');
    const status = byId('account-status');
    if (email) email.textContent = user ? (user.email || 'Afterlogue member') : 'Browsing as guest';
    if (status) status.textContent = user ? '● Signed in' : 'Reading public conversations';
    if (byId('account-signout')) {
      const out = byId('account-signout');
      out.hidden = !user;
      out.addEventListener('click', async () => {
        const result = await client.auth.signOut();
        if (!result.error) location.assign('index.html');
      });
    }
    if (byId('account-signin')) byId('account-signin').hidden = !!user;
    return user;
  };
  window.AfterlogueDiscuss = Object.freeze({
    client, byId, make, fmtDate, showSpoilerText, initAccount
  });
})();