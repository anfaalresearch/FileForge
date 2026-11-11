/* ==========================================================================
   FileForge — Image Resizer
   High-precision image resizing with custom dimensions (e.g. 215x100),
   aspect ratio locking/unlocking, presets, percentage scale, and fit modes.
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    // Elements
    const upload = $('#resizerUpload');
    const fileInput = $('#resizerFileInput');
    const fileCard = $('#resizerFileCard');
    const preview = $('#resizerPreview');
    const fileName = $('#resizerFileName');
    const fileSize = $('#resizerFileSize');
    const fileType = $('#resizerFileType');
    const dims = $('#resizerDims');
    const removeBtn = $('#resizerRemove');
    const controls = $('#resizerControls');

    const widthIn = $('#resizerWidth');
    const heightIn = $('#resizerHeight');
    const lockBtn = $('#resizerLock');
    const percentSlider = $('#resizerPercent');
    const percentVal = $('#resizerPercentVal');
    const fitModeSelect = $('#resizerFitMode');

    const resizeBtn = $('#resizerResize');
    const processing = $('#resizerProcessing');
    const result = $('#resizerResult');
    const resultPreview = $('#resizerResultPreview');
    const origInfo = $('#resizerOrigInfo');
    const outInfo = $('#resizerOutInfo');
    const sizeInfo = $('#resizerSizeInfo');
    const downloadBtn = $('#resizerDownload');
    const resetBtn = $('#resizerReset');

    let currentFile = null;
    let loadedImage = null;
    let resultBlob = null;
    let origW = 0, origH = 0;
    let aspectLocked = false; // Default unlocked so user can freely input arbitrary dimensions like 215x100!

    // Setup drop zone
    FF.setupDropZone(upload, fileInput, handleFile);
    if (window.FF && FF.registerToolHandler) FF.registerToolHandler('resizer', handleFile);

    // Aspect ratio lock toggle
    if (lockBtn) {
        lockBtn.addEventListener('click', () => {
            aspectLocked = !aspectLocked;
            updateLockState();
        });
    }

    function updateLockState() {
        if (!lockBtn) return;
        lockBtn.classList.toggle('active', aspectLocked);
        lockBtn.title = aspectLocked ? 'Aspect Ratio Locked (Click to Unlock)' : 'Aspect Ratio Unlocked (Click to Lock)';
        const iconLock = lockBtn.querySelector('.icon-lock');
        const iconUnlock = lockBtn.querySelector('.icon-unlock');
        if (iconLock && iconUnlock) {
            iconLock.style.display = aspectLocked ? 'inline-block' : 'none';
            iconUnlock.style.display = aspectLocked ? 'none' : 'inline-block';
        }
    }

    // Width input change
    if (widthIn) {
        widthIn.addEventListener('input', () => {
            const w = parseInt(widthIn.value, 10) || 0;
            if (aspectLocked && origW && origH && w > 0) {
                heightIn.value = Math.round(w * (origH / origW));
            }
            updatePercentDisplay();
        });
    }

    // Height input change
    if (heightIn) {
        heightIn.addEventListener('input', () => {
            const h = parseInt(heightIn.value, 10) || 0;
            if (aspectLocked && origW && origH && h > 0) {
                widthIn.value = Math.round(h * (origW / origH));
            }
            updatePercentDisplay();
        });
    }

    // Percentage slider
    if (percentSlider && percentVal) {
        percentSlider.addEventListener('input', () => {
            const pct = parseInt(percentSlider.value, 10);
            percentVal.textContent = pct + '%';
            if (origW && origH) {
                widthIn.value = Math.round(origW * (pct / 100));
                heightIn.value = Math.round(origH * (pct / 100));
            }
        });
    }

    function updatePercentDisplay() {
        if (!origW || !percentVal || !widthIn) return;
        const w = parseInt(widthIn.value, 10) || 0;
        if (w > 0) {
            const calculatedPct = Math.round((w / origW) * 100);
            if (percentSlider) percentSlider.value = Math.min(Math.max(calculatedPct, 10), 300);
            percentVal.textContent = calculatedPct + '%';
        }
    }

    // Preset buttons (Dimensions and Aspect Ratios)
    document.querySelectorAll('#resizerControls .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const w = btn.getAttribute('data-w');
            const h = btn.getAttribute('data-h');
            const ratio = btn.getAttribute('data-ratio');

            if (w && h) {
                // Exact custom dimensions like 215x100
                widthIn.value = w;
                heightIn.value = h;
                aspectLocked = false;
                updateLockState();
            } else if (ratio && origW) {
                // Apply specific aspect ratio to current image
                const parts = ratio.split(':');
                const rx = parseFloat(parts[0]);
                const ry = parseFloat(parts[1]);
                if (rx && ry) {
                    const currentW = parseInt(widthIn.value, 10) || origW;
                    heightIn.value = Math.round(currentW * (ry / rx));
                    aspectLocked = true;
                    updateLockState();
                }
            }
            updatePercentDisplay();
        });
    });

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (resetBtn) resetBtn.addEventListener('click', resetTool);
    if (resizeBtn) resizeBtn.addEventListener('click', resizeImage);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!resultBlob || !currentFile) return;
            const ext = FF.getFileExtension(currentFile.name) || 'png';
            const w = widthIn.value || 'resized';
            const h = heightIn.value || 'resized';
            const newName = FF.changeExt(currentFile.name, `${w}x${h}.${ext}`);
            FF.downloadBlob(resultBlob, newName);
            FF.toast('Resized image downloaded!', 'success');
        });
    }

    async function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            FF.toast('Please upload a valid image.', 'error');
            return;
        }

        try {
            currentFile = file;
            loadedImage = await FF.loadImage(file);
            origW = loadedImage.naturalWidth;
            origH = loadedImage.naturalHeight;

            fileName.textContent = file.name;
            fileSize.textContent = FF.formatFileSize(file.size);
            fileType.textContent = (FF.getFileExtension(file.name) || 'IMG').toUpperCase();
            if (dims) dims.textContent = `${origW} × ${origH} px`;

            const url = URL.createObjectURL(file);
            preview.src = url;

            // Initialize inputs
            widthIn.value = origW;
            heightIn.value = origH;
            if (percentSlider) percentSlider.value = 100;
            if (percentVal) percentVal.textContent = '100%';

            updateLockState();

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

    async function resizeImage() {
        if (!loadedImage || !currentFile) {
            FF.toast('No image selected.', 'error');
            return;
        }

        const targetW = parseInt(widthIn.value, 10);
        const targetH = parseInt(heightIn.value, 10);

        if (!targetW || targetW <= 0 || !targetH || targetH <= 0) {
            FF.toast('Please specify valid positive width and height.', 'warning');
            return;
        }

        FF.hide(controls);
        FF.show(processing);

        try {
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const fitMode = fitModeSelect ? fitModeSelect.value : 'stretch';

            if (fitMode === 'contain') {
                // Keep aspect ratio, letterbox with transparent or white background
                ctx.clearRect(0, 0, targetW, targetH);
                const scale = Math.min(targetW / origW, targetH / origH);
                const drawW = origW * scale;
                const drawH = origH * scale;
                const dx = (targetW - drawW) / 2;
                const dy = (targetH - drawH) / 2;
                ctx.drawImage(loadedImage, dx, dy, drawW, drawH);
            } else if (fitMode === 'cover') {
                // Center crop to fill target dimensions
                const scale = Math.max(targetW / origW, targetH / origH);
                const drawW = origW * scale;
                const drawH = origH * scale;
                const dx = (targetW - drawW) / 2;
                const dy = (targetH - drawH) / 2;
                ctx.drawImage(loadedImage, dx, dy, drawW, drawH);
            } else {
                // Exact stretch to given dimensions (e.g. 215 * 100)
                ctx.drawImage(loadedImage, 0, 0, targetW, targetH);
            }

            const mime = currentFile.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
            const quality = mime === 'image/jpeg' ? 0.92 : undefined;

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Resizing render failed.'));
                }, mime, quality);
            });

            resultBlob = blob;

            FF.hide(processing);
            FF.show(result);

            if (resultPreview) resultPreview.src = URL.createObjectURL(blob);
            if (origInfo) origInfo.textContent = `${origW} × ${origH} px (${FF.formatFileSize(currentFile.size)})`;
            if (outInfo) outInfo.textContent = `${targetW} × ${targetH} px (${fitMode})`;
            if (sizeInfo) sizeInfo.textContent = FF.formatFileSize(blob.size);

            FF.toast(`Resized to ${targetW} × ${targetH} px successfully!`, 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Resize failed.', 'error');
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
