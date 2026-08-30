/* ==========================================
   FileForge — Image Compressor
   ========================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload    = $('#compressorUpload');
    const fileInput = $('#compressorFileInput');
    const fileCard  = $('#compressorFileCard');
    const preview   = $('#compressorPreview');
    const fileName  = $('#compressorFileName');
    const fileSize  = $('#compressorFileSize');
    const fileType  = $('#compressorFileType');
    const dims      = $('#compressorDims');
    const removeBtn = $('#compressorRemove');
    const controls  = $('#compressorControls');
    const qualitySlider = $('#compressorQuality');
    const qualityValue  = $('#compressorQualityValue');
    const compressBtn   = $('#compressorCompress');
    const processing    = $('#compressorProcessing');
    const result        = $('#compressorResult');
    const origImg       = $('#compressorOrigImg');
    const compImg       = $('#compressorCompImg');
    const origSize      = $('#compressorOrigSize');
    const compSize      = $('#compressorCompSize');
    const reduction     = $('#compressorReduction');
    const downloadBtn   = $('#compressorDownload');
    const resetBtn      = $('#compressorReset');

    let currentFile = null;
    let resultBlob  = null;

    FF.setupDropZone(upload, fileInput, handleFile);

    if (qualitySlider) {
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value;
        });
    }

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (compressBtn) compressBtn.addEventListener('click', compressImage);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!resultBlob || !currentFile) return;
            const ext = FF.getFileExtension(currentFile.name) || 'jpg';
            const newName = currentFile.name.replace(/\.[^/.]+$/, '') + '-compressed.' + ext;
            FF.downloadBlob(resultBlob, newName);
            FF.toast('Compressed file downloaded!', 'success');
        });
    }

    if (resetBtn) resetBtn.addEventListener('click', resetTool);

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            FF.toast('Please upload an image file.', 'error');
            return;
        }
        // Only support lossy-friendly formats
        const supported = ['image/jpeg', 'image/png', 'image/webp'];
        if (!supported.includes(file.type)) {
            FF.toast('Please upload a PNG, JPG, or WEBP image.', 'error');
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
            dims.textContent = preview.naturalWidth + ' × ' + preview.naturalHeight + ' px';
        };

        FF.hide(upload);
        FF.show(fileCard);
        FF.show(controls);
        FF.hide(result);
        FF.hide(processing);
        resultBlob = null;
    }

    async function compressImage() {
        if (!currentFile) {
            FF.toast('No file selected.', 'error');
            return;
        }

        const quality = parseInt(qualitySlider.value) / 100;
        // Compress as JPEG for best size reduction (unless already PNG, keep webp/jpeg)
        const outputMime = currentFile.type === 'image/png' ? 'image/png' : 'image/jpeg';

        FF.hide(controls);
        FF.show(processing);

        try {
            const img = await FF.loadImage(currentFile);
            const canvas = document.createElement('canvas');
            canvas.width  = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            if (outputMime === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(img, 0, 0);

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Compression failed.')), outputMime, quality);
            });

            resultBlob = blob;
            FF.hide(processing);
            FF.show(result);

            // Show side-by-side comparison
            const origUrl = URL.createObjectURL(currentFile);
            const compUrl = URL.createObjectURL(blob);
            origImg.src = origUrl;
            compImg.src = compUrl;
            origSize.textContent = FF.formatFileSize(currentFile.size);
            compSize.textContent = FF.formatFileSize(blob.size);

            const saved = Math.round((1 - blob.size / currentFile.size) * 100);
            reduction.textContent = saved > 0
                ? `Saved ${saved}% (${FF.formatFileSize(currentFile.size - blob.size)})`
                : `File size: ${FF.formatFileSize(blob.size)}`;

            FF.toast('Image compressed!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Compression failed.', 'error');
        }
    }

    function resetTool() {
        currentFile = null;
        resultBlob  = null;
        fileInput.value = '';

        FF.hide(fileCard);
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);

        if (preview.src) URL.revokeObjectURL(preview.src);
    }

})();
