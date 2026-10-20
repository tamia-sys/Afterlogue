/* Afterlogue / Discuss conversation index
   Discussion cards navigate within the website, never open modal dialogs.
*/
(async () => {
  'use strict';
  const { client, byId: $, make, fmtDate, initAccount } = window.AfterlogueDiscuss;
  const list = $('discuss-list');
  const status = $('discuss-notice');
  const state = { user: null, threads: [], teasers: [], filter: 'all', authors: new Map() };

  const threadUrl = id => 'discuss-thread.html?id=' + encodeURIComponent(id);
  const excerpt = (text, spoiler) => {
    if (spoiler) return 'Spoilers marked · Open the conversation when you’re ready.';
    const safe = String(text || '').replace(/\|\|[\s\S]*?\|\|/g, '[spoiler hidden]');
    return safe.length > 185 ? safe.slice(0, 182) + '…' : safe;
  };

  function addRow(t) {
    const row = make('article', 'discuss-thread');
    const copy = make('div', 'discuss-thread-copy');
    const type = t.kind === 'general' ? 'GENERAL DISCUSSION' : 'FILM & TV / MEMBERS';
    copy.appendChild(make('p', 'discuss-kicker', type));
    const heading = make('h3');
    const title = make('a', 'discuss-thread-title', t.has_spoilers ? 'Spoiler-marked conversation' : t.title);
    title.href = threadUrl(t.id);
    heading.appendChild(title);
    copy.appendChild(heading);
    copy.appendChild(make('p', 'discuss-thread-excerpt', excerpt(t.body, t.has_spoilers)));
    const meta = make('p', 'discuss-meta');
    if (t.author_id) {
      meta.append(document.createTextNode('Created by: '));
      const author = make('a', 'discuss-author-link');
      author.href = 'member-profile.html?id=' + encodeURIComponent(t.author_id);
      const profile = state.authors.get(t.author_id);
      author.textContent = profile?.username ? '@' + profile.username : 'Afterlogue member';
      author.setAttribute('aria-label', 'View the creator\'s profile');
      author.style.cssText = 'color:#d4bc91;text-decoration:none;border-bottom:1px solid rgba(212,188,145,.4)';
      meta.append(author);
    } else {
      meta.append(document.createTextNode('Afterlogue'));
    }
    meta.append(document.createTextNode(' / ' + fmtDate(t.created_at)));
    copy.appendChild(meta);
    const link = make('a', 'discuss-open', 'Read conversation  ↗');
    link.href = threadUrl(t.id);
    link.setAttribute('aria-label', t.has_spoilers ? 'Read spoiler-marked conversation' : 'Read ' + t.title);
    row.appendChild(copy);
    row.appendChild(link);
    list.appendChild(row);
  }

  function addGuestTeaser(t) {
    const row = make('article', 'discuss-thread discuss-locked-thread');
    const copy = make('div', 'discuss-thread-copy');
    copy.appendChild(make('p', 'discuss-kicker', 'FILM & TV / MEMBERS ONLY'));
    copy.appendChild(make('h3', '', t.work_title));
    copy.appendChild(make('p', 'discuss-thread-excerpt',
      'A dedicated ' + (t.work_type === 'tv' ? 'TV' : 'film') +
      ' conversation. Sign in to read and take part.'));
    const link = make('a', 'discuss-open', 'Members only  ↗');
    link.href = 'signup.html?mode=signin';
    link.setAttribute('aria-label', 'Sign in to read conversations about ' + t.work_title);
    row.appendChild(copy);
    row.appendChild(link);
    list.appendChild(row);
  }

  function render() {
    list.replaceChildren();
    const visible = state.threads.filter(t =>
      !t.is_featured && (state.filter === 'all' || t.kind === state.filter));
    visible.forEach(addRow);
    if (!state.user && state.filter !== 'general') {
      state.teasers.forEach(addGuestTeaser);
    }
    if (!list.children.length) {
      list.appendChild(make('p', 'discuss-empty',
        state.filter === 'title'
          ? 'No film- or TV-specific conversations here yet.'
          : 'The floor is open. Start a conversation about cinema or television.'));
    }
    document.querySelectorAll('[data-filter]').forEach(button => {
      const selected = button.dataset.filter === state.filter;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  document.querySelectorAll('[data-filter]').forEach(button =>
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      render();
    })
  );

  try {
    state.user = await initAccount();
    $('discuss-guest-caption').hidden = Boolean(state.user);
    const {data, error} = await client.from('discussion_threads')
      .select('id,kind,title,body,has_spoilers,is_featured,created_at,author_id')
      .eq('is_hidden',false)
      .order('created_at',{ascending:false}).limit(100);
    if (error) throw error;
    state.threads = data || [];
    // Batch-load public handles once so conversation cards never expose private Log data.
    const authorIds = [...new Set(state.threads.map(t => t.author_id).filter(Boolean))];
    if (authorIds.length) {
      const {data:members,error:membersError}=await client.from('member_profiles')
        .select('user_id,username').in('user_id',authorIds);
      if (membersError) console.warn('Could not load public author handles',membersError);
      else for (const member of members || []) state.authors.set(member.user_id,member);
    }

    if (!state.user) {
      const {data: teaserData, error: teaserError} = await client
        .from('discussion_title_teasers')
        .select('id,work_title,work_type')
        .order('created_at',{ascending:false})
        .limit(25);
      if (teaserError) throw teaserError;
      state.teasers = teaserData || [];
    }

    const featured = state.threads.find(t => t.is_featured);
    if (featured) {
      $('featured-title').textContent = featured.title;
      $('featured-description').textContent = excerpt(featured.body, featured.has_spoilers);
      $('featured-open').href = threadUrl(featured.id);
      $('featured-open').removeAttribute('aria-disabled');
    } else {
      $('featured-panel').hidden = true;
    }
    render();
    status.textContent = '';
  } catch (error) {
    console.error('Loading Afterlogue discussions failed', error);
    list.replaceChildren(make('p', 'discuss-empty',
      'Conversations are unavailable right now. Try refreshing this page.'));
    status.textContent = '';
    $('featured-open').setAttribute('aria-disabled','true');
  }
})();