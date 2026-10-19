/* Afterlogue / Editorial conversation composer with one inline image */
(async () => {
  'use strict';
  const {client, byId: $, showSpoilerText, initAccount} = window.AfterlogueDiscuss;
  const form = $('compose-form'), status = $('compose-message'), editor = $('compose-content');
  const imageInput = $('compose-image'), imageAlt = $('compose-image-alt');
  const attachment = $('compose-image-attachment');
  const preview = $('compose-preview'), previewBody = $('preview-body');
  const bucket = client.storage.from('discussion-images');
  const IMAGE_TOKEN = '[[afterlogue:image]]';
  const allowedTypes = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  const imageLimit = 5 * 1024 * 1024;
  let member = null, busy = false, draftKey = '';
  let selectedFile = null, objectUrl = null;
  const photoPreview = $('compose-image-preview');
  const selectedBox = $('compose-image-selected');
  const addBox = $('compose-image-drop');

  function clearImage() {
    selectedFile = null;
    imageInput.value = '';
    imageAlt.value = '';
    imageAlt.required = false;
    attachment.hidden = true;
    selectedBox.hidden = true;
    photoPreview.removeAttribute('src');
    addBox.hidden = false;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }

  function chooseImage(file) {
    if (!file) return;
    if (!Object.prototype.hasOwnProperty.call(allowedTypes,file.type) ||
        file.size <= 0 || file.size > imageLimit) {
      status.textContent = 'Choose a JPG, PNG, or WebP image smaller than 5 MB.';
      imageInput.value = '';
      return;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    selectedFile = file;
    // A new photo needs its own description; never reuse the previous image's alt text.
    imageAlt.value = '';
    objectUrl = URL.createObjectURL(file);
    photoPreview.src = objectUrl;
    photoPreview.alt = 'Preview of your selected image';
    selectedBox.hidden = false;
    addBox.hidden = true;
    attachment.hidden = false;
    imageAlt.required = true;
    status.textContent = '';
  }

  imageInput.addEventListener('change',() => chooseImage(imageInput.files && imageInput.files[0]));
  $('compose-image-change-button').addEventListener('click', () => {
    // Opening and canceling the file picker leaves the current photo untouched.
    imageInput.value = '';
    imageInput.click();
  });
  $('compose-image-remove').addEventListener('click', clearImage);
  imageAlt.addEventListener('input', () => {
    photoPreview.alt = imageAlt.value.trim() || 'Preview of your selected image';
  });
  window.addEventListener('pagehide', () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  });

  // The conversation itself is plain text; the optional image is a separate visual.
  function bodyText() {
    return editor.value.trim();
  }
  function editorText(raw) {
    editor.value = String(raw || '').slice(0,4000);
  }

  function workFields() {
    const specific = $('compose-kind').value === 'title';
    $('compose-title-fields').hidden = !specific;
    $('compose-work').required = specific;
  }

  function collect() {
    const kind = $('compose-kind').value === 'title' ? 'title' : 'general';
    return {
      kind, work:kind === 'title' ? $('compose-work').value.trim() : '',
      workType:$('compose-work-type').value,
      heading:$('compose-title').value.trim(),
      body:bodyText(), hasSpoilers:$('compose-has-spoilers').checked
    };
  }

  function fill(draft) {
    if (!draft || typeof draft !== 'object') return;
    $('compose-kind').value = draft.kind === 'title' ? 'title' : 'general';
    $('compose-work').value = String(draft.work || '').slice(0,120);
    $('compose-work-type').value = draft.workType === 'tv' ? 'tv' : 'film';
    $('compose-title').value = String(draft.heading || '').slice(0,160);
    editorText(String(draft.body || '').replaceAll(IMAGE_TOKEN,''));
    $('compose-has-spoilers').checked = Boolean(draft.hasSpoilers);
    workFields();
  }

  function saveDraft() {
    if (!member) return;
    try {
      const draft = collect();
      // Photos cannot be persisted in localStorage; keep text and an explanation.
      draft.body = draft.body.replaceAll(IMAGE_TOKEN,'');
      localStorage.setItem(draftKey, JSON.stringify(draft));
      status.textContent = selectedFile
        ? 'Text saved in this browser. Reattach your image when returning.'
        : 'Draft saved in this browser. Nothing has been published.';
    } catch (error) {
      status.textContent = 'Could not save locally. Your work is still here.';
    }
  }

  function renderPreview() {
    previewBody.replaceChildren();
    if ($('compose-has-spoilers').checked) {
      const warning = document.createElement('p');
      warning.className = 'discuss-form-help';
      warning.textContent = 'This conversation is marked as containing spoilers.';
      previewBody.appendChild(warning);
    }
    if (objectUrl) {
      const visual = document.createElement('img');
      visual.src = objectUrl;
      visual.alt = imageAlt.value.trim() || 'Selected conversation visual';
      visual.className = 'discuss-embedded-image';
      previewBody.appendChild(visual);
    }
    const text = document.createElement('div');
    showSpoilerText(text,bodyText() || 'Your words will appear here.');
    previewBody.appendChild(text);
  }
  $('compose-kind').addEventListener('change',workFields);
  $('compose-save').addEventListener('click',saveDraft);
  $('compose-preview-toggle').addEventListener('click', () => {
    const opening = preview.hidden;
    preview.hidden = !opening;
    $('compose-preview-toggle').textContent = opening ? 'Close preview' : 'Preview';
    if (!opening) return;
    $('preview-heading').textContent = $('compose-title').value.trim() || 'Your conversation title';
    renderPreview();
  });

  form.addEventListener('submit',async event => {
    event.preventDefault();
    if (!member || busy) return;
    const draft = collect();
    const plainLength = draft.body.trim().length;
    if (draft.heading.length < 5 || draft.heading.length > 160 ||
      plainLength < 10 || draft.body.length > 4000 ||
      (draft.kind === 'title' && (!draft.work || draft.work.length > 120))) {
      status.textContent = 'Add a title and at least 10 characters of writing before publishing.';
      return;
    }
    if (selectedFile && !imageAlt.value.trim()) {
      status.textContent = 'Describe your image before publishing.';
      imageAlt.focus();
      return;
    }
    busy = true;
    const publish = $('compose-publish');
    publish.disabled = true;
    let uploadedPath = null;
    status.textContent = 'Publishing…';
    try {
      if (selectedFile) {
        status.textContent = 'Uploading your image…';
        uploadedPath = member.id + '/' + crypto.randomUUID() + '.' + allowedTypes[selectedFile.type];
        const result = await bucket.upload(uploadedPath,selectedFile,{
          cacheControl:'3600', contentType:selectedFile.type, upsert:false
        });
        if (result.error) throw result.error;
      }
      status.textContent = 'Publishing your conversation…';
      const {data,error} = await client.from('discussion_threads').insert({
        author_id:member.id, kind:draft.kind, title:draft.heading,
        work_title:draft.kind === 'title' ? draft.work : null,
        work_type:draft.kind === 'title' ? draft.workType : null,
        body:draft.body,has_spoilers:draft.hasSpoilers,
        image_path:uploadedPath,
        image_alt:uploadedPath ? imageAlt.value.trim().slice(0,180) : null
      }).select('id').single();
      if (error) throw error;
      if (!data?.id) throw new Error('Conversation not returned');
      try {
        localStorage.removeItem(draftKey);
        sessionStorage.removeItem('afterlogue-discuss-draft');
      } catch (_) {}
      window.location.assign('discuss-thread.html?id='+encodeURIComponent(data.id));
    } catch (error) {
      console.error('Publishing a conversation failed', error);
      if (uploadedPath) {
        try { await bucket.remove([uploadedPath]); } catch (_) {}
      }
      status.textContent = 'Your conversation could not be published. Your words and image are still here.';
      publish.disabled = false;
      busy = false;
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
    draftKey = 'afterlogue-discuss-draft-'+member.id;
    let draft = null;
    try {
      const fromLog = sessionStorage.getItem('afterlogue-discuss-draft');
      if (fromLog) {
        draft = JSON.parse(fromLog);
        sessionStorage.removeItem('afterlogue-discuss-draft');
      } else {
        const saved = localStorage.getItem(draftKey);
        if (saved) draft = JSON.parse(saved);
      }
    } catch (error) { console.warn('Could not recover draft',error); }
    if (draft) fill(draft);
    else workFields();
  } catch (error) {
    console.error('Composer setup failed',error);
    $('compose-loading').textContent = 'Unable to load your writing area. Try refreshing.';
  }
})();