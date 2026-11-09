<div align="center">

# ⚡ FileForge

**High-performance, privacy-first Image & PDF Studio in your browser.**  
**No server uploads. No accounts. Zero tracking.**

[🌐 **Launch Live Studio**](https://anfaalresearch.github.io/FileForge/)

[![License: MIT](https://img.shields.io/badge/License-MIT-2563eb.svg)](#-license)
[![Zero Backend](https://img.shields.io/badge/Backend-None-10b981)](#-privacy--architecture)
[![Client-Side PDF](https://img.shields.io/badge/PDF_Engine-pdf--lib_%2B_pdf.js-e11d48)](#-pdf-suite)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-3b82f6.svg)](#-contributing)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Image Suite](#-image-suite)
- [PDF Suite](#-pdf-suite)
- [Privacy & Architecture](#-privacy--architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Browser Support](#-browser-support)
- [License](#-license)

---

## 🔍 Overview

**FileForge** is an open-source, 100% in-browser utility studio designed for speed, craft, and total privacy. It replaces slow, ad-ridden cloud conversion sites with high-performance Web APIs. 

Every operation — from resizing an image to exact arbitrary dimensions (e.g. `215 × 100`), converting between PNG/JPG/WEBP/ICO/SVG formats, to merging, compressing, annotating, and splitting PDFs — executes locally in browser memory. **Nothing is ever sent over the network.**

---

## 🖼️ Image Suite

| Tool | Core Features & Capabilities | Supported Formats |
|---|---|---|
| **Image Converter** | Convert any format to any format with batch support, quality control, and background alpha fill. | PNG · JPG · JPEG · WEBP · GIF · BMP · ICO · SVG |
| **Image Resizer** | Set custom changeable pixel dimensions (e.g. `215 × 100`), lock/unlock aspect ratio, scale by percentage (10%–300%), and standard/social presets. | All browser-supported images |
| **Image Compressor** | Lossy/lossless visual compression with real-time before/after comparison, format re-encoding, and byte savings. | PNG · JPG · WEBP |
| **Image Size Reducer** | Specify an exact target file size in KB or MB (e.g. 50 KB, 100 KB, 200 KB) with automated binary search quality optimization. | PNG · JPG · WEBP |
| **Image Cropper** | Interactive canvas cropping with presets (1:1, 16:9, 4:3, 9:16, 215:100), 90° rotation, and zoom. | All browser-supported images |
| **Image to PDF** | Compile multiple images into a single PDF with custom page orientation (portrait/landscape/auto), paper sizes (A4/Letter/Fit), and margins. | Images → PDF |
| **Metadata & EXIF Cleaner** | Inspect deep image metadata, dimensions, and aspect ratio. 1-click strip of GPS coordinates, camera serials, and EXIF tags. | All image types |

---

## 📄 PDF Suite

| Tool | Core Features & Capabilities | Engine |
|---|---|---|
| **PDF Merger** | Combine multiple PDF documents into a single document with drag-and-drop file reordering, individual page counts, and instant merge. | `pdf-lib` |
| **PDF Compressor & Reducer** | Downsample and recompress PDF pages client-side using custom DPI profiles (100 DPI extreme, 150 DPI balanced, 200 DPI high-res) for quick uploads. | `pdf.js` + `pdf-lib` |
| **PDF Editor & Annotator** | Stamp diagonal/horizontal watermarks, insert page numbering ("Page X of Y"), add custom text annotations, and draw/place electronic signatures. | `pdf-lib` + Canvas |
| **PDF Splitter & Extractor** | Interactive page thumbnail grid: extract selected pages to a new PDF, delete unwanted pages, or split all pages into separate PDFs in a ZIP archive. | `pdf.js` + `pdf-lib` + `JSZip` |
| **PDF to Images** | Convert every page of a PDF document into high-resolution PNG or JPEG images (150/200/300 DPI retina) with single or bulk ZIP downloads. | `pdf.js` + `JSZip` |

---

## 🔒 Privacy & Architecture

FileForge was designed with zero-trust privacy constraints:

- ✅ **Zero Server Uploads**: Files are read into client memory via the HTML5 `FileReader` API and manipulated in local buffers (`HTML5 Canvas`, `pdf-lib`, `pdf.js`).
- ✅ **Zero Telemetry / Trackers**: No Google Analytics, Meta Pixels, cookies, or remote logging.
- ✅ **Memory Leak Prevention**: All generated Object URLs (`URL.createObjectURL`) are revoked immediately after user download.
- ✅ **Offline Compatible**: Works entirely client-side once loaded.

---

## 🛠 Tech Stack

| Component | Technology |
|---|---|
| Interface | Semantic HTML5, CSS3 Custom Properties (Dark/Light modes), Inter & JetBrains Mono typography |
| Scripting | Vanilla JavaScript ES2020+ (Modular IIFE patterns, Web Workers, Canvas API) |
| PDF Manipulation | [pdf-lib 1.17.1](https://pdf-lib.js.org/) via cdnjs |
| PDF Page Rendering | [pdf.js 3.11.174](https://mozilla.github.io/pdf.js/) via cdnjs |
| PDF Generation | [jsPDF 2.5.1](https://github.com/parallax/jsPDF) via cdnjs |
| Archive Packaging | [JSZip 3.10.1](https://stuk.github.io/jszip/) via cdnjs |
| Routing | URL `?tool=` query parameter with `history.pushState` |

---

## 📁 Project Structure

```
FileForge/
├── index.html              # Clean product landing page & universal dropzone
├── tools.html              # Unified Studio workspace with sidebar navigation
├── README.md
│
├── css/
│   ├── style.css           # Clean utility design system tokens & components
│   └── responsive.css      # Responsive breakpoints (desktop, tablet, mobile)
│
└── js/
    ├── utils.js            # Shared helpers (file size, dropzones, zip, toasts)
    ├── app.js              # Theme manager, SPA router, category filters
    │
    ├── image-converter.js  # Format conversion (PNG, JPG, WEBP, ICO, SVG, BMP)
    ├── image-resizer.js    # Custom dimensions (215x100), aspect lock, presets
    ├── image-compressor.js # Visual quality slider & before/after compare
    ├── file-reducer.js     # Target file size compressor (KB/MB)
    ├── image-cropper.js    # Canvas crop, custom ratio, rotation, zoom
    ├── image-pdf.js        # Multi-image to PDF compilation
    ├── file-info.js        # Metadata inspection & EXIF privacy scrubber
    │
    ├── pdf-merger.js       # Combine multiple PDF documents
    ├── pdf-compressor.js   # Client-side PDF page downsampling & size reducer
    ├── pdf-editor.js       # Watermarking, numbering, text, & signature pad
    ├── pdf-splitter.js     # Page extraction, page deletion, & split to ZIP
    └── pdf-to-image.js     # PDF page rasterizer (PNG/JPEG) & ZIP export
```

---

## 🚀 Getting Started

FileForge requires **no build step, no npm, and no local server installation**.

### Option 1 — Open directly in browser

```bash
git clone https://github.com/anfaalresearch/FileForge.git
cd FileForge
open index.html # On macOS (or double-click index.html)
```

### Option 2 — Serve with any local HTTP server

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## 🌐 Browser Support

| Browser | Minimum Version | Status |
|---|---|---|
| Chrome / Chromium / Edge | 90+ | ✅ Full Support |
| Firefox | 90+ | ✅ Full Support |
| Safari (macOS / iOS) | 15+ | ✅ Full Support |
| Chrome Android | Current | ✅ Full Support |

---

## 📄 License

MIT © 2026 Anfaal

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.
