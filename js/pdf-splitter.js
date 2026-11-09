/* ==========================================================================
   FileForge — PDF Splitter & Page Extractor
   Extract specific pages, delete unwanted pages, or split into individual PDFs.
   100% client-side via pdf-lib and pdf.js.
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload = $('#pdfSplitUpload');
    const fileInput = $('#pdfSplitFileInput');
    const fileCard = $('#pdfSplitFileCard');
    const fileName = $('#pdfSplitFileName');
    const fileSize = $('#pdfSplitFileSize');
    const removeBtn = $('#pdfSplitRemove');
    const controls = $('#pdfSplitControls');

    const pageGrid = $('#pdfSplitPageGrid');
    const rangeInput = $('#pdfSplitRange');
    const selectAllBtn = $('#pdfSplitSelectAll');
    const deselectAllBtn = $('#pdfSplitDeselectAll');
    const selectedCountBadge = $('#pdfSplitSelectedCount');

    const extractBtn = $('#pdfSplitExtractBtn');
    const deleteBtn = $('#pdfSplitDeleteBtn');
    const splitAllBtn = $('#pdfSplitAllBtn');

    const processing = $('#pdfSplitProcessing');
    const progressText = $('#pdfSplitProgressText');
    const result = $('#pdfSplitResult');
    const resultDetails = $('#pdfSplitResultDetails');
    const downloadBtn = $('#pdfSplitDownload');
    const resetBtn = $('#pdfSplitReset');

    let currentFile = null;
    let originalBuffer = null;
    let pdfJsDoc = null;
    let totalPages = 0;
    let selectedPages = new Set(); // 1-indexed page numbers
    let resultBlob = null;
    let resultFilename = 'split_document.pdf';

    FF.setupDropZone(upload, fileInput, handleFile);

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            for (let i = 1; i <= totalPages; i++) selectedPages.add(i);
            updateGridSelection();
        });
    }

    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            selectedPages.clear();
            updateGridSelection();
        });
    }

    if (rangeInput) {
        rangeInput.addEventListener('input', () => {
            parseRangeInput(rangeInput.value);
            updateGridSelection(false);
        });
    }

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (resetBtn) resetBtn.addEventListener('click', resetTool);

    if (extractBtn) extractBtn.addEventListener('click', () => processSplit('extract'));
    if (deleteBtn) deleteBtn.addEventListener('click', () => processSplit('delete'));
    if (splitAllBtn) splitAllBtn.addEventListener('click', splitAllPagesToZip);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!resultBlob) return;
            FF.downloadBlob(resultBlob, resultFilename);
            FF.toast('File downloaded!', 'success');
        });
    }

    async function handleFile(file) {
        if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
            FF.toast('Please select a valid PDF file.', 'error');
            return;
        }

        FF.initPdfJs();
        if (!window.pdfjsLib || !window.PDFLib) {
            FF.toast('PDF library is loading. Please try again shortly.', 'warning');
            return;
        }

        try {
            currentFile = file;
            originalBuffer = await FF.readFileAsArrayBuffer(file);
            pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(originalBuffer.slice(0)) }).promise;
            totalPages = pdfJsDoc.numPages;

            fileName.textContent = file.name;
            fileSize.textContent = `${FF.formatFileSize(file.size)} · ${totalPages} pages`;

            selectedPages.clear();
            // Default select page 1
            selectedPages.add(1);

            FF.hide(upload);
            FF.show(fileCard);
            FF.show(controls);
            FF.hide(result);
            FF.hide(processing);

            await renderThumbnails();
            updateGridSelection();
        } catch (err) {
            FF.toast('Failed to load PDF.', 'error');
        }
    }

    async function renderThumbnails() {
        if (!pageGrid || !pdfJsDoc) return;
        pageGrid.innerHTML = '';

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdfJsDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.35 });

            const item = document.createElement('div');
            item.className = 'pdf-thumb-card';
            item.setAttribute('data-page', pageNum);

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport }).promise;

            item.innerHTML = `
                <div class="pdf-thumb-badge">${pageNum}</div>
                <div class="pdf-thumb-canvas-wrap"></div>
            `;
            item.querySelector('.pdf-thumb-canvas-wrap').appendChild(canvas);

            item.addEventListener('click', () => {
                if (selectedPages.has(pageNum)) {
                    selectedPages.delete(pageNum);
                } else {
                    selectedPages.add(pageNum);
                }
                updateGridSelection();
            });

            pageGrid.appendChild(item);
        }
    }

    function updateGridSelection(updateInput = true) {
        if (selectedCountBadge) {
            selectedCountBadge.textContent = `${selectedPages.size} of ${totalPages} selected`;
        }

        const cards = pageGrid ? pageGrid.querySelectorAll('.pdf-thumb-card') : [];
        cards.forEach(card => {
            const pageNum = parseInt(card.getAttribute('data-page'), 10);
            card.classList.toggle('selected', selectedPages.has(pageNum));
        });

        if (updateInput && rangeInput) {
            rangeInput.value = Array.from(selectedPages).sort((a, b) => a - b).join(', ');
        }

        if (extractBtn) extractBtn.disabled = selectedPages.size === 0;
        if (deleteBtn) deleteBtn.disabled = selectedPages.size === 0 || selectedPages.size === totalPages;
    }

    function parseRangeInput(text) {
        selectedPages.clear();
        if (!text) return;
        const parts = text.split(',');
        parts.forEach(part => {
            const p = part.trim();
            if (p.includes('-')) {
                const [start, end] = p.split('-').map(n => parseInt(n.trim(), 10));
                if (start && end && start <= end) {
                    for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                        selectedPages.add(i);
                    }
                }
            } else {
                const n = parseInt(p, 10);
                if (n && n >= 1 && n <= totalPages) {
                    selectedPages.add(n);
                }
            }
        });
    }

    async function processSplit(mode) {
        if (selectedPages.size === 0) {
            FF.toast('Please select at least one page.', 'warning');
            return;
        }

        FF.hide(controls);
        FF.show(processing);
        if (progressText) progressText.textContent = 'Processing PDF pages...';

        try {
            const srcDoc = await PDFLib.PDFDocument.load(originalBuffer, { ignoreEncryption: true });
            const outDoc = await PDFLib.PDFDocument.create();

            let targetIndices = [];
            if (mode === 'extract') {
                targetIndices = Array.from(selectedPages).sort((a, b) => a - b).map(p => p - 1);
                resultFilename = currentFile.name.replace(/\.[^/.]+$/, '') + '-extracted.pdf';
            } else {
                // Delete mode
                for (let i = 1; i <= totalPages; i++) {
                    if (!selectedPages.has(i)) targetIndices.push(i - 1);
                }
                resultFilename = currentFile.name.replace(/\.[^/.]+$/, '') + '-remaining.pdf';
            }

            const copied = await outDoc.copyPages(srcDoc, targetIndices);
            copied.forEach(page => outDoc.addPage(page));

            const bytes = await outDoc.save();
            resultBlob = new Blob([bytes], { type: 'application/pdf' });

            FF.hide(processing);
            FF.show(result);

            if (resultDetails) {
                resultDetails.textContent = `${targetIndices.length} pages generated · Size: ${FF.formatFileSize(resultBlob.size)}`;
            }

            FF.toast(`PDF ${mode === 'extract' ? 'extracted' : 'updated'} successfully!`, 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Operation failed.', 'error');
        }
    }

    async function splitAllPagesToZip() {
        if (!window.JSZip) {
            FF.toast('ZIP library is required to split all pages.', 'warning');
            return;
        }

        FF.hide(controls);
        FF.show(processing);

        try {
            const srcDoc = await PDFLib.PDFDocument.load(originalBuffer, { ignoreEncryption: true });
            const zipFiles = [];

            for (let i = 0; i < totalPages; i++) {
                if (progressText) progressText.textContent = `Splitting page ${i + 1} of ${totalPages}...`;
                const singleDoc = await PDFLib.PDFDocument.create();
                const [copied] = await singleDoc.copyPages(srcDoc, [i]);
                singleDoc.addPage(copied);
                const bytes = await singleDoc.save();
                zipFiles.push({
                    name: `page_${i + 1}.pdf`,
                    data: bytes
                });
            }

            await FF.downloadZip(zipFiles, currentFile.name.replace(/\.[^/.]+$/, '') + '-pages.zip');
            FF.hide(processing);
            FF.show(controls);
            FF.toast(`All ${totalPages} pages split into individual PDFs!`, 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Failed to split all pages.', 'error');
        }
    }

    function resetTool() {
        currentFile = null;
        originalBuffer = null;
        pdfJsDoc = null;
        totalPages = 0;
        selectedPages.clear();
        resultBlob = null;
        fileInput.value = '';

        if (pageGrid) pageGrid.innerHTML = '';
        if (rangeInput) rangeInput.value = '';

        FF.hide(fileCard);
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);
    }
})();
