/* ==========================================
   FileForge — File Information
   ========================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload     = $('#infoUpload');
    const fileInput  = $('#infoFileInput');
    const fileCard   = $('#infoFileCard');
    const previewWrap = $('#infoPreviewWrap');
    const preview    = $('#infoPreview');
    const fileName   = $('#infoFileName');
    const fileSize   = $('#infoFileSize');
    const fileType   = $('#infoFileType');
    const removeBtn  = $('#infoRemove');
    const infoTable  = $('#infoTable');
    const infoName   = $('#infoName');
    const infoType   = $('#infoType');
    const infoMime   = $('#infoMime');
    const infoExt    = $('#infoExt');
    const infoSize   = $('#infoSize');
    const infoModified = $('#infoModified');
    const infoDimsRow = $('#infoDimsRow');
    const infoDims   = $('#infoDims');
    const copyBtn    = $('#infoCopy');

    let currentFile = null;

    FF.setupDropZone(upload, fileInput, handleFile);

    if (removeBtn) removeBtn.addEventListener('click', resetTool);

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (!currentFile) return;
            const text = buildInfoText();
            navigator.clipboard.writeText(text)
                .then(() => FF.toast('Information copied to clipboard!', 'success'))
                .catch(() => FF.toast('Could not copy — please copy manually.', 'warning'));
        });
    }

    function buildInfoText() {
        if (!currentFile) return '';
        const lines = [
            'Filename:      ' + currentFile.name,
            'File Type:     ' + friendlyType(currentFile),
            'MIME Type:     ' + (currentFile.type || 'Unknown'),
            'Extension:     ' + (FF.getFileExtension(currentFile.name) || 'none').toUpperCase(),
            'File Size:     ' + FF.formatFileSize(currentFile.size) + ' (' + currentFile.size.toLocaleString() + ' bytes)',
            'Last Modified: ' + formatDate(currentFile.lastModified),
        ];
        if (infoDimsRow && infoDimsRow.style.display !== 'none') {
            lines.push('Dimensions:    ' + infoDims.textContent);
        }
        return lines.join('\n');
    }

    function friendlyType(file) {
        if (file.type) return FF.mimeToFriendly(file.type);
        const ext = FF.getFileExtension(file.name).toUpperCase();
        return ext ? ext + ' File' : 'Unknown';
    }

    function formatDate(ts) {
        if (!ts) return 'Unknown';
        return new Date(ts).toLocaleString();
    }

    function handleFile(file) {
        if (!file) return;
        if (file.size > 500 * 1024 * 1024) {
            FF.toast('File is too large to inspect (max 500MB).', 'error');
            return;
        }

        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = FF.formatFileSize(file.size);
        fileType.textContent = friendlyType(file);

        // Populate info table
        infoName.textContent     = file.name;
        infoType.textContent     = friendlyType(file);
        infoMime.textContent     = file.type || 'Unknown';
        infoExt.textContent      = (FF.getFileExtension(file.name) || 'none').toUpperCase();
        infoSize.textContent     = FF.formatFileSize(file.size) + ' (' + file.size.toLocaleString() + ' bytes)';
        infoModified.textContent = formatDate(file.lastModified);
        infoDimsRow.style.display = 'none';

        // Preview for images
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            preview.src = url;
            preview.style.display = '';
            preview.onload = () => {
                infoDimsRow.style.display = '';
                infoDims.textContent = preview.naturalWidth + ' × ' + preview.naturalHeight + ' px';
            };
        } else {
            preview.style.display = 'none';
            preview.src = '';
        }

        FF.hide(upload);
        FF.show(fileCard);
        FF.show(infoTable);
    }

    function resetTool() {
        currentFile = null;
        fileInput.value = '';

        FF.hide(fileCard);
        FF.hide(infoTable);
        FF.show(upload);

        if (preview.src) URL.revokeObjectURL(preview.src);
        preview.src = '';
    }

})();
