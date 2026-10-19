/* Afterlogue / A conversation is a page, with responses beneath it. */
(async () => {
  'use strict';
  const { client, byId: $, make, fmtDate, showSpoilerText, initAccount } = window.AfterlogueDiscuss;
  const status = $('thread-status');
  const thread = $('conversation-article');
  const comments = $('comments-section');
  const list = $('comment-list');
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || '';
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  let user = null;
  let currentThread = null;
  let busy = false;
  let imageUrl = null;
  const joinButton = $('join-conversation');
  const replySection = $('reply-section');

  joinButton.addEventListener('click', () => {
    const opening = replySection.hidden;
    replySection.hidden = !opening;
    $('reply-form').hidden = !opening;
    joinButton.setAttribute('aria-expanded', String(opening));
    joinButton.textContent = opening ? 'Close reply ×' : 'Join the conversation ↘';
    if (opening) $('reply-text').focus();
  });

  async function showDiscussionImage(t) {
    const figure = $('thread-image-figure');
    figure.hidden = true;
    if (!t.image_path) return;
    try {
      // Storage read permissions enforce guest/public versus member-only threads.
      const signed = await client.storage.from('discussion-images').createSignedUrl(t.image_path, 3600);
      if (signed.error || !signed.data || !signed.data.signedUrl) throw signed.error || Error('Image unavailable');
      imageUrl = signed.data.signedUrl;
      $('thread-image').src = imageUrl;
      $('thread-image').alt = t.image_alt || 'Image accompanying this conversation';
      $('thread-image-caption').textContent = t.image_alt || '';
      figure.hidden = false;
    } catch (error) {
      console.warn('Could not display discussion image', error);
      figure.hidden = true;
    }
  }

  function displayStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }
  function drawReply(reply) {
    const row = make('article', 'discuss-comment');
    row.appendChild(make('div', 'discuss-avatar', '◌'));
    const content = make('div');
    const byline = make('div', 'discuss-comment-byline');
    byline.appendChild(make('span', 'discuss-comment-author',
      user && reply.author_id === user.id ? 'You' : 'Afterlogue member'));
    byline.appendChild(make('span', 'discuss-comment-date', fmtDate(reply.created_at)));
    content.appendChild(byline);
    const body = make('p', 'discuss-comment-text');
    showSpoilerText(body, reply.body);
    content.appendChild(body);
    row.appendChild(content);
    return row;
  }

  async function loadReplies() {
    if (!currentThread) return;
    try {
      const { data, error } = await client.from('discussion_replies')
        .select('id,author_id,body,created_at')
        .eq('thread_id', currentThread.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true }).limit(200);
      if (error) throw error;
      list.replaceChildren();
      const entries = data || [];
      $('comment-count').textContent = entries.length +
        (entries.length === 1 ? ' RESPONSE' : ' RESPONSES');
      if (!entries.length) {
        list.appendChild(make('p', 'discuss-no-comments',
          'No responses yet. A conversation begins with a first perspective.'));
      } else {
        entries.forEach(reply => list.appendChild(drawReply(reply)));
      }
    } catch (error) {
      console.error('Could not load discussion replies', error);
      list.replaceChildren(make('p', 'discuss-no-comments',
        'Responses are unavailable right now. Try refreshing the page.'));
    }
  }

  function renderThread(t) {
    currentThread = t;
    const title = t.title || 'Conversation';
    document.title = (t.has_spoilers ? 'Spoiler-marked conversation' : title) + ' — Afterlogue';
    $('thread-heading').textContent = t.has_spoilers ? 'A conversation with spoilers.' : title;
    $('thread-category').textContent =
      t.kind === 'general' ? 'Open conversation' :
      (t.work_type === 'tv' ? 'TV' : 'Film') + ' · ' + (t.work_title || '');
    $('thread-byline').textContent = t.author_id ? 'Afterlogue member' : 'Afterlogue';
    $('thread-date').textContent = fmtDate(t.created_at);
    $('thread-spoiler-label').hidden = !t.has_spoilers;
    const content = $('thread-content');
    content.replaceChildren();
    content.hidden = Boolean(t.has_spoilers);
    $('spoiler-warning').hidden = !t.has_spoilers;
    if (!t.has_spoilers) showSpoilerText(content, t.body);
    $('reveal-thread').addEventListener('click', () => {
      $('thread-heading').textContent = title;
      document.title = title + ' — Afterlogue';
      showSpoilerText(content, t.body);
      content.hidden = false;
      $('spoiler-warning').hidden = true;
      comments.hidden = false;
      joinButton.hidden = !user;
      $('join-signin').hidden = Boolean(user);
      showDiscussionImage(t);
    }, { once: true });
    $('report-conversation').hidden = !user;
    $('reply-form').hidden = true;
    replySection.hidden = true;
    joinButton.setAttribute('aria-expanded', 'false');
    joinButton.hidden = !user || t.has_spoilers;
    $('join-signin').hidden = Boolean(user) || t.has_spoilers;
    thread.hidden = false;
    comments.hidden = Boolean(t.has_spoilers);
    if (!t.has_spoilers) showDiscussionImage(t);
    displayStatus('');
  }

  $('reply-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!user || !currentThread || busy) return;
    const raw = $('reply-text').value.trim();
    if (raw.length < 2 || raw.length > 2000) return;
    const reply = $('reply-is-spoiler').checked ? '||' + raw + '||' : raw;
    if (reply.length > 2000) {
      $('reply-message').textContent = 'Keep your response under 2,000 characters, including spoiler markers.';
      return;
    }
    busy = true;
    $('reply-send').disabled = true;
    $('reply-message').textContent = 'Publishing…';
    try {
      const {error} = await client.from('discussion_replies').insert({
        thread_id: currentThread.id,
        author_id: user.id,
        body: reply
      });
      if (error) throw error;
      $('reply-text').value = '';
      $('reply-is-spoiler').checked = false;
      $('reply-message').textContent = 'Your response was posted.';
      await loadReplies();
    } catch (error) {
      console.error('Posting discussion response failed', error);
      $('reply-message').textContent = 'We could not post your response. Please try again.';
    } finally {
      busy = false;
      $('reply-send').disabled = false;
    }
  });

  $('report-conversation').addEventListener('click', () => {
    if (user && currentThread) $('report-dialog').showModal();
  });
  $('report-cancel').addEventListener('click', () => $('report-dialog').close());
  $('report-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!user || !currentThread) return;
    const btn = $('report-submit');
    btn.disabled = true;
    $('report-message').textContent = '';
    try {
      const {error} = await client.from('discussion_reports').insert({
        reporter_id: user.id,
        thread_id: currentThread.id,
        reason: $('report-reason').value
      });
      if (error) throw error;
      $('report-message').textContent = 'Report sent for review.';
    } catch (error) {
      console.error('Reporting discussion failed', error);
      $('report-message').textContent = 'Could not send this report. Please try again.';
    } finally {
      btn.disabled = false;
    }
  });

  try {
    user = await initAccount();
    if (!validId) {
      displayStatus('We couldn’t find that conversation. Return to Discuss to browse available topics.');
      return;
    }
    const {data, error} = await client.from('discussion_threads')
      .select('id,author_id,kind,work_title,work_type,title,body,has_spoilers,is_featured,image_path,image_alt,created_at')
      .eq('id', id).eq('is_hidden', false).maybeSingle();
    if (error) throw error;
    if (!data) {
      if (!user) {
        displayStatus('');
        $('member-only').hidden = false;
      } else {
        displayStatus('This conversation is unavailable or has been removed.');
      }
      return;
    }
    renderThread(data);
    await loadReplies();
  } catch (error) {
    console.error('Loading a discussion failed', error);
    displayStatus('Unable to open this conversation. Please try again in a moment.');
  }
})();