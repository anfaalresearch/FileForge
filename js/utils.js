/* ==========================================================================
   FileForge — Utility Functions & Shared Helpers
   High-performance, 100% client-side Web API helpers
   ========================================================================== */

const FF = window.FF || {};

// ---- File Size Formatting ----
FF.formatFileSize = function (bytes) {
    if (bytes === 0 || !bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : (i === 1 ? 1 : 2));
    return size + ' ' + units[i];
};

// ---- File Extension Extraction ----
FF.getFileExtension = function (filename) {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

// ---- Change File Extension ----
FF.changeExt = function (filename, newExt) {
    const base = filename.replace(/\.[^/.]+$/, '');
    return base + '.' + newExt.replace(/^\./, '');
};

// ---- MIME Type to Extension ----
FF.mimeToExt = function (mime) {
    const map = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/bmp': 'bmp',
        'image/x-icon': 'ico',
        'image/vnd.microsoft.icon': 'ico',
        'image/svg+xml': 'svg',
        'application/pdf': 'pdf',
    };
    return map[mime] || 'png';
};

// ---- Extension to MIME Type ----
FF.extToMime = function (ext) {
    const clean = (ext || '').toLowerCase().replace(/^\./, '');
    const map = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'ico': 'image/x-icon',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
    };
    return map[clean] || 'application/octet-stream';
};

// ---- MIME to Friendly Display Name ----
FF.mimeToFriendly = function (mime) {
    const map = {
        'image/png': 'PNG',
        'image/jpeg': 'JPEG',
        'image/jpg': 'JPEG',
        'image/webp': 'WEBP',
        'image/gif': 'GIF',
        'image/bmp': 'BMP',
        'image/x-icon': 'ICO',
        'image/svg+xml': 'SVG',
        'application/pdf': 'PDF',
    };
    return map[mime] || mime || 'Unknown';
};

// ---- Toast Notifications ----
FF.toast = function (message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span><span class="toast-msg">' + message + '</span>';
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 250);
    }, 3800);
};

// ---- Drag & Drop Zone Wiring ----
FF.setupDropZone = function (dropZone, fileInput, onFile) {
    if (!dropZone || !fileInput) return;

    dropZone.setAttribute('tabindex', '0');
    dropZone.setAttribute('role', 'button');

    dropZone.addEventListener('click', (e) => {
        if (e.target === fileInput || e.target.closest('button') || e.target.closest('input')) return;
        fileInput.click();
    });

    dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            if (fileInput.hasAttribute('multiple')) {
                onFile(Array.from(files));
            } else {
                onFile(files[0]);
            }
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            if (fileInput.hasAttribute('multiple')) {
                onFile(Array.from(files));
            } else {
                onFile(files[0]);
            }
        }
    });
};

// ---- Load Image from File or Blob ----
FF.loadImage = function (fileOrBlob) {
    return new Promise((resolve, reject) => {
        if (!fileOrBlob) {
            reject(new Error('No image file provided'));
            return;
        }
        const img = new Image();
        const url = URL.createObjectURL(fileOrBlob);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not load image. The format may not be supported by this browser.'));
        };
        img.src = url;
    });
};

// ---- Direct Blob Download ----
FF.downloadBlob = function (blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
};

// ---- Download Multiple Files as ZIP ----
FF.downloadZip = async function (files, zipFilename = 'fileforge_archive.zip') {
    if (!window.JSZip) {
        throw new Error('ZIP library not loaded. Please ensure you are connected to the internet.');
    }
    const zip = new window.JSZip();
    for (const item of files) {
        zip.file(item.name, item.blob || item.data);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    FF.downloadBlob(content, zipFilename);
};

// ---- Generate Standard ICO (16x16, 32x32, 48x48) from Canvas ----
FF.createIcoBlob = function (sourceCanvas) {
    // Basic ICO file format packaging 32x32 PNG icon frame
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 32;
    iconCanvas.height = 32;
    const ctx = iconCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, 32, 32);

    return new Promise((resolve) => {
        iconCanvas.toBlob((pngBlob) => {
            if (!pngBlob) {
                // Fallback to source blob
                sourceCanvas.toBlob(resolve, 'image/png');
                return;
            }
            const reader = new FileReader();
            reader.onload = function () {
                const pngBytes = new Uint8Array(reader.result);
                const pngSize = pngBytes.length;
                const icoHeaderSize = 6;
                const icoDirEntrySize = 16;
                const totalSize = icoHeaderSize + icoDirEntrySize + pngSize;

                const ico = new Uint8Array(totalSize);
                const view = new DataView(ico.buffer);

                // ICONDIR: idReserved (0), idType (1 for ICO), idCount (1 image)
                view.setUint16(0, 0, true);
                view.setUint16(2, 1, true);
                view.setUint16(4, 1, true);

                // ICONDIRENTRY
                ico[6] = 32; // width
                ico[7] = 32; // height
                ico[8] = 0;  // colors
                ico[9] = 0;  // reserved
                view.setUint16(10, 1, true); // color planes
                view.setUint16(12, 32, true); // bits per pixel
                view.setUint32(14, pngSize, true); // bytes in resource
                view.setUint32(18, icoHeaderSize + icoDirEntrySize, true); // image offset

                ico.set(pngBytes, icoHeaderSize + icoDirEntrySize);
                resolve(new Blob([ico], { type: 'image/x-icon' }));
            };
            reader.readAsArrayBuffer(pngBlob);
        }, 'image/png');
    });
};

// ---- Render PDF page to canvas via pdfjsLib ----
FF.renderPdfPageToCanvas = async function (pdfDocument, pageNumber, scale = 1.5) {
    if (!window.pdfjsLib) {
        throw new Error('PDF viewer library not loaded.');
    }
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };
    await page.render(renderContext).promise;
    return { canvas, width: viewport.width, height: viewport.height };
};

// ---- Configure PDF.js Worker if available ----
FF.initPdfJs = function () {
    if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
};

// ---- Show / Hide DOM Helpers ----
FF.show = function (el) {
    if (el) el.classList.remove('hidden');
};

FF.hide = function (el) {
    if (el) el.classList.add('hidden');
};

// ---- Read ArrayBuffer from File ----
FF.readFileAsArrayBuffer = function (file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file buffer'));
        reader.readAsArrayBuffer(file);
    });
};

window.FF = FF;
