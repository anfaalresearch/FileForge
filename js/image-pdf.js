/* ==========================================
   FileForge — Image to PDF
   ========================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload     = $('#pdfUpload');
    const fileInput  = $('#pdfFileInput');
    const fileList   = $('#pdfFileList');
    const listItems  = $('#pdfListItems');
    const countSpan  = $('#pdfCount');
    const addMoreBtn = $('#pdfAddMore');
    const addInput   = $('#pdfAddInput');
    const generateBtn = $('#pdfGenerate');
    const processing = $('#pdfProcessing');
    const result     = $('#pdfResult');
    const pdfPages   = $('#pdfPages');
    const pdfSize    = $('#pdfSize');
    const downloadBtn = $('#pdfDownload');
    const resetBtn   = $('#pdfReset');

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
            FF.downloadBlob(pdfBlob, 'fileforge-output.pdf');
            FF.toast('PDF downloaded!', 'success');
        });
    }
    if (resetBtn) resetBtn.addEventListener('click', resetTool);

    function handleFiles(fileArr) {
        const imgs = (Array.isArray(fileArr) ? fileArr : [fileArr])
            .filter(f => f.type.startsWith('image/'));
        if (imgs.length === 0) {
            FF.toast('Please upload image files (PNG, JPG, WEBP).', 'error');
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
        countSpan.textContent = files.length;
        files.forEach((f, i) => {
            const item = document.createElement('div');
            item.className = 'file-list-item';
            const safeName = f.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            item.innerHTML =
                `<span class="file-list-name">${safeName}</span>` +
                `<span class="file-list-size">${FF.formatFileSize(f.size)}</span>` +
                `<button class="file-list-remove" data-index="${i}" aria-label="Remove file">` +
                  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>` +
                `</button>`;
            item.querySelector('.file-list-remove').addEventListener('click', () => {
                files.splice(i, 1);
                if (files.length === 0) {
                    FF.hide(fileList);
                    FF.show(upload);
                } else {
                    renderFileList();
                }
            });
            listItems.appendChild(item);
        });
    }

    async function generatePDF() {
        if (files.length === 0) {
            FF.toast('Please add at least one image.', 'error');
            return;
        }

        if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
            FF.toast('PDF library is still loading — please try again in a moment.', 'warning');
            return;
        }

        const orientationValue = document.querySelector('input[name="pdfOrientation"]:checked');
        const orientation = orientationValue ? orientationValue.value : 'portrait';
        const isLandscape = orientation === 'landscape';

        FF.hide(fileList);
        FF.show(processing);

        try {
            const { jsPDF } = window.jspdf || window;
            const pdf = new jsPDF({ orientation, unit: 'px', hotfixes: ['px_scaling'] });
            let firstPage = true;

            for (const file of files) {
                const img = await FF.loadImage(file);
                const imgW = img.naturalWidth;
                const imgH = img.naturalHeight;

                // A4 in px at 96dpi: 794 × 1123 (portrait)
                const pageW = isLandscape ? 1123 : 794;
                const pageH = isLandscape ? 794  : 1123;
                const scale = Math.min(pageW / imgW, pageH / imgH);
                const drawW = imgW * scale;
                const drawH = imgH * scale;
                const offsetX = (pageW - drawW) / 2;
                const offsetY = (pageH - drawH) / 2;

                if (!firstPage) {
                    pdf.addPage([pageW, pageH], orientation);
                } else {
                    pdf.internal.pageSize.width  = pageW;
                    pdf.internal.pageSize.height = pageH;
                }

                const dataUrl = await fileToDataURL(file);
                const ext = FF.getFileExtension(file.name).toUpperCase();
                const pdfImgFmt = ext === 'JPG' ? 'JPEG' : (ext === 'WEBP' ? 'WEBP' : ext);

                pdf.addImage(dataUrl, pdfImgFmt || 'PNG', offsetX, offsetY, drawW, drawH);
                firstPage = false;
            }

            const pdfOutput = pdf.output('blob');
            pdfBlob = pdfOutput;

            FF.hide(processing);
            FF.show(result);

            pdfPages.textContent = files.length;
            pdfSize.textContent  = FF.formatFileSize(pdfBlob.size);

            FF.toast('PDF generated!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(fileList);
            FF.toast(err.message || 'PDF generation failed.', 'error');
            console.error(err);
        }
    }

    function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Could not read file'));
            reader.readAsDataURL(file);
        });
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
