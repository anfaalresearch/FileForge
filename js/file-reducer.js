/* ==========================================================================
   FileForge — Image File Size Reducer (Target Size Reducer)
   Compresses images to an exact target file size (e.g. 100KB, 200KB, 500KB)
   using binary search optimization across quality and canvas resolution.
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload = $('#reducerUpload');
    const fileInput = $('#reducerFileInput');
    const fileCard = $('#reducerFileCard');
    const preview = $('#reducerPreview');
    const fileName = $('#reducerFileName');
    const fileSize = $('#reducerFileSize');
    const fileType = $('#reducerFileType');
    const removeBtn = $('#reducerRemove');
    const controls = $('#reducerControls');

    const targetUnit = $('#reducerTargetUnit');
    const targetInput = $('#reducerTargetSize');
    const compressBtn = $('#reducerCompress');
    const processing = $('#reducerProcessing');
    const progressText = $('#reducerProgressText');
    const result = $('#reducerResult');
    const resultPreview = $('#reducerResultPreview');
    const origInfo = $('#reducerOrigInfo');
    const outInfo = $('#reducerOutInfo');
    const savedInfo = $('#reducerSavedInfo');
    const downloadBtn = $('#reducerDownload');
    const resetBtn = $('#reducerReset');

    let currentFile = null;
    let loadedImage = null;
    let resultBlob = null;

    FF.setupDropZone(upload, fileInput, handleFile);
    if (window.FF && FF.registerToolHandler) FF.registerToolHandler('reducer', handleFile);

    // Preset pills (e.g. 50KB, 100KB, 200KB, 500KB, 1MB)
    document.querySelectorAll('#reducerControls .target-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const kb = btn.getAttribute('data-kb');
            if (kb && targetInput) {
                targetInput.value = kb;
                if (targetUnit) targetUnit.value = 'kb';
            }
        });
    });

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (resetBtn) resetBtn.addEventListener('click', resetTool);
    if (compressBtn) compressBtn.addEventListener('click', reduceToTargetSize);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!resultBlob || !currentFile) return;
            const ext = FF.getFileExtension(currentFile.name) || 'jpg';
            const newName = FF.changeExt(currentFile.name, `reduced.${ext === 'png' ? 'jpg' : ext}`);
            FF.downloadBlob(resultBlob, newName);
            FF.toast('Reduced file downloaded!', 'success');
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

            preview.src = URL.createObjectURL(file);

            // Default target size to roughly 40% of original or 200KB
            const defaultTargetKb = Math.max(Math.round((file.size * 0.4) / 1024), 50);
            if (targetInput) targetInput.value = defaultTargetKb;

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

    async function reduceToTargetSize() {
        if (!currentFile || !loadedImage) {
            FF.toast('No file selected.', 'error');
            return;
        }

        const unit = targetUnit ? targetUnit.value : 'kb';
        const num = parseFloat(targetInput ? targetInput.value : 100);
        if (!num || num <= 0) {
            FF.toast('Please enter a valid target size.', 'warning');
            return;
        }

        const targetBytes = (unit === 'mb') ? num * 1024 * 1024 : num * 1024;

        if (targetBytes >= currentFile.size) {
            FF.toast(`Target size is larger than or equal to current file size (${FF.formatFileSize(currentFile.size)}).`, 'info');
        }

        FF.hide(controls);
        FF.show(processing);
        if (progressText) progressText.textContent = 'Optimizing image quality and dimensions...';

        try {
            // Binary search algorithm to hit target file size
            const format = (currentFile.type === 'image/webp') ? 'image/webp' : 'image/jpeg';
            let bestBlob = null;
            let currentScale = 1.0;
            let iterations = 0;

            while (iterations < 12) {
                iterations++;
                let minQ = 0.05;
                let maxQ = 0.95;
                let qBlob = null;

                const curW = Math.max(Math.round(loadedImage.naturalWidth * currentScale), 32);
                const curH = Math.max(Math.round(loadedImage.naturalHeight * currentScale), 32);

                const canvas = document.createElement('canvas');
                canvas.width = curW;
                canvas.height = curH;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                if (format === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, curW, curH);
                }
                ctx.drawImage(loadedImage, 0, 0, curW, curH);

                // Binary search for quality
                for (let step = 0; step < 6; step++) {
                    const midQ = (minQ + maxQ) / 2;
                    const testBlob = await new Promise(r => canvas.toBlob(r, format, midQ));
                    if (!testBlob) break;

                    if (testBlob.size <= targetBytes) {
                        qBlob = testBlob;
                        minQ = midQ; // try to get better quality while staying under target
                    } else {
                        maxQ = midQ;
                    }
                }

                if (qBlob && qBlob.size <= targetBytes) {
                    bestBlob = qBlob;
                    break;
                } else {
                    // Even at low quality, image exceeds target size; downscale resolution by 20%
                    currentScale *= 0.8;
                    const lowestQBlob = await new Promise(r => canvas.toBlob(r, format, 0.08));
                    bestBlob = lowestQBlob;
                    if (curW < 120 || curH < 120) break; // Don't shrink to microscopic
                }
            }

            if (!bestBlob) {
                throw new Error('Could not compress image to target size.');
            }

            resultBlob = bestBlob;

            FF.hide(processing);
            FF.show(result);

            if (resultPreview) resultPreview.src = URL.createObjectURL(bestBlob);
            if (origInfo) origInfo.textContent = FF.formatFileSize(currentFile.size);
            if (outInfo) outInfo.textContent = FF.formatFileSize(bestBlob.size);

            const saved = currentFile.size - bestBlob.size;
            const pct = Math.round((saved / currentFile.size) * 100);
            if (savedInfo) {
                savedInfo.textContent = saved > 0
                    ? `Reduced by ${pct}% (saved ${FF.formatFileSize(saved)})`
                    : `Achieved ${FF.formatFileSize(bestBlob.size)}`;
            }

            FF.toast(`Target achieved: ${FF.formatFileSize(bestBlob.size)}`, 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Failed to compress to target size.', 'error');
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
        if (resultPreview && resultPreview.src) URL.revokeObjectURL(resultPreview.src);
    }
})();
