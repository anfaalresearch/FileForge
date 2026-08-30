/* ==========================================
   FileForge — Utility Functions
   ========================================== */

const FF = window.FF || {};

// ---- File Size Formatting ----
FF.formatFileSize = function (bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
    return size + ' ' + units[i];
};

// ---- File Extension ----
FF.getFileExtension = function (filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

// ---- MIME to Friendly Name ----
FF.mimeToFriendly = function (mime) {
    const map = {
        'image/png': 'PNG',
        'image/jpeg': 'JPEG',
        'image/webp': 'WEBP',
        'image/gif': 'GIF',
        'image/bmp': 'BMP',
        'application/pdf': 'PDF',
    };
    return map[mime] || mime || 'Unknown';
};

// ---- Toast Notifications ----
FF.toast = function (message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span><span>' + message + '</span>';
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 4000);
};

// ---- Drag & Drop Setup ----
FF.setupDropZone = function (dropZone, fileInput, onFile) {
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', (e) => {
        if (e.target === fileInput) return;
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

// ---- Load Image from File ----
FF.loadImage = function (file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('Not an image file'));
            return;
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not load image — file may be corrupted.'));
        img.src = URL.createObjectURL(file);
    });
};

// ---- Trigger Download ----
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

// ---- Show / Hide Helpers ----
FF.show = function (el) {
    if (el) el.classList.remove('hidden');
};

FF.hide = function (el) {
    if (el) el.classList.add('hidden');
};

// ---- Get Output Extension from MIME ----
FF.mimeToExt = function (mime) {
    const map = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/bmp': 'bmp',
    };
    return map[mime] || 'png';
};

// ---- Change file extension ----
FF.changeExt = function (filename, newExt) {
    const base = filename.replace(/\.[^/.]+$/, '');
    return base + '.' + newExt;
};

window.FF = FF;
