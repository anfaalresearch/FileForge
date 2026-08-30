/* ==========================================
   FileForge — Image Cropper
   ========================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload    = $('#cropperUpload');
    const fileInput = $('#cropperFileInput');
    const fileCard  = $('#cropperFileCard');
    const preview   = $('#cropperPreview');
    const fileName  = $('#cropperFileName');
    const fileSize  = $('#cropperFileSize');
    const fileType  = $('#cropperFileType');
    const removeBtn = $('#cropperRemove');
    const controls  = $('#cropperControls');
    const zoomSlider = $('#cropperZoom');
    const zoomValue  = $('#cropperZoomValue');
    const rotateBtn  = $('#cropperRotate');
    const resetCropBtn = $('#cropperResetCrop');
    const cropBtn    = $('#cropperCrop');
    const canvasWrap = $('#cropperCanvasWrap');
    const canvas     = $('#cropperCanvas');
    const cropOverlay = $('#cropOverlay');
    const cropBox    = $('#cropBox');
    const processing = $('#cropperProcessing');
    const result     = $('#cropperResult');
    const resultPreview = $('#cropperResultPreview');
    const origInfo   = $('#cropperOrigInfo');
    const outInfo    = $('#cropperOutInfo');
    const sizeInfo   = $('#cropperSizeInfo');
    const downloadBtn = $('#cropperDownload');
    const resetAllBtn = $('#cropperResetAll');

    let currentFile = null;
    let resultBlob  = null;
    let img = null;
    let rotation = 0;
    let zoom = 1;
    let aspectRatio = null; // null = free
    let cropRect = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }; // relative to canvas (0-1)
    let drag = null; // { type: 'move'|handle, startX, startY, startRect }

    FF.setupDropZone(upload, fileInput, handleFile);

    // Aspect ratio preset buttons
    document.querySelectorAll('#cropperControls .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#cropperControls .preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const val = btn.getAttribute('data-ratio');
            if (val === 'free') {
                aspectRatio = null;
            } else {
                const [aw, ah] = val.split(':').map(Number);
                aspectRatio = aw / ah;
                if (img) enforceCropAspect();
            }
            if (img) drawCanvas();
        });
    });

    // Zoom slider
    if (zoomSlider) {
        zoomSlider.addEventListener('input', () => {
            zoom = parseInt(zoomSlider.value) / 100;
            zoomValue.textContent = zoomSlider.value;
            if (img) drawCanvas();
        });
    }

    // Rotate
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            rotation = (rotation + 90) % 360;
            if (img) drawCanvas();
        });
    }

    // Reset crop
    if (resetCropBtn) {
        resetCropBtn.addEventListener('click', () => {
            cropRect = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
            rotation = 0;
            zoom = 1;
            zoomSlider.value = 100;
            zoomValue.textContent = '100';
            if (img) drawCanvas();
        });
    }

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (cropBtn) cropBtn.addEventListener('click', cropImage);
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!resultBlob || !currentFile) return;
            const ext = FF.getFileExtension(currentFile.name) || 'png';
            const newName = currentFile.name.replace(/\.[^/.]+$/, '') + '-cropped.' + ext;
            FF.downloadBlob(resultBlob, newName);
            FF.toast('Cropped image downloaded!', 'success');
        });
    }
    if (resetAllBtn) resetAllBtn.addEventListener('click', resetTool);

    // ---- Drag handling on crop overlay ----
    if (cropOverlay) {
        cropOverlay.addEventListener('mousedown', startDrag);
        cropOverlay.addEventListener('touchstart', startDragTouch, { passive: false });
    }

    function startDrag(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        const handle = e.target.getAttribute('data-handle');
        initDrag(e.clientX, e.clientY, handle);
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', endDrag);
    }

    function startDragTouch(e) {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        const handle = e.target.getAttribute('data-handle');
        initDrag(e.touches[0].clientX, e.touches[0].clientY, handle);
        window.addEventListener('touchmove', onDragTouch, { passive: false });
        window.addEventListener('touchend', endDragTouch);
    }

    function initDrag(clientX, clientY, handle) {
        drag = {
            type: handle || 'move',
            startX: clientX,
            startY: clientY,
            startRect: { ...cropRect },
        };
    }

    function onDrag(e) {
        if (!drag) return;
        applyDrag(e.clientX, e.clientY);
    }

    function onDragTouch(e) {
        if (!drag || e.touches.length !== 1) return;
        e.preventDefault();
        applyDrag(e.touches[0].clientX, e.touches[0].clientY);
    }

    function applyDrag(clientX, clientY) {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;
        const dx = (clientX - drag.startX) / cw;
        const dy = (clientY - drag.startY) / ch;
        const sr = drag.startRect;

        if (drag.type === 'move') {
            let nx = sr.x + dx;
            let ny = sr.y + dy;
            nx = Math.max(0, Math.min(1 - sr.w, nx));
            ny = Math.max(0, Math.min(1 - sr.h, ny));
            cropRect.x = nx;
            cropRect.y = ny;
        } else {
            let { x, y, w, h } = sr;
            const h_ = drag.type;
            if (h_.includes('e')) { w = Math.max(0.05, sr.w + dx); }
            if (h_.includes('s')) { h = Math.max(0.05, sr.h + dy); }
            if (h_.includes('w')) { const nw = Math.max(0.05, sr.w - dx); x = sr.x + (sr.w - nw); w = nw; }
            if (h_.includes('n')) { const nh = Math.max(0.05, sr.h - dy); y = sr.y + (sr.h - nh); h = nh; }
            // Clamp
            if (x < 0) { w += x; x = 0; }
            if (y < 0) { h += y; y = 0; }
            if (x + w > 1) w = 1 - x;
            if (y + h > 1) h = 1 - y;
            if (aspectRatio) {
                const targetH = w / aspectRatio;
                h = targetH;
                if (y + h > 1) { h = 1 - y; w = h * aspectRatio; }
            }
            cropRect = { x, y, w, h };
        }
        updateCropBox();
    }

    function endDrag() {
        drag = null;
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', endDrag);
    }

    function endDragTouch() {
        drag = null;
        window.removeEventListener('touchmove', onDragTouch);
        window.removeEventListener('touchend', endDragTouch);
    }

    function enforceCropAspect() {
        if (!aspectRatio) return;
        const targetH = cropRect.w / aspectRatio;
        cropRect.h = Math.min(targetH, 1 - cropRect.y);
        cropRect.w = cropRect.h * aspectRatio;
    }

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

        FF.hide(upload);
        FF.show(fileCard);
        FF.show(controls);
        FF.show(canvasWrap);
        FF.hide(result);
        FF.hide(processing);
        resultBlob = null;

        const tempImg = new Image();
        tempImg.onload = () => {
            img = tempImg;
            cropRect = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
            rotation = 0;
            zoom = 1;
            zoomSlider.value = 100;
            zoomValue.textContent = '100';
            drawCanvas();
        };
        tempImg.src = url;
    }

    function drawCanvas() {
        if (!img || !canvas) return;
        const isRotated90 = rotation === 90 || rotation === 270;
        const displayW = isRotated90 ? img.naturalHeight : img.naturalWidth;
        const displayH = isRotated90 ? img.naturalWidth  : img.naturalHeight;

        const maxW = canvasWrap.clientWidth || 600;
        const maxH = 400;
        let scale = Math.min(maxW / displayW, maxH / displayH, 1) * zoom;
        canvas.width  = Math.round(displayW * scale);
        canvas.height = Math.round(displayH * scale);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth * scale / 2, -img.naturalHeight * scale / 2, img.naturalWidth * scale, img.naturalHeight * scale);
        ctx.restore();

        updateCropBox();
    }

    function updateCropBox() {
        if (!canvas || !cropBox || !cropOverlay) return;
        const cw = canvas.clientWidth  || canvas.width;
        const ch = canvas.clientHeight || canvas.height;
        cropBox.style.left   = (cropRect.x * 100) + '%';
        cropBox.style.top    = (cropRect.y * 100) + '%';
        cropBox.style.width  = (cropRect.w * 100) + '%';
        cropBox.style.height = (cropRect.h * 100) + '%';
        // Overlay shadows the non-crop area via CSS
    }

    async function cropImage() {
        if (!img || !currentFile) {
            FF.toast('No file selected.', 'error');
            return;
        }

        FF.hide(controls);
        FF.hide(canvasWrap);
        FF.show(processing);

        try {
            const isRotated90 = rotation === 90 || rotation === 270;
            const srcW = isRotated90 ? img.naturalHeight : img.naturalWidth;
            const srcH = isRotated90 ? img.naturalWidth  : img.naturalHeight;

            const sx = Math.round(cropRect.x * srcW);
            const sy = Math.round(cropRect.y * srcH);
            const sw = Math.round(cropRect.w * srcW);
            const sh = Math.round(cropRect.h * srcH);

            const offscreen = document.createElement('canvas');
            offscreen.width  = isRotated90 ? img.naturalHeight : img.naturalWidth;
            offscreen.height = isRotated90 ? img.naturalWidth  : img.naturalHeight;
            const octx = offscreen.getContext('2d');
            octx.save();
            octx.translate(offscreen.width / 2, offscreen.height / 2);
            octx.rotate((rotation * Math.PI) / 180);
            octx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
            octx.restore();

            // Crop out
            const out = document.createElement('canvas');
            out.width  = sw;
            out.height = sh;
            const outCtx = out.getContext('2d');
            outCtx.drawImage(offscreen, sx, sy, sw, sh, 0, 0, sw, sh);

            const mime = currentFile.type || 'image/png';
            const blob = await new Promise((resolve, reject) => {
                out.toBlob(b => b ? resolve(b) : reject(new Error('Crop failed.')), mime, 0.92);
            });

            resultBlob = blob;
            FF.hide(processing);
            FF.show(result);

            resultPreview.src = URL.createObjectURL(blob);
            origInfo.textContent = img.naturalWidth + '×' + img.naturalHeight + ' — ' + FF.formatFileSize(currentFile.size);
            outInfo.textContent  = sw + '×' + sh + ' — ' + FF.mimeToExt(mime).toUpperCase();
            sizeInfo.textContent = FF.formatFileSize(blob.size);

            FF.toast('Image cropped!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.show(canvasWrap);
            FF.toast(err.message || 'Crop failed.', 'error');
        }
    }

    function resetTool() {
        currentFile = null;
        resultBlob  = null;
        img = null;
        rotation = 0;
        zoom = 1;
        fileInput.value = '';

        FF.hide(fileCard);
        FF.hide(controls);
        FF.hide(canvasWrap);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);

        if (preview.src) URL.revokeObjectURL(preview.src);
        if (resultPreview && resultPreview.src) URL.revokeObjectURL(resultPreview.src);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

})();
