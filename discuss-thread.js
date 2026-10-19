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
  const IMAGE_TOKEN = '[[afterlogue:image]]';
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

  function populateConversation(t) {
    const body = $('thread-content');
    const figure = $('thread-image-figure');
    figure.hidden = true;
    body.replaceChildren();
    const parts = String(t.body || '').replace(/^\[\[afterlogue:title-size:\d{2}\]\]/,'').replace(/^\[\[afterlogue:visual:\d{2},-?\d{1,3},\d{2,3}\]\]/,'').replace(/^\[\[afterlogue:body-size:\d{2}\]\]/,'').split(IMAGE_TOKEN);
    parts.forEach((part,index) => {
      if (part) {
        const block = make('div','discuss-article-text');
        showSpoilerText(block,part);
        body.appendChild(block);
      }

    });

    if (t.image_path) showDiscussionImage(t);
  }

  async function showDiscussionImage(t) {
    const figure = $('thread-image-figure');
    figure.hidden = true;
    if (!t.image_path) return;
    try {
      const signed = await client.storage.from('discussion-images').createSignedUrl(t.image_path,3600);
      if (signed.error || !signed.data?.signedUrl) throw signed.error || Error('Unavailable');
      imageUrl = signed.data.signedUrl;
      $('thread-image').src = imageUrl;
      $('thread-image').alt = t.image_alt || 'Image accompanying this conversation';
      $('thread-image-caption').textContent = t.image_alt || '';
      if (currentThread?.id === t.id) figure.hidden = false;
    } catch (error) {
      console.warn('Unable to load conversation image',error);
      figure.hidden = true;
    }
  }

  function displayStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }
  function drawReply(reply) {
    const row = make('article','discuss-comment');
    row.appendChild(make('div','discuss-avatar','◌'));
    const content = make('div');
    const byline = make('div','discuss-comment-byline');
    const owner = Boolean(user && reply.author_id === user.id);
    byline.appendChild(make('span','discuss-comment-author',owner ? 'You' : 'Afterlogue member'));
    byline.appendChild(make('span','discuss-comment-date',fmtDate(reply.created_at)));
    if (reply.edited_at) byline.appendChild(make('span','discuss-comment-edited','Edited'));
    content.appendChild(byline);
    const body = make('p','discuss-comment-text');
    showSpoilerText(body,reply.body);
    content.appendChild(body);

    if (owner) {
      const actions = make('div','discuss-comment-actions');
      const editButton = make('button','discuss-comment-action','Edit');
      const deleteButton = make('button','discuss-comment-action discuss-comment-delete','Delete');
      editButton.type = deleteButton.type = 'button';
      const editForm = make('form','discuss-comment-editor');
      editForm.hidden = true;
      const area = make('textarea','discuss-entry-textarea');
      area.setAttribute('aria-label','Edit your reply');
      area.maxLength = 2000;
      area.required = true;
      const spoilerRow = make('label','discuss-checkbox-row');
      const spoilerCheckbox = make('input');
      spoilerCheckbox.type = 'checkbox';
      spoilerRow.append(spoilerCheckbox,document.createTextNode('This reply contains spoilers'));
      const controls = make('div','discuss-post-actions');
      const cancel = make('button','discuss-comment-action','Cancel');
      const save = make('button','discuss-primary','Save changes');
      cancel.type = 'button';
      save.type = 'submit';
      const msg = make('p','discuss-status-message');
      msg.setAttribute('role','status');
      controls.append(cancel,save);
      editForm.append(area,spoilerRow,controls,msg);
      editButton.addEventListener('click',() => {
        const whole = reply.body.startsWith('||') && reply.body.endsWith('||') && reply.body.length >= 6;
        area.value = whole ? reply.body.slice(2,-2) : reply.body;
        spoilerCheckbox.checked = whole;
        editForm.hidden = false;
        actions.hidden = true;
        body.hidden = true;
        area.focus();
      });
      cancel.addEventListener('click',() => {
        editForm.hidden = true;actions.hidden = false;body.hidden = false;
      });
      editForm.addEventListener('submit',async event => {
        event.preventDefault();
        const value = area.value.trim();
        const next = spoilerCheckbox.checked ? '||' + value + '||' : value;
        if (value.length < 2 || next.length > 2000) {
          msg.textContent = 'Your reply must be between 2 and 2,000 characters.';
          return;
        }
        save.disabled = true; msg.textContent = 'Saving…';
        try {
          const {error} = await client.from('discussion_replies').update({body:next})
            .eq('id',reply.id).eq('thread_id',currentThread.id).eq('author_id',user.id);
          if (error) throw error;
          await loadReplies();
        } catch (error) {
          console.error('Could not edit reply',error);
          msg.textContent = 'Your changes were not saved. Try again.';
          save.disabled = false;
        }
      });
      deleteButton.addEventListener('click',async () => {
        if (!window.confirm('Delete this reply permanently?')) return;
        deleteButton.disabled = true;
        try {
          const {error} = await client.from('discussion_replies').delete()
            .eq('id',reply.id).eq('thread_id',currentThread.id).eq('author_id',user.id);
          if (error) throw error;
          await loadReplies();
        } catch (error) {
          console.error('Could not delete reply',error);
          deleteButton.disabled = false;
        }
      });
      actions.append(editButton,deleteButton);
      content.append(actions,editForm);
    }
    row.appendChild(content);
    return row;
  }

  async function loadReplies() {
    if (!currentThread) return;
    try {
      const { data, error } = await client.from('discussion_replies')
        .select('id,author_id,body,created_at,edited_at')
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
    const bodySizeMatch = String(t.body || '').match(/\[\[afterlogue:body-size:(\d{2})\]\]/);
    $('thread-content').style.fontSize = (bodySizeMatch ? Math.max(12,Math.min(22,Number(bodySizeMatch[1]))) : 14)+'px';
    const visualMatch = String(t.body || '').match(/\[\[afterlogue:visual:(\d{2}),(-?\d{1,3}),(\d{2,3})\]\]/);
    const layout = document.querySelector('.discuss-thread-copy');
    if (visualMatch && layout) {
      const width = Math.max(30,Math.min(49,Number(visualMatch[1])));
      const offset = Math.max(-120,Math.min(180,Number(visualMatch[2])));
      const ratio = Math.max(.6,Math.min(2.4,Number(visualMatch[3])/100));
      layout.style.setProperty('--visual-width',width+'%');
      layout.style.setProperty('--visual-offset',offset+'px');
      layout.style.setProperty('--visual-ratio',String(ratio));
    }
    const titleMatch = String(t.body || '').match(/^\[\[afterlogue:title-size:(\d{2})\]\]/);
    $('thread-heading').style.setProperty('--conversation-title-size', (titleMatch ? Math.min(48,Math.max(24,Number(titleMatch[1]))) : 36) + 'px');
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
    if (!t.has_spoilers) populateConversation(t);
    $('reveal-thread').addEventListener('click', () => {
      $('thread-heading').textContent = title;
      document.title = title + ' — Afterlogue';
      populateConversation(t);
      content.hidden = false;
      $('spoiler-warning').hidden = true;
      comments.hidden = false;
      joinButton.hidden = !user;
      $('join-signin').hidden = Boolean(user);
    }, { once: true });
    $('report-conversation').hidden = !user;
    $('reply-form').hidden = true;
    replySection.hidden = true;
    joinButton.setAttribute('aria-expanded', 'false');
    joinButton.hidden = !user || t.has_spoilers;
    $('join-signin').hidden = Boolean(user) || t.has_spoilers;
    thread.hidden = false;
    comments.hidden = Boolean(t.has_spoilers);
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