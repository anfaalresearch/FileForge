/* ==========================================================================
   FileForge — PDF Merger
   Combines multiple PDF documents into a single file with custom page order.
   100% client-side via pdf-lib.
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload = $('#pdfMergeUpload');
    const fileInput = $('#pdfMergeFileInput');
    const controls = $('#pdfMergeControls');
    const fileListEl = $('#pdfMergeFileList');
    const addMoreBtn = $('#pdfMergeAddMore');
    const mergeBtn = $('#pdfMergeBtn');
    const clearBtn = $('#pdfMergeClear');
    const processing = $('#pdfMergeProcessing');
    const progressText = $('#pdfMergeProgressText');
    const result = $('#pdfMergeResult');
    const resultInfo = $('#pdfMergeResultInfo');
    const downloadBtn = $('#pdfMergeDownload');
    const resetBtn = $('#pdfMergeReset');

    let pdfFiles = []; // array of { file, doc, pageCount }
    let mergedPdfBlob = null;

    FF.setupDropZone(upload, fileInput, handleFiles);
    if (window.FF && FF.registerToolHandler) FF.registerToolHandler('pdfmerge', handleFiles);

    if (addMoreBtn) {
        addMoreBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/pdf';
            input.multiple = true;
            input.onchange = (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    handleFiles(Array.from(e.target.files));
                }
            };
            input.click();
        });
    }

    if (clearBtn) clearBtn.addEventListener('click', resetTool);
    if (resetBtn) resetBtn.addEventListener('click', resetTool);
    if (mergeBtn) mergeBtn.addEventListener('click', mergePdfs);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!mergedPdfBlob) return;
            FF.downloadBlob(mergedPdfBlob, 'merged_document.pdf');
            FF.toast('Merged PDF downloaded!', 'success');
        });
    }

    async function handleFiles(files) {
        const fileArr = Array.isArray(files) ? files : [files];
        const valid = fileArr.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

        if (valid.length === 0) {
            FF.toast('Please select valid PDF documents.', 'error');
            return;
        }

        if (!window.PDFLib) {
            FF.toast('PDF library is loading. Please try again in a moment.', 'warning');
            return;
        }

        FF.hide(upload);
        FF.show(controls);
        FF.hide(result);

        for (const file of valid) {
            try {
                const buffer = await FF.readFileAsArrayBuffer(file);
                const doc = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
                const pageCount = doc.getPageCount();
                pdfFiles.push({ file, buffer, pageCount });
            } catch (err) {
                FF.toast(`Failed to read "${file.name}": encrypted or corrupted.`, 'warning');
            }
        }

        renderFileList();
    }

    function renderFileList() {
        if (!fileListEl) return;
        if (pdfFiles.length === 0) {
            resetTool();
            return;
        }

        fileListEl.innerHTML = '';
        pdfFiles.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'pdf-file-row';
            row.innerHTML = `
                <div class="pdf-row-info">
                    <span class="pdf-row-index">${index + 1}</span>
                    <div class="pdf-row-meta">
                        <span class="pdf-row-name">${escapeHtml(item.file.name)}</span>
                        <span class="pdf-row-sub">${FF.formatFileSize(item.file.size)} · ${item.pageCount} page${item.pageCount > 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div class="pdf-row-actions">
                    <button type="button" class="btn btn-icon btn-sm" data-action="up" data-index="${index}" ${index === 0 ? 'disabled' : ''} title="Move Up">↑</button>
                    <button type="button" class="btn btn-icon btn-sm" data-action="down" data-index="${index}" ${index === pdfFiles.length - 1 ? 'disabled' : ''} title="Move Down">↓</button>
                    <button type="button" class="btn btn-icon btn-sm text-error" data-action="delete" data-index="${index}" title="Remove">✕</button>
                </div>
            `;
            fileListEl.appendChild(row);
        });

        // Wire row action buttons
        fileListEl.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const act = btn.getAttribute('data-action');
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                if (act === 'up' && idx > 0) {
                    const temp = pdfFiles[idx - 1];
                    pdfFiles[idx - 1] = pdfFiles[idx];
                    pdfFiles[idx] = temp;
                    renderFileList();
                } else if (act === 'down' && idx < pdfFiles.length - 1) {
                    const temp = pdfFiles[idx + 1];
                    pdfFiles[idx + 1] = pdfFiles[idx];
                    pdfFiles[idx] = temp;
                    renderFileList();
                } else if (act === 'delete') {
                    pdfFiles.splice(idx, 1);
                    renderFileList();
                }
            });
        });

        // Update merge button state
        if (mergeBtn) {
            const totalPages = pdfFiles.reduce((acc, p) => acc + p.pageCount, 0);
            mergeBtn.textContent = `Merge ${pdfFiles.length} PDFs (${totalPages} Pages)`;
            mergeBtn.disabled = pdfFiles.length < 2;
        }
    }

    async function mergePdfs() {
        if (pdfFiles.length < 2) {
            FF.toast('Please add at least 2 PDF files to merge.', 'warning');
            return;
        }

        FF.hide(controls);
        FF.show(processing);
        if (progressText) progressText.textContent = 'Merging PDF pages...';

        try {
            const mergedDoc = await PDFLib.PDFDocument.create();

            for (let i = 0; i < pdfFiles.length; i++) {
                const item = pdfFiles[i];
                if (progressText) {
                    progressText.textContent = `Merging file ${i + 1} of ${pdfFiles.length}: ${item.file.name}...`;
                }
                const srcDoc = await PDFLib.PDFDocument.load(item.buffer, { ignoreEncryption: true });
                const pageIndices = srcDoc.getPageIndices();
                const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
                copiedPages.forEach(page => mergedDoc.addPage(page));
            }

            const mergedBytes = await mergedDoc.save();
            mergedPdfBlob = new Blob([mergedBytes], { type: 'application/pdf' });

            FF.hide(processing);
            FF.show(result);

            const totalPages = mergedDoc.getPageCount();
            if (resultInfo) {
                resultInfo.innerHTML = `
                    <div class="result-badge-group">
                        <span class="badge badge-success">${totalPages} Total Pages</span>
                        <span class="badge badge-neutral">${FF.formatFileSize(mergedPdfBlob.size)}</span>
                        <span class="badge badge-info">${pdfFiles.length} Documents Merged</span>
                    </div>
                `;
            }

            FF.toast('PDFs merged successfully!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Failed to merge PDFs.', 'error');
        }
    }

    function resetTool() {
        pdfFiles = [];
        mergedPdfBlob = null;
        fileInput.value = '';

        if (fileListEl) fileListEl.innerHTML = '';
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
