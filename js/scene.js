/**
 * FileForge — 3D Scene System (Optimized)
 * Floating geometric background, card tilt, upload portal glow, scroll effects.
 */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  /* ============================================
     3D Background — Floating Geometry (Optimized)
     ============================================ */
  const bgCanvas = document.getElementById('heroBgCanvas');
  if (bgCanvas) {
    const bgCtx = bgCanvas.getContext('2d');
    let bgW, bgH, bgDpr;
    let bgShapes = [];
    let bgAnimId;

    function resizeBg() {
      bgDpr = window.devicePixelRatio || 1;
      bgW = bgCanvas.clientWidth;
      bgH = bgCanvas.clientHeight;
      bgCanvas.width = bgW * bgDpr;
      bgCanvas.height = bgH * bgDpr;
      bgCtx.setTransform(bgDpr, 0, 0, bgDpr, 0, 0);
    }

    function createBgShapes() {
      bgShapes = [];
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      // Reduced count for performance — fewer on mobile
      const count = isMobile ? 4 : (prefersReducedMotion ? 5 : 10);

      const color = isDark ? '129,140,248' : '99,102,241';

      for (let i = 0; i < count; i++) {
        const type = ['cube', 'ring', 'dot'][Math.floor(Math.random() * 3)];
        bgShapes.push({
          type,
          x: Math.random() * bgW,
          y: Math.random() * bgH,
          size: 6 + Math.random() * 16,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.005,
          driftX: (Math.random() - 0.5) * 0.2,
          driftY: (Math.random() - 0.5) * 0.15,
          alpha: 0.03 + Math.random() * 0.04,
          color,
          phase: Math.random() * Math.PI * 2,
        });
      }

      // Subtle grid lines (only on desktop)
      if (!isMobile && !prefersReducedMotion) {
        for (let i = 0; i < 3; i++) {
          bgShapes.push({
            type: 'gridH',
            y: bgH * (0.2 + Math.random() * 0.6),
            alpha: 0.015 + Math.random() * 0.01,
            phase: Math.random() * Math.PI * 2,
          });
          bgShapes.push({
            type: 'gridV',
            x: bgW * (0.15 + Math.random() * 0.7),
            alpha: 0.015 + Math.random() * 0.01,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    function animateBg(time) {
      bgCtx.clearRect(0, 0, bgW, bgH);
      const t = time * 0.001;

      for (const s of bgShapes) {
        const a = prefersReducedMotion
          ? s.alpha
          : s.alpha * (0.7 + 0.3 * Math.sin(t * 0.4 + s.phase));

        bgCtx.globalAlpha = a;

        switch (s.type) {
          case 'cube': {
            if (!prefersReducedMotion) {
              s.x += s.driftX;
              s.y += s.driftY;
              s.rotation += s.rotSpeed;
              if (s.x < -40) s.x = bgW + 40;
              if (s.x > bgW + 40) s.x = -40;
              if (s.y < -40) s.y = bgH + 40;
              if (s.y > bgH + 40) s.y = -40;
            }
            bgCtx.save();
            bgCtx.translate(s.x, s.y);
            bgCtx.rotate(s.rotation);
            bgCtx.strokeStyle = `rgba(${s.color},0.5)`;
            bgCtx.lineWidth = 0.8;
            const hs = s.size;
            const skew = hs * 0.35;
            bgCtx.strokeRect(-hs / 2, -hs / 2, hs, hs);
            bgCtx.beginPath();
            bgCtx.moveTo(-hs / 2 + skew, -hs / 2 - skew);
            bgCtx.lineTo(-hs / 2, -hs / 2);
            bgCtx.moveTo(hs / 2 + skew, -hs / 2 - skew);
            bgCtx.lineTo(hs / 2, -hs / 2);
            bgCtx.moveTo(hs / 2 + skew, hs / 2 - skew);
            bgCtx.lineTo(hs / 2, hs / 2);
            bgCtx.stroke();
            bgCtx.restore();
            break;
          }
          case 'ring': {
            if (!prefersReducedMotion) {
              s.x += s.driftX * 0.4;
              s.y += s.driftY * 0.4;
            }
            bgCtx.strokeStyle = `rgba(${s.color},0.35)`;
            bgCtx.lineWidth = 0.6;
            bgCtx.beginPath();
            bgCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            bgCtx.stroke();
            break;
          }
          case 'dot': {
            if (!prefersReducedMotion) {
              s.x += s.driftX * 0.3;
              s.y += s.driftY * 0.3;
            }
            bgCtx.fillStyle = `rgba(${s.color},0.4)`;
            bgCtx.beginPath();
            bgCtx.arc(s.x, s.y, s.size * 0.25, 0, Math.PI * 2);
            bgCtx.fill();
            break;
          }
          case 'gridH': {
            if (!prefersReducedMotion) {
              s.y += Math.sin(t * 0.2 + s.phase) * 0.15;
            }
            bgCtx.strokeStyle = `rgba(129,140,248,${s.alpha})`;
            bgCtx.lineWidth = 0.4;
            bgCtx.setLineDash([3, 12]);
            bgCtx.beginPath();
            bgCtx.moveTo(0, s.y);
            bgCtx.lineTo(bgW, s.y);
            bgCtx.stroke();
            bgCtx.setLineDash([]);
            break;
          }
          case 'gridV': {
            if (!prefersReducedMotion) {
              s.x += Math.cos(t * 0.15 + s.phase) * 0.1;
            }
            bgCtx.strokeStyle = `rgba(129,140,248,${s.alpha})`;
            bgCtx.lineWidth = 0.4;
            bgCtx.setLineDash([3, 12]);
            bgCtx.beginPath();
            bgCtx.moveTo(s.x, 0);
            bgCtx.lineTo(s.x, bgH);
            bgCtx.stroke();
            bgCtx.setLineDash([]);
            break;
          }
        }
      }

      bgCtx.globalAlpha = 1;
      bgAnimId = requestAnimationFrame(animateBg);
    }

    function initBg() {
      resizeBg();
      createBgShapes();
      cancelAnimationFrame(bgAnimId);
      if (!prefersReducedMotion) {
        bgAnimId = requestAnimationFrame(animateBg);
      } else {
        bgCtx.clearRect(0, 0, bgW, bgH);
        for (const s of bgShapes) {
          bgCtx.globalAlpha = s.alpha;
          if (s.type === 'cube') {
            bgCtx.save();
            bgCtx.translate(s.x, s.y);
            bgCtx.strokeStyle = `rgba(${s.color},0.5)`;
            bgCtx.lineWidth = 0.8;
            bgCtx.strokeRect(-s.size / 2, -s.size / 2, s.size, s.size);
            bgCtx.restore();
          } else if (s.type === 'ring') {
            bgCtx.strokeStyle = `rgba(${s.color},0.35)`;
            bgCtx.lineWidth = 0.6;
            bgCtx.beginPath();
            bgCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            bgCtx.stroke();
          } else if (s.type === 'dot') {
            bgCtx.fillStyle = `rgba(${s.color},0.4)`;
            bgCtx.beginPath();
            bgCtx.arc(s.x, s.y, s.size * 0.25, 0, Math.PI * 2);
            bgCtx.fill();
          }
        }
        bgCtx.globalAlpha = 1;
      }
    }

    let bgResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(bgResizeTimer);
      bgResizeTimer = setTimeout(initBg, 250);
    });

    const bgThemeObs = new MutationObserver(() => {
      createBgShapes();
      if (!prefersReducedMotion) {
        cancelAnimationFrame(bgAnimId);
        bgAnimId = requestAnimationFrame(animateBg);
      } else {
        initBg();
      }
    });
    bgThemeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    initBg();
  }

  /* ============================================
     Card Tilt Effect — Desktop only, lightweight
     ============================================ */
  if (!prefersReducedMotion && !isMobile) {
    const toolCards = document.querySelectorAll('.tool-card');

    toolCards.forEach((card) => {
      let rafId = null;
      let currentTilt = { x: 0, y: 0 };

      card.addEventListener('mousemove', (e) => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          // Smooth small tilt
          currentTilt.x = (y - 0.5) * -6;
          currentTilt.y = (x - 0.5) * 6;
          card.style.transform = `perspective(800px) rotateX(${currentTilt.x}deg) rotateY(${currentTilt.y}deg) translateY(-3px)`;
          rafId = null;
        });
      });

      card.addEventListener('mouseleave', () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        card.style.transform = '';
      });
    });
  }

  /* ============================================
     Upload Zone Portal — Visual feedback
     ============================================ */
  document.querySelectorAll('.upload-zone').forEach((zone) => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', () => {
      zone.classList.remove('drag-over');
    });
  });

  /* ============================================
     Scroll Reveal — Lightweight fade-in
     ============================================ */
  if (!prefersReducedMotion) {
    const revealStyle = document.createElement('style');
    revealStyle.textContent = '.reveal-ready { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(revealStyle);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-ready');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    );

    document.querySelectorAll('.tool-card, .privacy-card, .section-header').forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s cubic-bezier(.4,0,.2,1), transform 0.6s cubic-bezier(.4,0,.2,1)';
      observer.observe(el);
    });
  }

  /* ============================================
     Navbar Scroll — Subtle shrink
     ============================================ */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const navStyle = document.createElement('style');
    navStyle.textContent = `
      .navbar-scrolled {
        top: 6px !important;
        left: 6px !important;
        right: 6px !important;
        border-radius: var(--radius-lg) !important;
      }
    `;
    document.head.appendChild(navStyle);

    window.addEventListener('scroll', () => {
      navbar.classList.toggle('navbar-scrolled', window.scrollY > 60);
    }, { passive: true });
  }

})();
