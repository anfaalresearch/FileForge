/* ==========================================
   FileForge — Core Application Logic
   ========================================== */

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

    // Tool names map
    const toolNames = {
        converter: 'Image Converter',
        resizer: 'Image Resizer',
        compressor: 'Image Compressor',
        pdf: 'Image to PDF',
        cropper: 'Image Cropper',
        reducer: 'File Size Reducer',
        fileinfo: 'File Information',
    };

    function switchTool(toolId) {
        // Update sidebar active state
        sidebarLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-tool') === toolId);
        });

        // Show correct panel
        toolPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === 'panel-' + toolId);
        });

        // Update breadcrumb
        if (breadcrumbTool) {
            breadcrumbTool.textContent = toolNames[toolId] || toolId;
        }

        // Update page title
        document.title = (toolNames[toolId] || 'Tools') + ' — FileForge';

        // Store recent tool
        try {
            let recent = JSON.parse(localStorage.getItem('ff-recent') || '[]');
            recent = recent.filter(t => t !== toolId);
            recent.unshift(toolId);
            localStorage.setItem('ff-recent', JSON.stringify(recent.slice(0, 5)));
        } catch (e) { /* ignore */ }

        closeSidebar();
    }

    // Sidebar link clicks
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const toolId = link.getAttribute('data-tool');
            switchTool(toolId);

            // Update URL without reload
            const url = new URL(window.location);
            url.searchParams.set('tool', toolId);
            history.pushState(null, '', url);
        });
    });

    // ---- Tool Search ----
    const toolSearch = document.getElementById('toolSearch');
    if (toolSearch) {
        toolSearch.addEventListener('input', () => {
            const query = toolSearch.value.toLowerCase().trim();
            sidebarLinks.forEach(link => {
                const name = link.querySelector('span').textContent.toLowerCase();
                link.style.display = (!query || name.includes(query)) ? '' : 'none';
            });
        });
    }

    // ---- Initialize from URL ----
    function initFromURL() {
        const params = new URLSearchParams(window.location.search);
        const tool = params.get('tool');
        if (tool && toolNames[tool]) {
            switchTool(tool);
        } else {
            // Default to converter
            switchTool('converter');
        }
    }

    // Only run tool logic on tools page
    if (sidebar && toolPanels.length > 0) {
        initFromURL();
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        initFromURL();
    });

})();
