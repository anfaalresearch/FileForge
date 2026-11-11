/* ==========================================================================
   FileForge — Image Compressor
   Visual quality slider, live savings calculation, and format optimization
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload = $('#compressorUpload');
    const fileInput = $('#compressorFileInput');
    const fileCard = $('#compressorFileCard');
    const preview = $('#compressorPreview');
    const fileName = $('#compressorFileName');
    const fileSize = $('#compressorFileSize');
    const fileType = $('#compressorFileType');
    const dims = $('#compressorDims');
    const removeBtn = $('#compressorRemove');
    const controls = $('#compressorControls');

    const qualitySlider = $('#compressorQuality');
    const qualityValue = $('#compressorQualityValue');
    const formatSelect = $('#compressorFormat');
    const compressBtn = $('#compressorCompress');
    const processing = $('#compressorProcessing');
    const result = $('#compressorResult');

    const origImg = $('#compressorOrigImg');
    const compImg = $('#compressorCompImg');
    const origSize = $('#compressorOrigSize');
    const compSize = $('#compressorCompSize');
    const reduction = $('#compressorReduction');
    const downloadBtn = $('#compressorDownload');
    const resetBtn = $('#compressorReset');

    let currentFile = null;
    let loadedImage = null;
    let resultBlob = null;

    FF.setupDropZone(upload, fileInput, handleFile);
    if (window.FF && FF.registerToolHandler) FF.registerToolHandler('compressor', handleFile);

    if (qualitySlider && qualityValue) {
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value + '%';
        });
    }

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (resetBtn) resetBtn.addEventListener('click', resetTool);
    if (compressBtn) compressBtn.addEventListener('click', compressImage);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!resultBlob || !currentFile) return;
            const chosenMime = formatSelect ? formatSelect.value : 'image/jpeg';
            const ext = FF.mimeToExt(chosenMime);
            const base = currentFile.name.replace(/\.[^/.]+$/, '');
            const newName = `${base}-min.${ext}`;
            FF.downloadBlob(resultBlob, newName);
            FF.toast('Compressed image downloaded!', 'success');
        });
    }

    async function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            FF.toast('Please upload an image file.', 'error');
            return;
        }

        try {
            currentFile = file;
            loadedImage = await FF.loadImage(file);

            fileName.textContent = file.name;
            fileSize.textContent = FF.formatFileSize(file.size);
            fileType.textContent = (FF.getFileExtension(file.name) || 'IMG').toUpperCase();
            if (dims) dims.textContent = `${loadedImage.naturalWidth} × ${loadedImage.naturalHeight} px`;

            const url = URL.createObjectURL(file);
            preview.src = url;

            // Smart format selection
            if (formatSelect) {
                if (file.type === 'image/png') {
                    formatSelect.value = 'image/webp'; // WebP preserves alpha and compresses heavily
                } else if (file.type === 'image/webp') {
                    formatSelect.value = 'image/webp';
                } else {
                    formatSelect.value = 'image/jpeg';
                }
            }

            FF.hide(upload);
            FF.show(fileCard);
            FF.show(controls);
            FF.hide(result);
            FF.hide(processing);
            resultBlob = null;
        } catch (err) {
            FF.toast(err.message || 'Failed to read image.', 'error');
        }
    }

    async function compressImage() {
        if (!currentFile || !loadedImage) {
            FF.toast('No image selected.', 'error');
            return;
        }

        const quality = parseInt(qualitySlider.value, 10) / 100;
        const outputMime = formatSelect ? formatSelect.value : 'image/jpeg';

        FF.hide(controls);
        FF.show(processing);

        try {
            const canvas = document.createElement('canvas');
            canvas.width = loadedImage.naturalWidth;
            canvas.height = loadedImage.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            if (outputMime === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(loadedImage, 0, 0);

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Compression encoding failed.'));
                }, outputMime, quality);
            });

            resultBlob = blob;

            FF.hide(processing);
            FF.show(result);

            if (origImg) origImg.src = URL.createObjectURL(currentFile);
            if (compImg) compImg.src = URL.createObjectURL(blob);
            if (origSize) origSize.textContent = FF.formatFileSize(currentFile.size);
            if (compSize) compSize.textContent = FF.formatFileSize(blob.size);

            const saved = currentFile.size - blob.size;
            const pct = Math.round((saved / currentFile.size) * 100);

            if (reduction) {
                if (saved > 0) {
                    reduction.textContent = `Saved ${pct}% (${FF.formatFileSize(saved)})`;
                    reduction.className = 'stat-value text-success';
                } else {
                    reduction.textContent = `New size: ${FF.formatFileSize(blob.size)}`;
                    reduction.className = 'stat-value text-muted';
                }
            }

            FF.toast('Image compressed successfully!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Compression failed.', 'error');
        }
    }

    function resetTool() {
        currentFile = null;
        loadedImage = null;
        resultBlob = null;
        fileInput.value = '';

        FF.hide(fileCard);
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);

        if (preview && preview.src) URL.revokeObjectURL(preview.src);
    }
})();
