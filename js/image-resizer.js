/* ==========================================
   FileForge — Image Resizer
   ========================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    // Elements
    const upload    = $('#resizerUpload');
    const fileInput = $('#resizerFileInput');
    const fileCard  = $('#resizerFileCard');
    const preview   = $('#resizerPreview');
    const fileName  = $('#resizerFileName');
    const fileSize  = $('#resizerFileSize');
    const fileType  = $('#resizerFileType');
    const dims      = $('#resizerDims');
    const removeBtn = $('#resizerRemove');
    const controls  = $('#resizerControls');
    const widthIn   = $('#resizerWidth');
    const heightIn  = $('#resizerHeight');
    const lockBtn   = $('#resizerLock');
    const resizeBtn = $('#resizerResize');
    const processing = $('#resizerProcessing');
    const result    = $('#resizerResult');
    const resultPreview = $('#resizerResultPreview');
    const origInfo  = $('#resizerOrigInfo');
    const outInfo   = $('#resizerOutInfo');
    const sizeInfo  = $('#resizerSizeInfo');
    const downloadBtn = $('#resizerDownload');
    const resetBtn  = $('#resizerReset');

    let currentFile = null;
    let resultBlob  = null;
    let origW = 0, origH = 0;
    let aspectLocked = true;

    // Setup drop zone
    FF.setupDropZone(upload, fileInput, handleFile);

    // Aspect ratio lock toggle
    if (lockBtn) {
        lockBtn.addEventListener('click', () => {
            aspectLocked = !aspectLocked;
            lockBtn.classList.toggle('active', aspectLocked);
        });
    }

    // Width input — adjust height if locked
    if (widthIn) {
        widthIn.addEventListener('input', () => {
            if (aspectLocked && origW && origH) {
                const w = parseInt(widthIn.value) || 0;
                heightIn.value = w ? Math.round(w * origH / origW) : '';
            }
        });
    }

    // Height input — adjust width if locked
    if (heightIn) {
        heightIn.addEventListener('input', () => {
            if (aspectLocked && origW && origH) {
                const h = parseInt(heightIn.value) || 0;
                widthIn.value = h ? Math.round(h * origW / origH) : '';
            }
        });
    }

    // Preset buttons
    document.querySelectorAll('#resizerControls .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            widthIn.value  = btn.getAttribute('data-w');
            heightIn.value = btn.getAttribute('data-h');
        });
    });

    // Remove file
    if (removeBtn) removeBtn.addEventListener('click', resetTool);

    // Resize
    if (resizeBtn) resizeBtn.addEventListener('click', resizeImage);

    // Download
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!resultBlob || !currentFile) return;
            const ext = FF.getFileExtension(currentFile.name) || 'png';
            const newName = FF.changeExt(currentFile.name, ext);
            FF.downloadBlob(resultBlob, newName);
            FF.toast('File downloaded!', 'success');
        });
    }

    // Reset
    if (resetBtn) resetBtn.addEventListener('click', resetTool);

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            FF.toast('Please upload an image file.', 'error');
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            FF.toast('File is too large. Maximum size is 100MB.', 'error');
            return;
        }

        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = FF.formatFileSize(file.size);
        fileType.textContent = FF.mimeToExt(file.type).toUpperCase();

        const url = URL.createObjectURL(file);
        preview.src = url;
        preview.onload = () => {
            origW = preview.naturalWidth;
            origH = preview.naturalHeight;
            dims.textContent = origW + ' × ' + origH + ' px';
            widthIn.value  = origW;
            heightIn.value = origH;
        };

        FF.hide(upload);
        FF.show(fileCard);
        FF.show(controls);
        FF.hide(result);
        FF.hide(processing);
        resultBlob = null;
    }

    async function resizeImage() {
        if (!currentFile) {
            FF.toast('No file selected.', 'error');
            return;
        }
        const w = parseInt(widthIn.value);
        const h = parseInt(heightIn.value);
        if (!w || !h || w < 1 || h < 1) {
            FF.toast('Please enter valid width and height values.', 'error');
            return;
        }

        FF.hide(controls);
        FF.show(processing);

        try {
            const img = await FF.loadImage(currentFile);
            const canvas = document.createElement('canvas');
            canvas.width  = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            const mime = currentFile.type || 'image/png';
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Resize failed.')), mime, 0.92);
            });

            resultBlob = blob;
            FF.hide(processing);
            FF.show(result);

            resultPreview.src = URL.createObjectURL(blob);
            origInfo.textContent = origW + '×' + origH + ' — ' + FF.formatFileSize(currentFile.size);
            outInfo.textContent  = w + '×' + h + ' — ' + FF.mimeToExt(mime).toUpperCase();
            sizeInfo.textContent = FF.formatFileSize(blob.size);

            FF.toast('Image resized successfully!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Resize failed.', 'error');
        }
    }

    function resetTool() {
        currentFile = null;
        resultBlob  = null;
        origW = origH = 0;
        fileInput.value = '';

        FF.hide(fileCard);
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);

        if (preview.src) URL.revokeObjectURL(preview.src);
        if (resultPreview && resultPreview.src) URL.revokeObjectURL(resultPreview.src);
        widthIn.value = '';
        heightIn.value = '';
    }

})();
