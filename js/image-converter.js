/* ==========================================================================
   FileForge — Image Converter
   Supports converting any format to any format:
   PNG, JPG/JPEG, WEBP, BMP, ICO, GIF, SVG. Supports Single & Batch conversion.
   ========================================================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // DOM Elements
    const upload = $('#converterUpload');
    const fileInput = $('#converterFileInput');
    const fileCard = $('#converterFileCard');
    const preview = $('#converterPreview');
    const fileName = $('#converterFileName');
    const fileSize = $('#converterFileSize');
    const fileType = $('#converterFileType');
    const dims = $('#converterDims');
    const removeBtn = $('#converterRemove');
    const controls = $('#converterControls');
    const formatSelect = $('#converterFormat');
    const qualitySlider = $('#converterQuality');
    const qualityValue = $('#converterQualityValue');
    const qualityGroup = $('#converterQualityGroup');
    const bgGroup = $('#converterBgGroup');
    const bgColor = $('#converterBgColor');
    const convertBtn = $('#converterConvert');
    const processing = $('#converterProcessing');
    const result = $('#converterResult');
    const resultPreview = $('#converterResultPreview');
    const origInfo = $('#converterOrigInfo');
    const outInfo = $('#converterOutInfo');
    const sizeInfo = $('#converterSizeInfo');
    const downloadBtn = $('#converterDownload');
    const resetBtn = $('#converterReset');

    // Batch elements
    const batchList = $('#converterBatchList');
    const batchSummary = $('#converterBatchSummary');
    const downloadZipBtn = $('#converterDownloadZip');

    let uploadedFiles = [];
    let convertedResults = [];

    // Dropzone setup with multiple file support
    FF.setupDropZone(upload, fileInput, handleFiles);
    if (window.FF && FF.registerToolHandler) FF.registerToolHandler('converter', handleFiles);

    // Format changes
    if (formatSelect) {
        formatSelect.addEventListener('change', () => {
            const val = formatSelect.value;
            // Show quality slider for JPEG and WebP
            if (val === 'image/jpeg' || val === 'image/webp') {
                FF.show(qualityGroup);
            } else {
                FF.hide(qualityGroup);
            }

            // Show background color picker for formats without transparency (JPEG, BMP)
            if (val === 'image/jpeg' || val === 'image/bmp') {
                if (bgGroup) FF.show(bgGroup);
            } else {
                if (bgGroup) FF.hide(bgGroup);
            }
        });
    }

    if (qualitySlider && qualityValue) {
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value + '%';
        });
    }

    if (removeBtn) removeBtn.addEventListener('click', resetTool);
    if (resetBtn) resetBtn.addEventListener('click', resetTool);
    if (convertBtn) convertBtn.addEventListener('click', convertFiles);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (convertedResults.length === 1) {
                const item = convertedResults[0];
                FF.downloadBlob(item.blob, item.name);
                FF.toast('Image downloaded successfully.', 'success');
            }
        });
    }

    if (downloadZipBtn) {
        downloadZipBtn.addEventListener('click', async () => {
            if (convertedResults.length > 0) {
                try {
                    await FF.downloadZip(convertedResults, 'converted_images.zip');
                    FF.toast('ZIP archive downloaded!', 'success');
                } catch (err) {
                    FF.toast(err.message || 'Failed to create ZIP', 'error');
                }
            }
        });
    }

    function handleFiles(files) {
        const fileArr = Array.isArray(files) ? files : [files];
        const validImages = fileArr.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|ico|svg)$/i.test(f.name));

        if (validImages.length === 0) {
            FF.toast('Please select valid image files.', 'error');
            return;
        }

        uploadedFiles = validImages;
        convertedResults = [];

        if (uploadedFiles.length === 1) {
            // Single file mode
            const file = uploadedFiles[0];
            fileName.textContent = file.name;
            fileSize.textContent = FF.formatFileSize(file.size);
            fileType.textContent = (FF.getFileExtension(file.name) || 'IMG').toUpperCase();

            const url = URL.createObjectURL(file);
            preview.src = url;
            preview.onload = () => {
                if (dims) dims.textContent = preview.naturalWidth + ' × ' + preview.naturalHeight + ' px';
            };

            if (batchList) FF.hide(batchList);
            FF.show(fileCard);
        } else {
            // Batch mode
            if (fileCard) FF.hide(fileCard);
            if (batchList) {
                FF.show(batchList);
                renderBatchFileList();
            }
        }

        FF.hide(upload);
        FF.show(controls);
        FF.hide(result);
        FF.hide(processing);

        // Auto select alternative format
        const firstExt = FF.getFileExtension(uploadedFiles[0].name).toLowerCase();
        if (firstExt === 'png') formatSelect.value = 'image/jpeg';
        else if (firstExt === 'jpg' || firstExt === 'jpeg') formatSelect.value = 'image/webp';
        else if (firstExt === 'webp') formatSelect.value = 'image/png';
        else formatSelect.value = 'image/png';

        formatSelect.dispatchEvent(new Event('change'));
    }

    function renderBatchFileList() {
        if (!batchList) return;
        batchList.innerHTML = `
            <div class="batch-header">
                <strong>${uploadedFiles.length} images queued for conversion</strong>
                <button type="button" class="btn btn-sm btn-ghost" id="batchClearBtn">Clear all</button>
            </div>
            <div class="batch-items">
                ${uploadedFiles.map((f, i) => `
                    <div class="batch-item">
                        <span class="batch-item-name">${f.name}</span>
                        <span class="batch-item-size">${FF.formatFileSize(f.size)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        const clearBtn = document.getElementById('batchClearBtn');
        if (clearBtn) clearBtn.addEventListener('click', resetTool);
    }

    async function convertFiles() {
        if (uploadedFiles.length === 0) {
            FF.toast('No files to convert.', 'error');
            return;
        }

        const outputMime = formatSelect.value;
        const quality = parseInt(qualitySlider.value, 10) / 100;
        const bg = (bgColor && bgColor.value) ? bgColor.value : '#FFFFFF';
        const targetExt = FF.mimeToExt(outputMime);

        FF.hide(controls);
        FF.show(processing);

        convertedResults = [];

        try {
            for (let i = 0; i < uploadedFiles.length; i++) {
                const file = uploadedFiles[i];
                const convertedBlob = await convertSingleImage(file, outputMime, quality, bg);
                const outName = FF.changeExt(file.name, targetExt);
                convertedResults.push({
                    name: outName,
                    blob: convertedBlob,
                    origFile: file
                });
            }

            FF.hide(processing);
            FF.show(result);

            if (convertedResults.length === 1) {
                // Single result preview
                const res = convertedResults[0];
                if (resultPreview) resultPreview.src = URL.createObjectURL(res.blob);
                if (origInfo) origInfo.textContent = res.origFile.name + ' (' + FF.formatFileSize(res.origFile.size) + ')';
                if (outInfo) outInfo.textContent = res.name + ' (' + FF.formatFileSize(res.blob.size) + ')';
                if (sizeInfo) {
                    const diff = res.blob.size - res.origFile.size;
                    const diffPercent = Math.round((diff / res.origFile.size) * 100);
                    if (diff < 0) {
                        sizeInfo.textContent = `Reduced by ${Math.abs(diffPercent)}% (${FF.formatFileSize(Math.abs(diff))})`;
                        sizeInfo.className = 'badge badge-success';
                    } else {
                        sizeInfo.textContent = `New size: ${FF.formatFileSize(res.blob.size)}`;
                        sizeInfo.className = 'badge badge-neutral';
                    }
                }
                if (downloadBtn) FF.show(downloadBtn);
                if (downloadZipBtn) FF.hide(downloadZipBtn);
            } else {
                // Batch results summary
                if (downloadBtn) FF.hide(downloadBtn);
                if (downloadZipBtn) FF.show(downloadZipBtn);
                if (batchSummary) {
                    const totalOrig = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
                    const totalNew = convertedResults.reduce((acc, r) => acc + r.blob.size, 0);
                    batchSummary.innerHTML = `
                        <div class="batch-result-stat">
                            <div>Successfully converted <strong>${convertedResults.length}</strong> images to <strong>${targetExt.toUpperCase()}</strong></div>
                            <div class="text-muted text-sm">Original total: ${FF.formatFileSize(totalOrig)} → Converted total: ${FF.formatFileSize(totalNew)}</div>
                        </div>
                    `;
                }
            }

            FF.toast(`Converted ${convertedResults.length} image${convertedResults.length > 1 ? 's' : ''}!`, 'success');
        } catch (err) {
            FF.hide(processing);
            FF.show(controls);
            FF.toast(err.message || 'Conversion failed.', 'error');
        }
    }

    async function convertSingleImage(file, mime, quality, bgColor) {
        // SVG to SVG direct or SVG rasterization
        if (mime === 'image/svg+xml') {
            if (file.type === 'image/svg+xml') return file;
            // Embed image into an SVG wrapper
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
            const img = await FF.loadImage(file);
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.naturalWidth}" height="${img.naturalHeight}" viewBox="0 0 ${img.naturalWidth} ${img.naturalHeight}">
  <image href="${dataUrl}" width="${img.naturalWidth}" height="${img.naturalHeight}" />
</svg>`;
            return new Blob([svgContent], { type: 'image/svg+xml' });
        }

        const img = await FF.loadImage(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        // Fill background if format has no alpha transparency
        if (mime === 'image/jpeg' || mime === 'image/bmp') {
            ctx.fillStyle = bgColor || '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        // ICO export
        if (mime === 'image/x-icon') {
            return await FF.createIcoBlob(canvas);
        }

        // Standard canvas toBlob
        return await new Promise((resolve, reject) => {
            canvas.toBlob((b) => {
                if (b) resolve(b);
                else {
                    // Fallback to PNG if format unsupported by browser encoder
                    canvas.toBlob((fallback) => {
                        if (fallback) resolve(fallback);
                        else reject(new Error('Conversion not supported for this format'));
                    }, 'image/png');
                }
            }, mime, quality);
        });
    }

    function resetTool() {
        uploadedFiles = [];
        convertedResults = [];
        fileInput.value = '';

        FF.hide(fileCard);
        if (batchList) FF.hide(batchList);
        FF.hide(controls);
        FF.hide(processing);
        FF.hide(result);
        FF.show(upload);

        if (preview && preview.src) URL.revokeObjectURL(preview.src);
        if (resultPreview && resultPreview.src) URL.revokeObjectURL(resultPreview.src);
    }
})();
