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
  let selectedFile = null, objectUrl = null, selectedRange = null;

  function imageNode() { return editor.querySelector('[data-inline-image]'); }

  function saveCursor() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) selectedRange = range.cloneRange();
  }
  editor.addEventListener('mouseup', saveCursor);
  editor.addEventListener('keyup', saveCursor);
  document.addEventListener('selectionchange', saveCursor);

  function insertNodeAtSelection(node) {
    editor.focus();
    let range = selectedRange;
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(true); // Start with the image if the writer has not chosen a cursor.
    }
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    selectedRange = range.cloneRange();
  }

  function makeImageNode() {
    const wrap = document.createElement('span');
    wrap.className = 'discuss-inline-figure';
    wrap.dataset.inlineImage = 'true';
    wrap.contentEditable = 'false';
    const pic = document.createElement('img');
    pic.src = objectUrl;
    pic.alt = imageAlt.value.trim() || 'Selected visual for this conversation';
    pic.className = 'discuss-inline-photo';
    wrap.appendChild(pic);
    const caption = document.createElement('span');
    caption.className = 'discuss-inline-caption';
    caption.textContent = 'Visual in your conversation';
    wrap.appendChild(caption);
    return wrap;
  }

  function putImageAtCursor() {
    if (!selectedFile || !objectUrl) return;
    const previous = imageNode();
    if (previous) previous.remove();
    insertNodeAtSelection(makeImageNode());
  }

  function clearImage() {
    editor.querySelectorAll('[data-inline-image]').forEach(node => node.remove());
    selectedFile = null;
    imageInput.value = '';
    imageAlt.value = '';
    imageAlt.required = false;
    attachment.hidden = true;
    $('compose-image-remove-top').hidden = true;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    selectedRange = null;
  }

  function chooseImage(file) {
    if (!file) return;
    if (!Object.prototype.hasOwnProperty.call(allowedTypes,file.type) ||
      file.size > imageLimit || file.size <= 0) {
      status.textContent = 'Choose a JPG, PNG, or WebP image smaller than 5 MB.';
      imageInput.value = '';
      return;
    }
    const previous = imageNode();
    if (previous) previous.remove();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    selectedFile = file;
    attachment.hidden = false;
    $('compose-image-remove-top').hidden = false;
    imageAlt.required = true;
    status.textContent = '';
    putImageAtCursor();
  }

  imageInput.addEventListener('change', () => chooseImage(imageInput.files && imageInput.files[0]));
  $('compose-image-move').addEventListener('click', putImageAtCursor);
  $('compose-image-remove').addEventListener('click', clearImage);
  $('compose-image-remove-top').addEventListener('click', clearImage);
  editor.addEventListener('input', () => {
    if (selectedFile && !imageNode()) {
      clearImage();
      status.textContent = 'Visual removed. Your writing is unchanged.';
    }
  });
  imageAlt.addEventListener('input', () => {
    const node = imageNode();
    if (node) node.querySelector('img').alt = imageAlt.value.trim() || 'Selected visual';
  });
  window.addEventListener('pagehide', () => { if (objectUrl) URL.revokeObjectURL(objectUrl); });

  // The editor stores plain text and one image marker. No pasted HTML is published.
  function serialize(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    if (node.hasAttribute('data-inline-image')) return IMAGE_TOKEN;
    if (node.tagName === 'BR') return '\n';
    const content = Array.from(node.childNodes).map(serialize).join('');
    return /^(DIV|P|LI)$/.test(node.tagName) ? content + '\n' : content;
  }
  function bodyText() {
    return serialize(editor).replace(/\u00a0/g,' ').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();
  }
  function editorText(raw) {
    editor.replaceChildren();
    editor.appendChild(document.createTextNode(String(raw || '')));
    selectedRange = null;
    if (selectedFile && objectUrl && raw.includes(IMAGE_TOKEN)) {
      editor.replaceChildren();
      const pieces = raw.split(IMAGE_TOKEN);
      editor.append(document.createTextNode(pieces[0]),makeImageNode(),
        document.createTextNode(pieces.slice(1).join(IMAGE_TOKEN)));
    }
  }
  function insertPlainText(value) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    const node = document.createTextNode(value);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    selectedRange = range.cloneRange();
  }
  editor.addEventListener('paste', event => {
    event.preventDefault();
    insertPlainText(event.clipboardData?.getData('text/plain') || '');
  });
  editor.addEventListener('drop', event => {
    if (event.dataTransfer?.files?.length) {
      event.preventDefault();
      status.textContent = 'Use “Add an image” above to attach a visual.';
    }
  });

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
    editorText(String(draft.body || '').replaceAll(IMAGE_TOKEN,'').slice(0,4000));
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
    const raw = bodyText() || 'Your words will appear here.';
    if ($('compose-has-spoilers').checked) {
      const warning = document.createElement('p');
      warning.className = 'discuss-form-help';
      warning.textContent = 'This conversation is marked as containing spoilers.';
      previewBody.appendChild(warning);
    }
    raw.split(IMAGE_TOKEN).forEach((part,index) => {
      if (part) {
        const el = document.createElement('div');
        showSpoilerText(el,part);
        previewBody.appendChild(el);
      }
      if (index < raw.split(IMAGE_TOKEN).length - 1 && objectUrl) {
        const img = document.createElement('img');
        img.className = 'discuss-embedded-image';
        img.src = objectUrl;
        img.alt = imageAlt.value.trim() || 'Visual in conversation';
        previewBody.appendChild(img);
      }
    });
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
    const plainLength = draft.body.replaceAll(IMAGE_TOKEN,'').trim().length;
    if (draft.heading.length < 5 || draft.heading.length > 160 ||
      plainLength < 10 || draft.body.length > 4000 ||
      (draft.kind === 'title' && (!draft.work || draft.work.length > 120))) {
      status.textContent = 'Add a title and at least 10 characters of writing before publishing.';
      return;
    }
    if (selectedFile && !imageNode()) {
      status.textContent = 'Insert your visual into the writing area before publishing.';
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