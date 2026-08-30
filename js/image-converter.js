/* ==========================================
   FileForge — Image Converter
   ========================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Elements
    const upload = $('#converterUpload');
    const fileInput = $('#converterFileInput');
    const fileCard = $('#converterFileCard');
    const preview = $('#converterPreview');
    const fileName = $('#converterFileName');
    const fileSize = $('#converterFileSize');
    const fileType = $('#converterFileType');
    const dims = $('#converterDims');
    const removeBtn = $('#converterRemove');
    const controls = $('#converterControls');
    const formatSelect = $('#converterFormat');
    const qualitySlider = $('#converterQuality');
    const qualityValue = $('#converterQualityValue');
    const qualityGroup = $('#converterQualityGroup');
    const convertBtn = $('#converterConvert');
    const processing = $('#converterProcessing');
    const result = $('#converterResult');
    const resultPreview = $('#converterResultPreview');
    const origInfo = $('#converterOrigInfo');
    const outInfo = $('#converterOutInfo');
    const sizeInfo = $('#converterSizeInfo');
    const downloadBtn = $('#converterDownload');
    const resetBtn = $('#converterReset');

    let currentFile = null;
    let resultBlob = null;

    // Setup drop zone
    FF.setupDropZone(upload, fileInput, handleFile);

    // Quality slider
    if (qualitySlider) {
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value;
        });
    }

    // Show/hide quality slider for lossy formats only
    if (formatSelect) {
        formatSelect.addEventListener('change', () => {
            const val = formatSelect.value;
            if (val === 'image/png' || val === 'image/bmp') {
                FF.hide(qualityGroup);
            } else {
                FF.show(qualityGroup);
            }
        });
    }

    // Remove file
    if (removeBtn) {
        removeBtn.addEventListener('click', resetTool);
    }

    // Convert
    if (convertBtn) {
        convertBtn.addEventListener('click', convertImage);
    }

    // Download
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!resultBlob || !currentFile) return;
            const ext = FF.mimeToExt(formatSelect.value);
            const newName = FF.changeExt(currentFile.name, ext);
            FF.downloadBlob(resultBlob, newName);
            FF.toast('File downloaded!', 'success');
        });
    }

    // Reset
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTool);
    }

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            FF.toast('Please upload an image file.', 'error');
            return;
        }

        // Check max size (100MB)
        if (file.size > 100 * 1024 * 1024) {
            FF.toast('File is too large. Maximum size is 100MB.', 'error');
            return;
        }

        currentFile = file;

        // Show file card
        fileName.textContent = file.name;
        fileSize.textContent = FF.formatFileSize(file.size);
        fileType.textContent = FF.mimeToExt(file.type).toUpperCase();

        // Preview
        const url = URL.createObjectURL(file);
        preview.src = url;
        preview.onload = () => {
            dims.textContent = preview.naturalWidth + ' × ' + preview.naturalHeight + ' px';
        };

        // Show card, hide upload, show controls
        FF.hide(upload);
        FF.show(fileCard);
        FF.show(controls);
        FF.hide(result);
        FF.hide(processing);

        // Reset result blob
        resultBlob = null;

        // Auto-set output format
        if (file.type === 'image/png') {
            formatSelect.value = 'image/jpeg';
        } else if (file.type === 'image/jpeg') {
            formatSelect.value = 'image/webp';
        } else if (file.type === 'image/webp') {
            formatSelect.value = 'image/png';
        } else {
            formatSelect.value = 'image/png';
        }
        formatSelect.dispatchEvent(new Event('change'));
    }

    async function convertImage() {
        if (!currentFile) {
            FF.toast('No file selected.', 'error');
            return;
        }

        const outputMime = formatSelect.value;
        const quality = parseInt(qualitySlider.value) / 100;

        // Show processing
        FF.hide(controls);
        FF.show(processing);

        try {
            const img = await FF.loadImage(currentFile);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            // For JPEG, fill white background (no transparency)
            if (outputMime === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(img, 0, 0);

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Conversion failed. Try a different output format.'));
                }, outputMime, quality);
            });

            resultBlob = blob;

            // Show result
            FF.hide(processing);
            FF.show(result);

            resultPreview.src = URL.createObjectURL(blob);
            origInfo.textContent = currentFile.name + ' — ' + FF.formatFileSize(currentFile.size) + ' — ' + img.naturalWidth + '×' + img.naturalHeight;
            outInfo.textContent = FF.mimeToExt(outputMime).toUpperCase() + ' — ' + img.naturalWidth + '×' + img.naturalHeight;
            sizeInfo.textContent = FF.formatFileSize(blob.size) + ' (' + Math.round((1 - blob.size / currentFile.size) * 100) + '% of original)';

            FF.toast('Image converted successfully!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Conversion failed.', 'error');
        }
    }

    function resetTool() {
        currentFile = null;
        resultBlob = null;
        fileInput.value = '';

        FF.hide(fileCard);
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);

        // Revoke object URLs
        if (preview.src) URL.revokeObjectURL(preview.src);
        if (resultPreview && resultPreview.src) URL.revokeObjectURL(resultPreview.src);
    }

})();
