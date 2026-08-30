<div align="center">

# ⚡ FileForge

**Private, browser-based file tools. No uploads. No accounts. No servers.**

[🌐 **Live Demo**](https://anfaalresearch.github.io/FileForge/)

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](#-license)
[![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![No Backend](https://img.shields.io/badge/Backend-None-10b981)](#-privacy)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-818cf8.svg)](#-contributing)

</div>

---

## 📖 Table of Contents

- [What is FileForge?](#-what-is-fileforge)
- [Live Demo](#-live-demo)
- [Tools](#-tools)
- [Privacy](#-privacy)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Architecture](#-architecture)
- [Security Audit](#-security-audit)
- [Browser Support](#-browser-support)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 What is FileForge?

FileForge is a **100% client-side** file processing toolkit that runs entirely in your browser. It converts, resizes, compresses, crops, and inspects files using modern Web APIs — **your files never leave your device**.

There is no backend, no cloud storage, no analytics, and no accounts. Open the page, use a tool, download your result.

### 🌐 Live Demo

Try FileForge directly in your browser:

**[https://anfaalresearch.github.io/FileForge/](https://anfaalresearch.github.io/FileForge/)**

---

## 🧰 Tools

| Tool | Description | Formats |
|---|---|---|
| **Image Converter** | Convert images between formats | PNG · JPG · WEBP · GIF · BMP |
| **Image Resizer** | Resize with custom dimensions or presets | Any image |
| **Image Compressor** | Reduce file size with a quality slider + before/after compare | PNG · JPG · WEBP |
| **Image Cropper** | Crop with free or locked aspect ratios, rotate & zoom | Any image |
| **Image to PDF** | Combine multiple images into a single PDF | Any image → PDF |
| **File Size Reducer** | Compress with live size estimation | PNG · JPG · WEBP |
| **File Information** | Inspect metadata — name, MIME, size, dimensions | Any file |

---

## 🔒 Privacy

FileForge was designed from the ground up with privacy as the first constraint, not an afterthought.

- ✅ **No server uploads** — files are processed entirely in-browser using the Canvas API and FileReader API
- ✅ **No tracking** — zero analytics, zero telemetry, zero cookies (except `localStorage` for theme preference)
- ✅ **No accounts** — nothing to sign up for
- ✅ **Core processing runs locally** — file operations happen directly in your browser
- ✅ **Object URLs revoked** — all `URL.createObjectURL` blobs are revoked after use to free memory

> **Note:** The only external resource loaded at runtime is [jsPDF 2.5.1](https://github.com/parallax/jsPDF) from the Cloudflare CDN, used solely for PDF generation. All other functionality is self-contained.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic, accessible markup) |
| Styling | Vanilla CSS3 (custom properties, grid, glassmorphism) |
| Logic | Vanilla JavaScript ES2020+ (IIFEs, async/await, Canvas API) |
| Font | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |
| PDF generation | [jsPDF 2.5.1](https://github.com/parallax/jsPDF) via CDN |
| Image processing | HTML5 Canvas API |
| File reading | FileReader API + File Drag & Drop API |
| Routing | URL `?tool=` query param + `history.pushState` |
| Persistence | `localStorage` (theme + recently used tools only) |

---

## 📁 Project Structure

```
FileForge/
├── index.html              # Landing page (hero, tool cards, privacy section)
├── tools.html              # All tools shell (SPA-style panel switching)
├── README.md
│
├── css/
│   ├── style.css           # Full design system — tokens, components, layouts
│   └── responsive.css      # Breakpoint overrides (1024px, 768px, 480px)
│
└── js/
    ├── utils.js            # Shared FF namespace — helpers, toast, drop zones
    ├── app.js              # Theme toggle, sidebar nav, tool switching, routing
    ├── scene.js            # Hero background canvas ambient animation
    │
    ├── image-converter.js  # Tool: format conversion
    ├── image-resizer.js    # Tool: resize + aspect ratio lock + presets
    ├── image-compressor.js # Tool: quality slider + before/after compare
    ├── image-cropper.js    # Tool: canvas crop box + rotate + zoom
    ├── image-pdf.js        # Tool: multi-image → PDF (uses jsPDF)
    ├── file-reducer.js     # Tool: compression with live size estimate
    └── file-info.js        # Tool: file metadata inspector
```

---

## 🚀 Getting Started

FileForge requires **no build step, no npm, no dependencies to install**.

### Option 1 — Open directly

```bash
git clone https://github.com/anfaalresearch/FileForge.git
cd FileForge

# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

### Option 2 — Serve locally (recommended)

Some browsers restrict `file://` protocol for certain APIs. Use any static server:

```bash
# Python 3
python3 -m http.server 3000

# Node.js
npx serve .

# PHP
php -S localhost:3000
```

Then open [http://localhost:3000](http://localhost:3000).

---

## 🏗 Architecture

### Global Namespace — `FF`

All shared utilities live on the `window.FF` object, defined in `utils.js` and available to every tool script:

```
FF.formatFileSize(bytes)          → "1.4 MB"
FF.getFileExtension(filename)     → "png"
FF.mimeToExt(mime)                → "jpg"
FF.mimeToFriendly(mime)          → "JPEG"
FF.changeExt(filename, ext)       → "photo.webp"
FF.loadImage(file)                → Promise<HTMLImageElement>
FF.downloadBlob(blob, filename)   → triggers browser download + auto-revoke
FF.setupDropZone(zone, input, cb) → wires drag & drop + file input
FF.show(el) / FF.hide(el)        → add/remove .hidden class
FF.toast(message, type)           → type: 'success' | 'error' | 'warning' | 'info'
```

### Tool Script Pattern

Every tool follows the same IIFE structure:

```js
(function () {
  'use strict';

  // 1. Query all DOM elements needed by this tool
  const upload = document.querySelector('#myToolUpload');

  // 2. Wire up drag & drop and file input via FF.setupDropZone
  FF.setupDropZone(upload, fileInput, handleFile);

  // 3. handleFile — validate, update file card, show controls
  function handleFile(file) { /* ... */ }

  // 4. Core processing — async, uses Canvas API or jsPDF
  async function processFile() { /* ... */ }

  // 5. resetTool — revoke object URLs, clear state, restore upload zone
  function resetTool() { /* ... */ }

})();
```

### Routing (tools.html)

`tools.html` is a single-page shell. Panels are toggled via the `.hidden` CSS class.

| Trigger | Behaviour |
|---|---|
| Page load with `?tool=resizer` | Opens Image Resizer directly |
| Sidebar link click | Switches panel + pushes URL via `history.pushState` |
| Browser back/forward | `popstate` listener re-reads URL and switches panel |
| Sidebar search | Filters sidebar links by name in real time |

---

## 🛡 Security Audit

| Finding | Severity | Status |
|---|---|---|
| File contents never sent to any server | — | ✅ By design |
| `URL.createObjectURL` blobs revoked after use | — | ✅ Implemented |
| Filename sanitized before `innerHTML` injection | Low | ✅ Fixed |
| No `eval()` or `document.write` anywhere | — | ✅ Clean |
| `localStorage` stores only theme + tool IDs, never file data | — | ✅ Clean |
| All async processing wrapped in try/catch with user feedback | — | ✅ Handled |
| File size limits enforced before processing | — | ✅ 100MB images · 500MB info |
| CORS canvas taint impossible — all sources are local `File` objects | — | ✅ N/A |

---

## 🌐 Browser Support

| Browser | Support |
|---|---|
| Chrome / Edge 90+ | ✅ Full |
| Firefox 90+ | ✅ Full |
| Safari 15+ | ✅ Full |
| Safari iOS 15+ | ✅ Full |
| Chrome Android | ✅ Full |

> **Requires:** Canvas API · FileReader API · File Drag & Drop · CSS Custom Properties · `URL.createObjectURL` · `history.pushState`

---

## 🤝 Contributing

1. **Fork** the repo
2. **Create** a branch: `git checkout -b feat/my-new-tool`
3. **Follow** the tool pattern above
4. **Test** in Chrome and Firefox
5. **Open** a pull request

### Adding a New Tool (checklist)

- [ ] Create `js/my-tool.js` following the IIFE tool pattern
- [ ] Add `<div id="panel-mytool" class="tool-panel">` in `tools.html`
- [ ] Add `<a class="sidebar-link" data-tool="mytool">` in `tools.html`
- [ ] Register the name in `toolNames` in `app.js`
- [ ] Add a card in `index.html`
- [ ] Add `<script src="js/my-tool.js"></script>` in `tools.html`

---

## 📄 License

MIT © 2026 Anfaal

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

---

<div align="center">

Made with ⚡ for the open web.

**[⬆ Back to top](#-fileforge)**

</div>