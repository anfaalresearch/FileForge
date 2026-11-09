/* ==========================================================================
   FileForge — Application Controller
   Navigation, SPA tool routing, category filtering, theme persistence,
   and drag-and-drop auto-routing.
   ========================================================================== */

(function () {
    'use strict';

    // ---- Theme Toggle ----
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');

    function setTheme(theme) {
        html.setAttribute('data-theme', theme);
        localStorage.setItem('ff-theme', theme);
    }

    function initTheme() {
        const saved = localStorage.getItem('ff-theme');
        if (saved) {
            setTheme(saved);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = html.getAttribute('data-theme');
            setTheme(current === 'dark' ? 'light' : 'dark');
        });
    }
    initTheme();

    // ---- Sidebar Navigation ----
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const toolPanels = document.querySelectorAll('.tool-panel');
    const breadcrumbTool = document.getElementById('breadcrumbTool');
    const categoryTabs = document.querySelectorAll('.cat-pill');

    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', openSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Tool registry
    const toolNames = {
        // Image Suite
        converter: 'Image Converter',
        resizer: 'Image Resizer',
        compressor: 'Image Compressor',
        reducer: 'Image Size Reducer',
        cropper: 'Image Cropper',
        imagepdf: 'Image to PDF',
        fileinfo: 'Metadata & EXIF Inspector',
        // PDF Suite
        pdfmerge: 'PDF Merger',
        pdfcompress: 'PDF Compressor & Reducer',
        pdfedit: 'PDF Editor & Annotator',
        pdfsplit: 'PDF Splitter & Extractor',
        pdftoimg: 'PDF to Images',
    };

    function switchTool(toolId) {
        if (!toolNames[toolId]) toolId = 'converter';

        // Update sidebar link active class
        sidebarLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-tool') === toolId);
        });

        // Toggle tool panel
        toolPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === 'panel-' + toolId);
        });

        // Update breadcrumb
        if (breadcrumbTool) {
            breadcrumbTool.textContent = toolNames[toolId];
        }

        // Update page title
        document.title = `${toolNames[toolId]} — FileForge`;

        // Store recently used tool
        try {
            let recent = JSON.parse(localStorage.getItem('ff-recent') || '[]');
            recent = recent.filter(t => t !== toolId);
            recent.unshift(toolId);
            localStorage.setItem('ff-recent', JSON.stringify(recent.slice(0, 5)));
        } catch (e) { /* ignore */ }

        closeSidebar();
    }

    // Wire sidebar links
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const toolId = link.getAttribute('data-tool');
            switchTool(toolId);

            const url = new URL(window.location);
            url.searchParams.set('tool', toolId);
            history.pushState(null, '', url);
        });
    });

    // Category filter pills (All / Image / PDF)
    if (categoryTabs.length > 0) {
        categoryTabs.forEach(pill => {
            pill.addEventListener('click', () => {
                categoryTabs.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const cat = pill.getAttribute('data-category');

                sidebarLinks.forEach(link => {
                    const itemCat = link.getAttribute('data-cat');
                    if (cat === 'all' || itemCat === cat) {
                        link.style.display = '';
                    } else {
                        link.style.display = 'none';
                    }
                });

                // Also toggle sidebar category section headings if present
                document.querySelectorAll('.sidebar-section').forEach(sec => {
                    const secCat = sec.getAttribute('data-sec-cat');
                    if (!secCat || cat === 'all' || secCat === cat) {
                        sec.style.display = '';
                    } else {
                        sec.style.display = 'none';
                    }
                });
            });
        });
    }

    // Tool search filter
    const toolSearch = document.getElementById('toolSearch');
    if (toolSearch) {
        toolSearch.addEventListener('input', () => {
            const query = toolSearch.value.toLowerCase().trim();
            sidebarLinks.forEach(link => {
                const name = link.querySelector('span') ? link.querySelector('span').textContent.toLowerCase() : '';
                link.style.display = (!query || name.includes(query)) ? '' : 'none';
            });
        });
    }

    // Initialize from URL
    function initFromURL() {
        const params = new URLSearchParams(window.location.search);
        let tool = params.get('tool');

        // Aliases support
        if (tool === 'pdf') tool = 'imagepdf';
        if (tool === 'merge') tool = 'pdfmerge';
        if (tool === 'split') tool = 'pdfsplit';
        if (tool === 'edit') tool = 'pdfedit';

        if (tool && toolNames[tool]) {
            switchTool(tool);
        } else {
            switchTool('converter');
        }
    }

    if (sidebar && toolPanels.length > 0) {
        initFromURL();
    }

    window.addEventListener('popstate', () => {
        initFromURL();
    });

    // Global drag-and-drop file detection
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        // Only auto-switch if dropping outside an active tool's input zone
        if (e.target.closest('.dropzone') || e.target.closest('input[type="file"]')) return;
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const first = files[0];
            if (first.type === 'application/pdf' || first.name.toLowerCase().endsWith('.pdf')) {
                if (window.location.pathname.includes('tools.html')) {
                    switchTool('pdfmerge');
                }
            } else if (first.type.startsWith('image/')) {
                if (window.location.pathname.includes('tools.html')) {
                    switchTool('converter');
                }
            }
        }
    });

})();
