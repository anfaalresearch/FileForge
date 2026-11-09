/* ==========================================================================
   FileForge — Image to PDF Converter
   Combines multiple images into a single PDF document with custom page setup.
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload = $('#pdfUpload');
    const fileInput = $('#pdfFileInput');
    const fileList = $('#pdfFileList');
    const listItems = $('#pdfListItems');
    const countSpan = $('#pdfCount');
    const addMoreBtn = $('#pdfAddMore');
    const addInput = $('#pdfAddInput');
    const pageSizeSelect = $('#pdfPageSize');
    const marginSelect = $('#pdfMargin');
    const generateBtn = $('#pdfGenerate');
    const processing = $('#pdfProcessing');
    const result = $('#pdfResult');
    const pdfPages = $('#pdfPages');
    const pdfSize = $('#pdfSize');
    const downloadBtn = $('#pdfDownload');
    const resetBtn = $('#pdfReset');

    let files = [];
    let pdfBlob = null;

    FF.setupDropZone(upload, fileInput, handleFiles);

    if (addMoreBtn && addInput) {
        addMoreBtn.addEventListener('click', () => addInput.click());
        addInput.addEventListener('change', (e) => {
            const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
            files = files.concat(newFiles);
            renderFileList();
            addInput.value = '';
        });
    }

    if (generateBtn) generateBtn.addEventListener('click', generatePDF);
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!pdfBlob) return;
            FF.downloadBlob(pdfBlob, 'images_document.pdf');
            FF.toast('PDF downloaded!', 'success');
        });
    }
    if (resetBtn) resetBtn.addEventListener('click', resetTool);

    function handleFiles(fileArr) {
        const imgs = (Array.isArray(fileArr) ? fileArr : [fileArr]).filter(f => f.type.startsWith('image/'));
        if (imgs.length === 0) {
            FF.toast('Please upload image files (PNG, JPG, WEBP, etc.).', 'error');
            return;
        }
        files = files.concat(imgs);
        FF.hide(upload);
        FF.show(fileList);
        renderFileList();
    }

    function renderFileList() {
        if (!listItems) return;
        listItems.innerHTML = '';
        if (countSpan) countSpan.textContent = files.length;

        files.forEach((f, i) => {
            const item = document.createElement('div');
            item.className = 'file-list-item';
            const safeName = f.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            item.innerHTML = `
                <div class="file-list-meta">
                    <span class="file-list-index">${i + 1}</span>
                    <span class="file-list-name">${safeName}</span>
                    <span class="file-list-size">${FF.formatFileSize(f.size)}</span>
                </div>
                <div class="file-list-actions">
                    <button type="button" class="btn btn-icon btn-sm" data-action="up" data-idx="${i}" ${i === 0 ? 'disabled' : ''} title="Move Up">↑</button>
                    <button type="button" class="btn btn-icon btn-sm" data-action="down" data-idx="${i}" ${i === files.length - 1 ? 'disabled' : ''} title="Move Down">↓</button>
                    <button type="button" class="btn btn-icon btn-sm text-error" data-action="del" data-idx="${i}" title="Remove">✕</button>
                </div>
            `;
            listItems.appendChild(item);
        });

        listItems.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const act = btn.getAttribute('data-action');
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                if (act === 'up' && idx > 0) {
                    const temp = files[idx - 1];
                    files[idx - 1] = files[idx];
                    files[idx] = temp;
                    renderFileList();
                } else if (act === 'down' && idx < files.length - 1) {
                    const temp = files[idx + 1];
                    files[idx + 1] = files[idx];
                    files[idx] = temp;
                    renderFileList();
                } else if (act === 'del') {
                    files.splice(idx, 1);
                    if (files.length === 0) {
                        FF.hide(fileList);
                        FF.show(upload);
                    } else {
                        renderFileList();
                    }
                }
            });
        });
    }

    async function generatePDF() {
        if (files.length === 0) {
            FF.toast('Please add at least one image.', 'error');
            return;
        }

        if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
            FF.toast('PDF library is loading — please try again in a moment.', 'warning');
            return;
        }

        const orientationRadio = document.querySelector('input[name="pdfOrientation"]:checked');
        const orientation = orientationRadio ? orientationRadio.value : 'portrait';
        const pageSize = pageSizeSelect ? pageSizeSelect.value : 'a4';
        const marginVal = parseInt(marginSelect ? marginSelect.value : '10', 10);

        FF.hide(fileList);
        FF.show(processing);

        try {
            const { jsPDF } = window.jspdf || window;
            const pdf = new jsPDF({
                orientation: orientation === 'auto' ? 'portrait' : orientation,
                unit: 'pt',
                format: pageSize === 'fit' ? 'a4' : pageSize
            });

            let firstPage = true;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const img = await FF.loadImage(file);
                const imgW = img.naturalWidth;
                const imgH = img.naturalHeight;

                let pageW, pageH;

                if (pageSize === 'fit') {
                    pageW = imgW + (marginVal * 2);
                    pageH = imgH + (marginVal * 2);
                } else if (pageSize === 'letter') {
                    pageW = 612; // US Letter pt
                    pageH = 792;
                } else {
                    pageW = 595.28; // A4 pt
                    pageH = 841.89;
                }

                if (orientation === 'landscape' && pageSize !== 'fit') {
                    const tmp = pageW;
                    pageW = pageH;
                    pageH = tmp;
                } else if (orientation === 'auto' && pageSize !== 'fit') {
                    if (imgW > imgH && pageW < pageH) {
                        const tmp = pageW;
                        pageW = pageH;
                        pageH = tmp;
                    }
                }

                if (!firstPage) {
                    pdf.addPage([pageW, pageH], pageW > pageH ? 'landscape' : 'portrait');
                } else {
                    pdf.internal.pageSize.width = pageW;
                    pdf.internal.pageSize.height = pageH;
                }

                const availW = pageW - (marginVal * 2);
                const availH = pageH - (marginVal * 2);

                const scale = Math.min(availW / imgW, availH / imgH);
                const drawW = imgW * scale;
                const drawH = imgH * scale;
                const dx = marginVal + (availW - drawW) / 2;
                const dy = marginVal + (availH - drawH) / 2;

                const canvas = document.createElement('canvas');
                canvas.width = imgW;
                canvas.height = imgH;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.90);

                pdf.addImage(dataUrl, 'JPEG', dx, dy, drawW, drawH);
                firstPage = false;
            }

            pdfBlob = pdf.output('blob');

            FF.hide(processing);
            FF.show(result);

            if (pdfPages) pdfPages.textContent = files.length;
            if (pdfSize) pdfSize.textContent = FF.formatFileSize(pdfBlob.size);

            FF.toast('PDF created successfully!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(fileList);
            FF.toast(err.message || 'PDF compilation failed.', 'error');
        }
    }

    function resetTool() {
        files = [];
        pdfBlob = null;
        fileInput.value = '';
        if (listItems) listItems.innerHTML = '';
        if (countSpan) countSpan.textContent = '0';

        FF.hide(fileList);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);
    }
})();
