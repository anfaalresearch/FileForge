/* ==========================================================================
   FileForge — PDF Editor & Annotator
   Add watermarks, page numbers, text annotations, and signatures to any PDF.
   100% client-side via pdf-lib and pdf.js.
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const upload = $('#pdfEditUpload');
    const fileInput = $('#pdfEditFileInput');
    const fileCard = $('#pdfEditFileCard');
    const fileName = $('#pdfEditFileName');
    const fileSize = $('#pdfEditFileSize');
    const removeBtn = $('#pdfEditRemove');
    const controls = $('#pdfEditControls');

    // Page navigation
    const canvas = $('#pdfEditCanvas');
    const prevPageBtn = $('#pdfEditPrevPage');
    const nextPageBtn = $('#pdfEditNextPage');
    const pageNumDisplay = $('#pdfEditPageNum');

    // Tool tabs
    const tabWatermark = $('#pdfEditTabWatermark');
    const tabNumbers = $('#pdfEditTabNumbers');
    const tabText = $('#pdfEditTabText');
    const tabSignature = $('#pdfEditTabSignature');

    const panelWatermark = $('#pdfEditPanelWatermark');
    const panelNumbers = $('#pdfEditPanelNumbers');
    const panelText = $('#pdfEditPanelText');
    const panelSignature = $('#pdfEditPanelSignature');

    // Watermark inputs
    const wmText = $('#pdfEditWmText');
    const wmOpacity = $('#pdfEditWmOpacity');
    const wmOpacityVal = $('#pdfEditWmOpacityVal');
    const wmRotation = $('#pdfEditWmRotation');
    const applyWmBtn = $('#pdfEditApplyWm');

    // Page number inputs
    const pnFormat = $('#pdfEditPnFormat');
    const pnPosition = $('#pdfEditPnPosition');
    const applyPnBtn = $('#pdfEditApplyPn');

    // Text annotation inputs
    const annotText = $('#pdfEditAnnotText');
    const annotSize = $('#pdfEditAnnotSize');
    const annotColor = $('#pdfEditAnnotColor');

    // Signature inputs
    const sigCanvas = $('#pdfEditSigCanvas');
    const sigClearBtn = $('#pdfEditSigClear');
    const sigPlaceBtn = $('#pdfEditSigPlace');

    // Export
    const exportBtn = $('#pdfEditExport');
    const processing = $('#pdfEditProcessing');
    const result = $('#pdfEditResult');
    const downloadBtn = $('#pdfEditDownload');
    const resetBtn = $('#pdfEditReset');

    let currentFile = null;
    let originalBuffer = null;
    let pdfJsDoc = null;
    let pdfLibDoc = null;
    let currentPage = 1;
    let totalPages = 1;
    let renderedPageViewport = null;
    let editedPdfBlob = null;

    // Placed annotations queue
    let textAnnotations = []; // { page, text, x, y, size, color }
    let signatureStamps = []; // { page, pngBytes, x, y, width, height }
    let watermarkConfig = null; // { text, opacity, rotation }
    let pageNumberConfig = null; // { format, position }

    FF.setupDropZone(upload, fileInput, handleFile);
    if (window.FF && FF.registerToolHandler) FF.registerToolHandler('pdfedit', handleFile);

    // Tab switching
    const tabs = [
        { tab: tabWatermark, panel: panelWatermark },
        { tab: tabNumbers, panel: panelNumbers },
        { tab: tabText, panel: panelText },
        { tab: tabSignature, panel: panelSignature },
    ];

    tabs.forEach(({ tab, panel }) => {
        if (!tab) return;
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                if (t.tab) t.tab.classList.remove('active');
                if (t.panel) FF.hide(t.panel);
            });
            tab.classList.add('active');
            if (panel) FF.show(panel);
        });
    });

    if (wmOpacity && wmOpacityVal) {
        wmOpacity.addEventListener('input', () => {
            wmOpacityVal.textContent = wmOpacity.value + '%';
        });
    }

    if (applyWmBtn) {
        applyWmBtn.addEventListener('click', () => {
            const text = (wmText && wmText.value.trim()) || 'CONFIDENTIAL';
            const opacity = parseInt(wmOpacity.value, 10) / 100;
            const rot = parseInt(wmRotation.value, 10) || 45;
            watermarkConfig = { text, opacity, rotation: rot };
            FF.toast(`Watermark "${text}" queued for all pages.`, 'success');
        });
    }

    if (applyPnBtn) {
        applyPnBtn.addEventListener('click', () => {
            const format = pnFormat ? pnFormat.value : 'page_x_of_y';
            const pos = pnPosition ? pnPosition.value : 'bottom_center';
            pageNumberConfig = { format, position: pos };
            FF.toast('Page numbers queued for document.', 'success');
        });
    }

    // Page navigation
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderActivePage();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderActivePage();
            }
        });
    }

    // Click canvas to place text annotation
    if (canvas) {
        canvas.addEventListener('click', (e) => {
            const text = annotText ? annotText.value.trim() : '';
            if (!text) {
                FF.toast('Please type some annotation text first.', 'info');
                return;
            }

            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            // Normalize coordinate to 0-1
            const normX = clickX / rect.width;
            const normY = clickY / rect.height;

            textAnnotations.push({
                page: currentPage,
                text,
                normX,
                normY,
                size: parseInt(annotSize.value, 10) || 16,
                color: annotColor.value || '#000000',
            });

            FF.toast(`Added "${text}" to page ${currentPage}.`, 'success');
            renderActivePage();
        });
    }

    // Signature Canvas Drawing
    let sigDrawing = false;
    let sigCtx = null;
    if (sigCanvas) {
        sigCtx = sigCanvas.getContext('2d');
        sigCtx.strokeStyle = '#000000';
        sigCtx.lineWidth = 2.5;
        sigCtx.lineCap = 'round';
        sigCtx.lineJoin = 'round';

        function startSigDraw(x, y) {
            sigDrawing = true;
            sigCtx.beginPath();
            sigCtx.moveTo(x, y);
        }

        function moveSigDraw(x, y) {
            if (!sigDrawing) return;
            sigCtx.lineTo(x, y);
            sigCtx.stroke();
        }

        function stopSigDraw() {
            sigDrawing = false;
        }

        sigCanvas.addEventListener('mousedown', (e) => {
            const r = sigCanvas.getBoundingClientRect();
            startSigDraw(e.clientX - r.left, e.clientY - r.top);
        });

        sigCanvas.addEventListener('mousemove', (e) => {
            const r = sigCanvas.getBoundingClientRect();
            moveSigDraw(e.clientX - r.left, e.clientY - r.top);
        });

        window.addEventListener('mouseup', stopSigDraw);

        // Touch support
        sigCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            const r = sigCanvas.getBoundingClientRect();
            startSigDraw(t.clientX - r.left, t.clientY - r.top);
        }, { passive: false });

        sigCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            const r = sigCanvas.getBoundingClientRect();
            moveSigDraw(t.clientX - r.left, t.clientY - r.top);
        }, { passive: false });

        sigCanvas.addEventListener('touchend', stopSigDraw);
    }

    if (sigClearBtn && sigCtx && sigCanvas) {
        sigClearBtn.addEventListener('click', () => {
            sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
        });
    }

    if (sigPlaceBtn && sigCanvas) {
        sigPlaceBtn.addEventListener('click', () => {
            sigCanvas.toBlob(async (blob) => {
                if (!blob) return;
                const buffer = await FF.readFileAsArrayBuffer(blob);
                signatureStamps.push({
                    page: currentPage,
                    pngBytes: buffer,
                    normX: 0.65, // default bottom right placement
                    normY: 0.80,
                    width: 150,
                    height: 60,
                });
                FF.toast(`Signature stamped onto page ${currentPage}!`, 'success');
                renderActivePage();
            }, 'image/png');
        });
    }

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (resetBtn) resetBtn.addEventListener('click', resetTool);
    if (exportBtn) exportBtn.addEventListener('click', exportEditedPdf);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!editedPdfBlob || !currentFile) return;
            const base = currentFile.name.replace(/\.[^/.]+$/, '');
            FF.downloadBlob(editedPdfBlob, `${base}-annotated.pdf`);
            FF.toast('Saved PDF downloaded!', 'success');
        });
    }

    async function handleFile(file) {
        if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
            FF.toast('Please select a valid PDF file.', 'error');
            return;
        }

        FF.initPdfJs();
        if (!window.pdfjsLib || !window.PDFLib) {
            FF.toast('PDF library loading. Please try again in a moment.', 'warning');
            return;
        }

        try {
            currentFile = file;
            originalBuffer = await FF.readFileAsArrayBuffer(file);
            pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(originalBuffer.slice(0)) }).promise;
            totalPages = pdfJsDoc.numPages;
            currentPage = 1;

            fileName.textContent = file.name;
            fileSize.textContent = `${FF.formatFileSize(file.size)} · ${totalPages} pages`;

            // Reset edits
            textAnnotations = [];
            signatureStamps = [];
            watermarkConfig = null;
            pageNumberConfig = null;

            FF.hide(upload);
            FF.show(fileCard);
            FF.show(controls);
            FF.hide(result);
            FF.hide(processing);

            await renderActivePage();
        } catch (err) {
            FF.toast('Failed to parse PDF document.', 'error');
        }
    }

    async function renderActivePage() {
        if (!pdfJsDoc || !canvas) return;

        if (pageNumDisplay) pageNumDisplay.textContent = `Page ${currentPage} of ${totalPages}`;
        if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;

        const page = await pdfJsDoc.getPage(currentPage);
        const scale = 1.4;
        const viewport = page.getViewport({ scale });
        renderedPageViewport = viewport;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        // Draw PDF page
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Render any local preview annotations on this page
        textAnnotations.filter(a => a.page === currentPage).forEach(a => {
            ctx.font = `${a.size * scale}px sans-serif`;
            ctx.fillStyle = a.color;
            ctx.fillText(a.text, a.normX * viewport.width, a.normY * viewport.height);
        });
    }

    async function exportEditedPdf() {
        if (!originalBuffer) {
            FF.toast('No document loaded.', 'error');
            return;
        }

        FF.hide(controls);
        FF.show(processing);

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(originalBuffer, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();
            const helvetica = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            const helveticaBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

            // 1. Apply watermark across pages
            if (watermarkConfig) {
                const { text, opacity, rotation } = watermarkConfig;
                pages.forEach(page => {
                    const { width, height } = page.getSize();
                    const fontSize = Math.min(width, height) / 8;
                    const textWidth = helveticaBold.widthOfTextAtSize(text, fontSize);
                    page.drawText(text, {
                        x: (width - textWidth) / 2,
                        y: height / 2,
                        size: fontSize,
                        font: helveticaBold,
                        color: PDFLib.rgb(0.6, 0.6, 0.6),
                        opacity: opacity || 0.3,
                        rotate: PDFLib.degrees(rotation || 45),
                    });
                });
            }

            // 2. Apply page numbers
            if (pageNumberConfig) {
                const { format, position } = pageNumberConfig;
                pages.forEach((page, idx) => {
                    const { width, height } = page.getSize();
                    const curP = idx + 1;
                    const totP = pages.length;
                    let label = `${curP}`;
                    if (format === 'page_x_of_y') label = `Page ${curP} of ${totP}`;
                    else if (format === 'x_of_y') label = `${curP} / ${totP}`;

                    const fontSize = 10;
                    const labelWidth = helvetica.widthOfTextAtSize(label, fontSize);

                    let x = (width - labelWidth) / 2;
                    let y = 25; // bottom default

                    if (position === 'bottom_right') x = width - labelWidth - 30;
                    else if (position === 'bottom_left') x = 30;
                    else if (position === 'top_right') { x = width - labelWidth - 30; y = height - 25; }

                    page.drawText(label, {
                        x,
                        y,
                        size: fontSize,
                        font: helvetica,
                        color: PDFLib.rgb(0.3, 0.3, 0.3),
                    });
                });
            }

            // 3. Apply custom text annotations
            for (const annot of textAnnotations) {
                const targetPage = pages[annot.page - 1];
                if (targetPage) {
                    const { width, height } = targetPage.getSize();
                    const x = annot.normX * width;
                    // PDF-lib coordinate system starts from bottom-left
                    const y = height - (annot.normY * height);

                    const hex = annot.color.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
                    const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
                    const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

                    targetPage.drawText(annot.text, {
                        x,
                        y,
                        size: annot.size || 14,
                        font: helvetica,
                        color: PDFLib.rgb(r, g, b),
                    });
                }
            }

            // 4. Apply signature stamps
            for (const sig of signatureStamps) {
                const targetPage = pages[sig.page - 1];
                if (targetPage) {
                    const { width, height } = targetPage.getSize();
                    const img = await pdfDoc.embedPng(sig.pngBytes);
                    const x = sig.normX * width;
                    const y = height - (sig.normY * height) - sig.height;
                    targetPage.drawImage(img, {
                        x,
                        y,
                        width: sig.width,
                        height: sig.height,
                    });
                }
            }

            const modifiedBytes = await pdfDoc.save();
            editedPdfBlob = new Blob([modifiedBytes], { type: 'application/pdf' });

            FF.hide(processing);
            FF.show(result);
            FF.toast('PDF modifications applied successfully!', 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Failed to export edited PDF.', 'error');
        }
    }

    function resetTool() {
        currentFile = null;
        originalBuffer = null;
        pdfJsDoc = null;
        pdfLibDoc = null;
        editedPdfBlob = null;
        textAnnotations = [];
        signatureStamps = [];
        watermarkConfig = null;
        pageNumberConfig = null;
        fileInput.value = '';

        if (sigCtx && sigCanvas) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);

        FF.hide(fileCard);
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);
    }
})();
