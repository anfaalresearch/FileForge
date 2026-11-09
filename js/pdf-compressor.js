/* ==========================================================================
   FileForge — PDF Compressor & Size Reducer
   Client-side PDF size reduction and image stream recompression via pdf.js + pdf-lib.
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload = $('#pdfCompressUpload');
    const fileInput = $('#pdfCompressFileInput');
    const fileCard = $('#pdfCompressFileCard');
    const fileName = $('#pdfCompressFileName');
    const fileSize = $('#pdfCompressFileSize');
    const pageCountEl = $('#pdfCompressPageCount');
    const removeBtn = $('#pdfCompressRemove');
    const controls = $('#pdfCompressControls');

    const profileSelect = $('#pdfCompressProfile');
    const customQualityGroup = $('#pdfCompressCustomGroup');
    const qualitySlider = $('#pdfCompressQuality');
    const qualityVal = $('#pdfCompressQualityVal');
    const compressBtn = $('#pdfCompressBtn');

    const processing = $('#pdfCompressProcessing');
    const progressFill = $('#pdfCompressProgressFill');
    const progressText = $('#pdfCompressProgressText');

    const result = $('#pdfCompressResult');
    const origSizeEl = $('#pdfCompressOrigSize');
    const compSizeEl = $('#pdfCompressCompSize');
    const reductionBadge = $('#pdfCompressReduction');
    const downloadBtn = $('#pdfCompressDownload');
    const resetBtn = $('#pdfCompressReset');

    let currentFile = null;
    let pdfDoc = null;
    let compressedPdfBlob = null;

    FF.setupDropZone(upload, fileInput, handleFile);

    if (profileSelect) {
        profileSelect.addEventListener('change', () => {
            if (profileSelect.value === 'custom') {
                if (customQualityGroup) FF.show(customQualityGroup);
            } else {
                if (customQualityGroup) FF.hide(customQualityGroup);
            }
        });
    }

    if (qualitySlider && qualityVal) {
        qualitySlider.addEventListener('input', () => {
            qualityVal.textContent = qualitySlider.value + '%';
        });
    }

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (resetBtn) resetBtn.addEventListener('click', resetTool);
    if (compressBtn) compressBtn.addEventListener('click', compressPdf);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!compressedPdfBlob || !currentFile) return;
            const base = currentFile.name.replace(/\.[^/.]+$/, '');
            FF.downloadBlob(compressedPdfBlob, `${base}-compressed.pdf`);
            FF.toast('Compressed PDF downloaded!', 'success');
        });
    }

    async function handleFile(file) {
        if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
            FF.toast('Please select a valid PDF file.', 'error');
            return;
        }

        FF.initPdfJs();
        if (!window.pdfjsLib || !window.PDFLib) {
            FF.toast('PDF engines are loading. Please wait a few seconds.', 'warning');
            return;
        }

        try {
            currentFile = file;
            const buffer = await FF.readFileAsArrayBuffer(file);
            pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

            fileName.textContent = file.name;
            fileSize.textContent = FF.formatFileSize(file.size);
            if (pageCountEl) pageCountEl.textContent = `${pdfDoc.numPages} Page${pdfDoc.numPages > 1 ? 's' : ''}`;

            FF.hide(upload);
            FF.show(fileCard);
            FF.show(controls);
            FF.hide(result);
            FF.hide(processing);
            compressedPdfBlob = null;
        } catch (err) {
            FF.toast('Failed to load PDF. It may be password-protected or corrupted.', 'error');
        }
    }

    async function compressPdf() {
        if (!currentFile || !pdfDoc) {
            FF.toast('No PDF file loaded.', 'error');
            return;
        }

        FF.hide(controls);
        FF.show(processing);

        // Profile settings
        let scale = 1.3;
        let quality = 0.70;

        const profile = profileSelect ? profileSelect.value : 'balanced';
        if (profile === 'extreme') {
            scale = 1.0;
            quality = 0.50;
        } else if (profile === 'light') {
            scale = 1.6;
            quality = 0.85;
        } else if (profile === 'custom') {
            const q = parseInt(qualitySlider.value, 10) || 70;
            quality = q / 100;
            scale = q > 75 ? 1.5 : 1.2;
        }

        try {
            const newPdfDoc = await PDFLib.PDFDocument.create();
            const totalPages = pdfDoc.numPages;

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                if (progressText) progressText.textContent = `Compressing page ${pageNum} of ${totalPages}...`;
                if (progressFill) progressFill.style.width = `${Math.round((pageNum / totalPages) * 100)}%`;

                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Fill background white
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({ canvasContext: ctx, viewport }).promise;

                // Convert canvas to JPEG blob
                const jpgBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
                const jpgBuffer = await FF.readFileAsArrayBuffer(jpgBlob);
                const jpgImage = await newPdfDoc.embedJpg(jpgBuffer);

                // Use the unscaled original viewport dimensions for PDF page sizing
                const origViewport = page.getViewport({ scale: 1.0 });
                const newPage = newPdfDoc.addPage([origViewport.width, origViewport.height]);
                newPage.drawImage(jpgImage, {
                    x: 0,
                    y: 0,
                    width: origViewport.width,
                    height: origViewport.height,
                });
            }

            const compressedBytes = await newPdfDoc.save();
            compressedPdfBlob = new Blob([compressedBytes], { type: 'application/pdf' });

            FF.hide(processing);
            FF.show(result);

            if (origSizeEl) origSizeEl.textContent = FF.formatFileSize(currentFile.size);
            if (compSizeEl) compSizeEl.textContent = FF.formatFileSize(compressedPdfBlob.size);

            const savedBytes = currentFile.size - compressedPdfBlob.size;
            const pct = Math.round((savedBytes / currentFile.size) * 100);

            if (reductionBadge) {
                if (savedBytes > 0) {
                    reductionBadge.textContent = `Reduced by ${pct}% (Saved ${FF.formatFileSize(savedBytes)})`;
                    reductionBadge.className = 'badge badge-success';
                } else {
                    reductionBadge.textContent = `Optimized size: ${FF.formatFileSize(compressedPdfBlob.size)}`;
                    reductionBadge.className = 'badge badge-neutral';
                }
            }

            FF.toast('PDF compressed successfully!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Compression failed.', 'error');
        }
    }

    function resetTool() {
        currentFile = null;
        pdfDoc = null;
        compressedPdfBlob = null;
        fileInput.value = '';

        FF.hide(fileCard);
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);
    }
})();
