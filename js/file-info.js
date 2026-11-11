/* ==========================================================================
   FileForge — File Information & EXIF Privacy Inspector
   Inspects metadata and offers 1-click EXIF metadata stripping.
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload = $('#infoUpload');
    const fileInput = $('#infoFileInput');
    const fileCard = $('#infoFileCard');
    const preview = $('#infoPreview');
    const fileName = $('#infoFileName');
    const fileSize = $('#infoFileSize');
    const fileType = $('#infoFileType');
    const removeBtn = $('#infoRemove');
    const infoTable = $('#infoTable');
    const infoName = $('#infoName');
    const infoType = $('#infoType');
    const infoMime = $('#infoMime');
    const infoExt = $('#infoExt');
    const infoSize = $('#infoSize');
    const infoModified = $('#infoModified');
    const infoDimsRow = $('#infoDimsRow');
    const infoDims = $('#infoDims');
    const copyBtn = $('#infoCopy');
    const stripExifBtn = $('#infoStripExif');

    let currentFile = null;

    FF.setupDropZone(upload, fileInput, handleFile);
    if (window.FF && FF.registerToolHandler) FF.registerToolHandler('fileinfo', handleFile);

    if (removeBtn) removeBtn.addEventListener('click', resetTool);

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (!currentFile) return;
            const text = buildInfoText();
            navigator.clipboard.writeText(text)
                .then(() => FF.toast('Metadata copied to clipboard!', 'success'))
                .catch(() => FF.toast('Could not copy to clipboard.', 'warning'));
        });
    }

    if (stripExifBtn) {
        stripExifBtn.addEventListener('click', async () => {
            if (!currentFile || !currentFile.type.startsWith('image/')) {
                FF.toast('Metadata stripping is available for image files.', 'warning');
                return;
            }
            try {
                const img = await FF.loadImage(currentFile);
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const mime = currentFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
                canvas.toBlob((cleanBlob) => {
                    if (!cleanBlob) {
                        FF.toast('Failed to sanitize image.', 'error');
                        return;
                    }
                    const ext = FF.mimeToExt(mime);
                    const cleanName = FF.changeExt(currentFile.name, `clean.${ext}`);
                    FF.downloadBlob(cleanBlob, cleanName);
                    FF.toast('Sanitized image downloaded! All EXIF and GPS tags removed.', 'success');
                }, mime, 0.95);
            } catch (err) {
                FF.toast(err.message || 'Failed to sanitize image.', 'error');
            }
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

        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = FF.formatFileSize(file.size);
        fileType.textContent = friendlyType(file);

        infoName.textContent = file.name;
        infoType.textContent = friendlyType(file);
        infoMime.textContent = file.type || 'Unknown';
        infoExt.textContent = (FF.getFileExtension(file.name) || 'none').toUpperCase();
        infoSize.textContent = FF.formatFileSize(file.size) + ' (' + file.size.toLocaleString() + ' bytes)';
        infoModified.textContent = formatDate(file.lastModified);
        if (infoDimsRow) infoDimsRow.style.display = 'none';

        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            preview.src = url;
            preview.style.display = '';
            preview.onload = () => {
                if (infoDimsRow) infoDimsRow.style.display = '';
                const ratio = (preview.naturalWidth / preview.naturalHeight).toFixed(2);
                infoDims.textContent = `${preview.naturalWidth} × ${preview.naturalHeight} px (Ratio ${ratio}:1)`;
            };
            if (stripExifBtn) FF.show(stripExifBtn);
        } else {
            preview.style.display = 'none';
            if (stripExifBtn) FF.hide(stripExifBtn);
        }

        FF.hide(upload);
        FF.show(fileCard);
        FF.show(infoTable);
    }

    function resetTool() {
        currentFile = null;
        fileInput.value = '';
        if (preview.src) URL.revokeObjectURL(preview.src);
        preview.style.display = 'none';
        FF.hide(fileCard);
        FF.hide(infoTable);
        FF.show(upload);
    }
})();
