/* ==========================================
   FileForge — File Size Reducer
   ========================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload     = $('#reducerUpload');
    const fileInput  = $('#reducerFileInput');
    const fileCard   = $('#reducerFileCard');
    const preview    = $('#reducerPreview');
    const fileName   = $('#reducerFileName');
    const fileSize   = $('#reducerFileSize');
    const fileType   = $('#reducerFileType');
    const removeBtn  = $('#reducerRemove');
    const controls   = $('#reducerControls');
    const qualitySlider = $('#reducerQuality');
    const qualityValue  = $('#reducerQualityValue');
    const estimate   = $('#reducerEstimate');
    const origEst    = $('#reducerOrigEst');
    const outEst     = $('#reducerOutEst');
    const savingsEst = $('#reducerSavingsEst');
    const compressBtn = $('#reducerCompress');
    const processing = $('#reducerProcessing');
    const result     = $('#reducerResult');
    const reduction  = $('#reducerReduction');
    const origInfo   = $('#reducerOrigInfo');
    const outInfo    = $('#reducerOutInfo');
    const savedInfo  = $('#reducerSavedInfo');
    const downloadBtn = $('#reducerDownload');
    const resetBtn   = $('#reducerReset');

    let currentFile = null;
    let resultBlob  = null;
    let estimateTimer = null;

    FF.setupDropZone(upload, fileInput, handleFile);

    if (qualitySlider) {
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value;
            scheduleEstimate();
        });
    }

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (compressBtn) compressBtn.addEventListener('click', reduceFile);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!resultBlob || !currentFile) return;
            const ext = FF.getFileExtension(currentFile.name) || 'jpg';
            const newName = currentFile.name.replace(/\.[^/.]+$/, '') + '-reduced.' + ext;
            FF.downloadBlob(resultBlob, newName);
            FF.toast('Reduced file downloaded!', 'success');
        });
    }

    if (resetBtn) resetBtn.addEventListener('click', resetTool);

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            FF.toast('Please upload an image file (PNG, JPG, or WEBP).', 'error');
            return;
        }
        const supported = ['image/jpeg', 'image/png', 'image/webp'];
        if (!supported.includes(file.type)) {
            FF.toast('Currently only PNG, JPG, and WEBP are supported.', 'warning');
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

        FF.hide(upload);
        FF.show(fileCard);
        FF.show(controls);
        FF.hide(result);
        FF.hide(processing);
        resultBlob = null;

        scheduleEstimate();
    }

    function scheduleEstimate() {
        clearTimeout(estimateTimer);
        estimateTimer = setTimeout(updateEstimate, 300);
    }

    function updateEstimate() {
        if (!currentFile) return;
        const quality = parseInt(qualitySlider.value) / 100;
        // Rough estimate: quality² approximates compression ratio for JPEG
        const factor = quality * quality;
        const estimated = Math.round(currentFile.size * factor);
        const saved = currentFile.size - estimated;
        const savedPct = Math.round((saved / currentFile.size) * 100);

        origEst.textContent    = FF.formatFileSize(currentFile.size);
        outEst.textContent     = '~' + FF.formatFileSize(Math.max(estimated, 1024));
        savingsEst.textContent = savedPct > 0 ? '~' + savedPct + '% smaller' : 'Minimal savings';
        FF.show(estimate);
    }

    async function reduceFile() {
        if (!currentFile) {
            FF.toast('No file selected.', 'error');
            return;
        }

        const quality = parseInt(qualitySlider.value) / 100;
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
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Reduction failed.')), outputMime, quality);
            });

            resultBlob = blob;
            FF.hide(processing);
            FF.show(result);

            const saved = currentFile.size - blob.size;
            const savedPct = Math.round((saved / currentFile.size) * 100);
            reduction.textContent = savedPct > 0
                ? `Reduced by ${savedPct}%`
                : 'File processed';

            origInfo.textContent  = FF.formatFileSize(currentFile.size);
            outInfo.textContent   = FF.formatFileSize(blob.size);
            savedInfo.textContent = saved > 0
                ? FF.formatFileSize(saved) + ' saved (' + savedPct + '%)'
                : 'No size reduction';

            FF.toast('File size reduced!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Reduction failed.', 'error');
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
        FF.hide(estimate);
        FF.show(upload);

        if (preview.src) URL.revokeObjectURL(preview.src);
    }

})();
