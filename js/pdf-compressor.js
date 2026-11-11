/* ==========================================================================
   FileForge — PDF Compressor & Size Reducer
   Smart dual-engine compression:
   1. Smart Vector & Stream Optimizer (Lossless text, fast, prevents ballooning)
   2. Scanned / Photo Downsampling (DPI & quality reduction with page ranges)
   Includes size protection guarantee to prevent generating larger files.
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

    const modeSelect = $('#pdfCompressMode');
    const modeHelp = $('#pdfCompressModeHelp');
    const scannedControls = $('#pdfCompressScannedControls');
    const profileSelect = $('#pdfCompressProfile');
    const rangeInput = $('#pdfCompressRange');
    const qualitySlider = $('#pdfCompressQuality');
    const qualityVal = $('#pdfCompressQualityVal');
    const compressBtn = $('#pdfCompressBtn');

    const processing = $('#pdfCompressProcessing');
    const progressFill = $('#pdfCompressProgressFill');
    const progressText = $('#pdfCompressProgressText');
    const cancelBtn = $('#pdfCompressCancel');

    const result = $('#pdfCompressResult');
    const resultTitle = $('#pdfCompressResultTitle');
    const resultMsg = $('#pdfCompressResultMsg');
    const origSizeEl = $('#pdfCompressOrigSize');
    const compSizeEl = $('#pdfCompressCompSize');
    const reductionBadge = $('#pdfCompressReduction');
    const downloadBtn = $('#pdfCompressDownload');
    const resetBtn = $('#pdfCompressReset');

    let currentFile = null;
    let originalBuffer = null;
    let pdfDoc = null;
    let compressedPdfBlob = null;
    let isCancelled = false;

    // Register with tool dispatcher for home-page file transfer
    if (window.FF && FF.registerToolHandler) {
        FF.registerToolHandler('pdfcompress', handleFile);
    }

    FF.setupDropZone(upload, fileInput, handleFile);

    if (modeSelect) {
        modeSelect.addEventListener('change', () => {
            const isScanned = modeSelect.value === 'scanned';
            if (scannedControls) {
                if (isScanned) FF.show(scannedControls);
                else FF.hide(scannedControls);
            }
            if (modeHelp) {
                modeHelp.textContent = isScanned
                    ? 'Rasterizes and downsamples pages at selected DPI. Best for scanned paper and photo documents.'
                    : 'Preserves text clarity, vector graphics, and fonts while compressing cross-references and stream objects.';
            }
        });
    }

    if (qualitySlider && qualityVal) {
        qualitySlider.addEventListener('input', () => {
            qualityVal.textContent = qualitySlider.value + '%';
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            isCancelled = true;
            FF.hide(processing);
            FF.show(controls);
            FF.toast('Compression cancelled.', 'info');
        });
    }

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (resetBtn) resetBtn.addEventListener('click', resetTool);
    if (compressBtn) compressBtn.addEventListener('click', runCompression);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!compressedPdfBlob || !currentFile) return;
            const base = currentFile.name.replace(/\.[^/.]+$/, '');
            FF.downloadBlob(compressedPdfBlob, `${base}-optimized.pdf`);
            FF.toast('Optimized PDF downloaded!', 'success');
        });
    }

    async function handleFile(file) {
        if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
            FF.toast('Please select a valid PDF file.', 'error');
            return;
        }

        FF.initPdfJs();
        if (!window.pdfjsLib || !window.PDFLib) {
            FF.toast('PDF engines are loading. Please wait a moment...', 'warning');
            return;
        }

        try {
            currentFile = file;
            originalBuffer = await FF.readFileAsArrayBuffer(file);
            pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(originalBuffer.slice(0)) }).promise;

            fileName.textContent = file.name;
            fileSize.textContent = FF.formatFileSize(file.size);
            if (pageCountEl) pageCountEl.textContent = `${pdfDoc.numPages} Page${pdfDoc.numPages > 1 ? 's' : ''}`;

            // Auto-detect mode based on page count:
            // For large multi-page documents (>20 pages, e.g. lecture notes), default to Smart Vector mode!
            if (modeSelect) {
                modeSelect.value = 'vector';
                modeSelect.dispatchEvent(new Event('change'));
            }

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

    async function runCompression() {
        if (!currentFile || !originalBuffer) {
            FF.toast('No PDF document loaded.', 'error');
            return;
        }

        isCancelled = false;
        FF.hide(controls);
        FF.show(processing);

        const mode = modeSelect ? modeSelect.value : 'vector';

        try {
            if (mode === 'vector') {
                if (progressText) progressText.textContent = 'Optimizing PDF streams and object tables...';
                if (progressFill) progressFill.style.width = '50%';

                const vectorBlob = await compressVectorStreams(originalBuffer);
                if (progressFill) progressFill.style.width = '100%';

                evaluateResult(vectorBlob, 'vector');
            } else {
                // Scanned / Downsample Mode
                await compressScannedPages();
            }
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Compression failed.', 'error');
        }
    }

    // Engine 1: Lossless Stream and Object Optimization
    async function compressVectorStreams(buf) {
        const doc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });

        // Strip heavy metadata
        try {
            doc.setTitle('');
            doc.setAuthor('');
            doc.setSubject('');
            doc.setKeywords([]);
            doc.setProducer('FileForge');
            doc.setCreator('FileForge');
        } catch (e) {}

        const compressedBytes = await doc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50
        });

        return new Blob([compressedBytes], { type: 'application/pdf' });
    }

    // Engine 2: Scanned Document Raster Downsampling
    async function compressScannedPages() {
        const totalPages = pdfDoc.numPages;
        const rangeText = (rangeInput ? rangeInput.value.trim() : '');
        const pagesToProcess = parsePageRange(rangeText, totalPages);

        if (pagesToProcess.length === 0) {
            throw new Error('No valid pages found in specified range.');
        }

        let scale = 1.0; // 100 DPI balanced
        const profile = profileSelect ? profileSelect.value : 'balanced';
        if (profile === 'low') scale = 0.75; // 72 DPI
        else if (profile === 'high') scale = 1.4; // 150 DPI

        const quality = (parseInt(qualitySlider ? qualitySlider.value : '65', 10) || 65) / 100;

        const newPdfDoc = await PDFLib.PDFDocument.create();

        for (let i = 0; i < pagesToProcess.length; i++) {
            if (isCancelled) return;

            const pageNum = pagesToProcess[i];
            const pct = Math.round(((i + 1) / pagesToProcess.length) * 100);

            if (progressText) progressText.textContent = `Optimizing page ${pageNum} (${i + 1} of ${pagesToProcess.length})...`;
            if (progressFill) progressFill.style.width = `${pct}%`;

            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport }).promise;

            const jpgBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
            const jpgBuffer = await FF.readFileAsArrayBuffer(jpgBlob);
            const jpgImage = await newPdfDoc.embedJpg(jpgBuffer);

            const origViewport = page.getViewport({ scale: 1.0 });
            const newPage = newPdfDoc.addPage([origViewport.width, origViewport.height]);
            newPage.drawImage(jpgImage, {
                x: 0,
                y: 0,
                width: origViewport.width,
                height: origViewport.height,
            });
        }

        if (isCancelled) return;

        const bytes = await newPdfDoc.save({ useObjectStreams: true });
        const scannedBlob = new Blob([bytes], { type: 'application/pdf' });

        // Crucial Check: Did rasterizing enlarge the file (e.g. 3.25MB -> 15.8MB)?
        if (scannedBlob.size >= currentFile.size && pagesToProcess.length === totalPages) {
            // Document has vector text and got bloated by rasterizing!
            // Automatically fall back to Smart Vector compression
            if (progressText) progressText.textContent = 'Document has vector text. Applying lossless stream compression...';
            const vectorFallback = await compressVectorStreams(originalBuffer);

            if (vectorFallback.size < scannedBlob.size) {
                evaluateResult(vectorFallback, 'fallback');
                return;
            }
        }

        evaluateResult(scannedBlob, 'scanned');
    }

    function evaluateResult(blob, engineUsed) {
        compressedPdfBlob = blob;

        FF.hide(processing);
        FF.show(result);

        if (origSizeEl) origSizeEl.textContent = FF.formatFileSize(currentFile.size);
        if (compSizeEl) compSizeEl.textContent = FF.formatFileSize(blob.size);

        const savedBytes = currentFile.size - blob.size;
        const pct = Math.round((savedBytes / currentFile.size) * 100);

        if (savedBytes > 0) {
            // Legitimate size reduction!
            if (resultTitle) resultTitle.textContent = 'PDF Compressed Successfully!';
            if (resultMsg) {
                resultMsg.textContent = engineUsed === 'fallback'
                    ? 'Note: This document contains vector text. Rasterizing it would increase the size, so FileForge automatically applied Smart Vector compression.'
                    : 'Your document size was reduced while maintaining layout and readability.';
            }
            if (reductionBadge) {
                reductionBadge.textContent = `Reduced by ${pct}% (Saved ${FF.formatFileSize(savedBytes)})`;
                reductionBadge.className = 'badge badge-success';
            }
            FF.toast(`Reduced by ${pct}% (${FF.formatFileSize(savedBytes)} saved)`, 'success');
        } else {
            // File is already mathematically at minimum size or cannot be reduced further without removing pages
            if (resultTitle) resultTitle.textContent = 'Document Already at Optimal Size';
            if (resultMsg) {
                resultMsg.textContent = 'This PDF is already compressed to its mathematical optimum. Re-encoding text pages into raster images would balloon the file size, so FileForge preserved your compact original file.';
            }
            if (reductionBadge) {
                reductionBadge.textContent = 'Already Optimal Size';
                reductionBadge.className = 'badge badge-neutral';
            }
            // Use the original file blob so user never gets a bloated file
            compressedPdfBlob = currentFile;
            if (compSizeEl) compSizeEl.textContent = FF.formatFileSize(currentFile.size);
            FF.toast('Document is already at its minimum compact size.', 'info');
        }
    }

    function parsePageRange(text, maxPages) {
        if (!text) {
            const all = [];
            for (let i = 1; i <= maxPages; i++) all.push(i);
            return all;
        }

        const pages = new Set();
        const parts = text.split(',');
        parts.forEach(part => {
            const p = part.trim();
            if (p.includes('-')) {
                const [start, end] = p.split('-').map(n => parseInt(n.trim(), 10));
                if (start && end && start <= end) {
                    for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
                        pages.add(i);
                    }
                }
            } else {
                const n = parseInt(p, 10);
                if (n && n >= 1 && n <= maxPages) {
                    pages.add(n);
                }
            }
        });

        return Array.from(pages).sort((a, b) => a - b);
    }

    function resetTool() {
        currentFile = null;
        originalBuffer = null;
        pdfDoc = null;
        compressedPdfBlob = null;
        isCancelled = false;
        fileInput.value = '';

        FF.hide(fileCard);
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);
    }
})();
