/* Afterlogue / Full-page editorial conversation composer */
(async () => {
  'use strict';
  const {client, byId: $, showSpoilerText, initAccount} = window.AfterlogueDiscuss;
  const form = $('compose-form');
  const status = $('compose-message');
  let member = null;
  let saving = false;
  let draftKey = '';
  let selectedFile = null;
  let localImageUrl = null;
  const imageInput = $('compose-image');
  const imageAlt = $('compose-image-alt');
  const attachment = $('compose-image-attachment');
  const imagePreview = $('compose-image-preview');
  const coverPreview = $('compose-preview-image');
  const limitBytes = 5 * 1024 * 1024;
  const allowed = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  const imageStore = client.storage.from('discussion-images');

  function clearImage() {
    selectedFile = null;
    imageInput.value = '';
    imageAlt.value = '';
    imageAlt.required = false;
    attachment.hidden = true;
    coverPreview.hidden = true;
    imagePreview.removeAttribute('src');
    coverPreview.removeAttribute('src');
    if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    localImageUrl = null;
  }

  function updateSelectedImage(file) {
    if (!file) { clearImage(); return; }
    if (!Object.prototype.hasOwnProperty.call(allowed,file.type) || file.size > limitBytes || file.size <= 0) {
      clearImage();
      status.textContent = 'Choose a JPG, PNG, or WebP image smaller than 5 MB.';
      return;
    }
    if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    selectedFile = file;
    localImageUrl = URL.createObjectURL(file);
    imagePreview.src = localImageUrl;
    imagePreview.alt = 'Preview of selected discussion image';
    attachment.hidden = false;
    imageAlt.required = true;
    status.textContent = '';
  }

  imageInput.addEventListener('change', () => updateSelectedImage(imageInput.files && imageInput.files[0]));
  $('compose-image-remove').addEventListener('click', clearImage);
  window.addEventListener('pagehide', () => {
    if (localImageUrl) URL.revokeObjectURL(localImageUrl);
  });

  function workFields() {
    const specific = $('compose-kind').value === 'title';
    $('compose-title-fields').hidden = !specific;
    $('compose-work').required = specific;
  }

  function collect() {
    const kind = $('compose-kind').value === 'title' ? 'title' : 'general';
    return {
      kind,
      work: kind === 'title' ? $('compose-work').value.trim() : '',
      workType: $('compose-work-type').value,
      heading: $('compose-title').value.trim(),
      body: $('compose-content').value.trim(),
      hasSpoilers: $('compose-has-spoilers').checked
    };
  }

  function fill(draft) {
    if (!draft || typeof draft !== 'object') return;
    $('compose-kind').value = draft.kind === 'title' ? 'title' : 'general';
    $('compose-work').value = String(draft.work || '').slice(0, 120);
    $('compose-work-type').value = draft.workType === 'tv' ? 'tv' : 'film';
    $('compose-title').value = String(draft.heading || '').slice(0, 160);
    $('compose-content').value = String(draft.body || '').slice(0, 4000);
    $('compose-has-spoilers').checked = Boolean(draft.hasSpoilers);
    workFields();
  }

  function saveDraft() {
    if (!member) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(collect()));
      status.textContent = 'Text draft saved in this browser. Reattach your image before publishing.';
    } catch (error) {
      status.textContent = 'We couldn’t save locally. Your text is still here.';
    }
  }

  $('compose-kind').addEventListener('change', workFields);
  $('compose-save').addEventListener('click', saveDraft);

  $('compose-preview-toggle').addEventListener('click', () => {
    const container = $('compose-preview');
    const opening = container.hidden;
    container.hidden = !opening;
    $('compose-preview-toggle').textContent = opening ? 'Close preview' : 'Preview';
    if (!opening) return;
    $('preview-heading').textContent = $('compose-title').value.trim() || 'Your conversation title';
    coverPreview.hidden = !localImageUrl;
    if (localImageUrl) {
      coverPreview.src = localImageUrl;
      coverPreview.alt = imageAlt.value.trim() || 'Selected conversation image';
    }
    const body = $('preview-body');
    body.replaceChildren();
    const raw = $('compose-content').value.trim() || 'Your words will appear here.';
    if ($('compose-has-spoilers').checked) {
      const warning = document.createElement('p');
      warning.textContent = 'This conversation is marked as containing spoilers.';
      warning.className = 'discuss-form-help';
      body.appendChild(warning);
    }
    const txt = document.createElement('div');
    showSpoilerText(txt, raw);
    body.appendChild(txt);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!member || saving) return;
    const draft = collect();
    if (draft.heading.length < 5 || draft.heading.length > 160 ||
        draft.body.length < 10 || draft.body.length > 4000 ||
        (draft.kind === 'title' && (!draft.work || draft.work.length > 120))) {
      status.textContent = 'Please complete your title and conversation before publishing.';
      return;
    }
    if (selectedFile && !imageAlt.value.trim()) {
      status.textContent = 'Add a short description for your image before publishing.';
      imageAlt.focus();
      return;
    }
    saving = true;
    const btn = $('compose-publish');
    btn.disabled = true;
    status.textContent = 'Publishing your conversation…';
    let uploadedPath = null;
    try {
      if (selectedFile) {
        status.textContent = 'Uploading your image…';
        uploadedPath = member.id + '/' + crypto.randomUUID() + '.' + allowed[selectedFile.type];
        const uploaded = await imageStore.upload(uploadedPath, selectedFile, {
          cacheControl: '3600', contentType: selectedFile.type, upsert: false
        });
        if (uploaded.error) throw uploaded.error;
      }
      status.textContent = 'Publishing your conversation…';
      const {data, error} = await client.from('discussion_threads')
        .insert({
          author_id: member.id,
          kind: draft.kind,
          work_title: draft.kind === 'title' ? draft.work : null,
          work_type: draft.kind === 'title' ? draft.workType : null,
          title: draft.heading,
          body: draft.body,
          has_spoilers: draft.hasSpoilers,
          image_path: uploadedPath,
          image_alt: uploadedPath ? imageAlt.value.trim().slice(0,180) : null
        }).select('id').single();
      if (error) throw error;
      if (!data?.id) throw new Error('Missing new conversation ID.');
      try {
        localStorage.removeItem(draftKey);
        sessionStorage.removeItem('afterlogue-discuss-draft');
      } catch (_) {}
      window.location.assign('discuss-thread.html?id=' + encodeURIComponent(data.id));
    } catch (error) {
      if (uploadedPath) {
        try { await imageStore.remove([uploadedPath]); }
        catch (cleanupError) { console.warn('Could not clean up unused image', cleanupError); }
      }
      console.error('Publishing conversation failed', error);
      status.textContent = 'Your conversation couldn’t be published. Your text and image selection are still here.';
      btn.disabled = false;
      saving = false;
    }
  });

  try {
    member = await initAccount();
    $('compose-loading').hidden = true;
    if (!member) {
      $('compose-gate').hidden = false;
      return;
    }
    form.hidden = false;
    draftKey = 'afterlogue-discuss-draft-' + member.id;
    let draft = null;
    try {
      // A Log-to-Discuss draft is used before any earlier browser-only draft,
      // and only after this member opens the composer.
      const fromLog = sessionStorage.getItem('afterlogue-discuss-draft');
      if (fromLog) {
        draft = JSON.parse(fromLog);
        sessionStorage.removeItem('afterlogue-discuss-draft');
      } else {
        const stored = localStorage.getItem(draftKey);
        if (stored) draft = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Could not restore discussion draft', error);
    }
    if (draft) fill(draft);
    else workFields();
  } catch (error) {
    console.error('Conversation composer initialization failed', error);
    $('compose-loading').textContent = 'Unable to load your writing space. Please refresh.';
  }
})();