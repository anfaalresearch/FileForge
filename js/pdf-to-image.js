/* ==========================================================================
   FileForge — PDF to Images Converter
   Renders each page of a PDF document to crisp PNG or JPEG images.
   Supports individual downloads and one-click ZIP export.
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload = $('#pdfToImgUpload');
    const fileInput = $('#pdfToImgFileInput');
    const fileCard = $('#pdfToImgFileCard');
    const fileName = $('#pdfToImgFileName');
    const fileSize = $('#pdfToImgFileSize');
    const removeBtn = $('#pdfToImgRemove');
    const controls = $('#pdfToImgControls');

    const formatSelect = $('#pdfToImgFormat');
    const scaleSelect = $('#pdfToImgScale');
    const convertBtn = $('#pdfToImgConvertBtn');

    const processing = $('#pdfToImgProcessing');
    const progressFill = $('#pdfToImgProgressFill');
    const progressText = $('#pdfToImgProgressText');

    const result = $('#pdfToImgResult');
    const gallery = $('#pdfToImgGallery');
    const downloadZipBtn = $('#pdfToImgDownloadZip');
    const resetBtn = $('#pdfToImgReset');

    let currentFile = null;
    let pdfJsDoc = null;
    let renderedImages = []; // { name, blob, url }

    FF.setupDropZone(upload, fileInput, handleFile);

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (resetBtn) resetBtn.addEventListener('click', resetTool);
    if (convertBtn) convertBtn.addEventListener('click', convertPdfToImages);

    if (downloadZipBtn) {
        downloadZipBtn.addEventListener('click', async () => {
            if (renderedImages.length === 0) return;
            try {
                const base = currentFile.name.replace(/\.[^/.]+$/, '');
                await FF.downloadZip(renderedImages, `${base}-images.zip`);
                FF.toast('All images downloaded in ZIP archive!', 'success');
            } catch (err) {
                FF.toast(err.message || 'Failed to generate ZIP.', 'error');
            }
        });
    }

    async function handleFile(file) {
        if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
            FF.toast('Please upload a PDF document.', 'error');
            return;
        }

        FF.initPdfJs();
        if (!window.pdfjsLib) {
            FF.toast('PDF engine loading. Please try again in a few moments.', 'warning');
            return;
        }

        try {
            currentFile = file;
            const buffer = await FF.readFileAsArrayBuffer(file);
            pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

            fileName.textContent = file.name;
            fileSize.textContent = `${FF.formatFileSize(file.size)} · ${pdfJsDoc.numPages} pages`;

            FF.hide(upload);
            FF.show(fileCard);
            FF.show(controls);
            FF.hide(result);
            FF.hide(processing);
            renderedImages = [];
        } catch (err) {
            FF.toast('Failed to load PDF file.', 'error');
        }
    }

    async function convertPdfToImages() {
        if (!pdfJsDoc || !currentFile) {
            FF.toast('No PDF loaded.', 'error');
            return;
        }

        const mime = formatSelect ? formatSelect.value : 'image/png';
        const ext = FF.mimeToExt(mime);
        const scale = parseFloat(scaleSelect ? scaleSelect.value : '1.5');
        const total = pdfJsDoc.numPages;

        FF.hide(controls);
        FF.show(processing);
        renderedImages = [];

        try {
            for (let pageNum = 1; pageNum <= total; pageNum++) {
                if (progressText) progressText.textContent = `Rendering page ${pageNum} of ${total}...`;
                if (progressFill) progressFill.style.width = `${Math.round((pageNum / total) * 100)}%`;

                const page = await pdfJsDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({ canvasContext: ctx, viewport }).promise;

                const blob = await new Promise(r => canvas.toBlob(r, mime, 0.92));
                const name = `page_${pageNum}.${ext}`;
                const url = URL.createObjectURL(blob);
                renderedImages.push({ name, blob, url });
            }

            FF.hide(processing);
            FF.show(result);
            renderGallery();
            FF.toast(`Successfully converted ${total} pages!`, 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Failed to convert PDF pages.', 'error');
        }
    }

    function renderGallery() {
        if (!gallery) return;
        gallery.innerHTML = '';

        renderedImages.forEach((imgItem, idx) => {
            const card = document.createElement('div');
            card.className = 'pdf-img-result-card';
            card.innerHTML = `
                <div class="pdf-img-preview-wrap">
                    <img src="${imgItem.url}" alt="Page ${idx + 1}" loading="lazy">
                </div>
                <div class="pdf-img-card-footer">
                    <span>Page ${idx + 1} (${FF.formatFileSize(imgItem.blob.size)})</span>
                    <button type="button" class="btn btn-sm btn-outline download-single-btn" data-idx="${idx}">Download</button>
                </div>
            `;
            gallery.appendChild(card);
        });

        gallery.querySelectorAll('.download-single-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                const item = renderedImages[idx];
                if (item) {
                    FF.downloadBlob(item.blob, item.name);
                    FF.toast(`Downloaded ${item.name}`, 'success');
                }
            });
        });
    }

    function resetTool() {
        renderedImages.forEach(item => {
            if (item.url) URL.revokeObjectURL(item.url);
        });
        currentFile = null;
        pdfJsDoc = null;
        renderedImages = [];
        fileInput.value = '';

        if (gallery) gallery.innerHTML = '';
        FF.hide(fileCard);
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);
    }
})();
