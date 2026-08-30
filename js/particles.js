/**
 * FileForge — Particle Typography System (Fixed)
 * Particles form text centered exactly in the hero section.
 * Text is rendered relative to the full canvas, not a constrained offscreen width.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('heroParticleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mouse tracking
  const mouse = { x: -9999, y: -9999, active: false };
  let particles = [];
  let animId = null;
  let dpr = 1;
  let W, H;

  // ---- Configuration ----
  const CFG = {
    lines: ['YOUR FILES.', 'YOUR BROWSER.', 'YOUR PRIVACY.'],
    fontSize: 44,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: '900',
    particleCount: 1600,
    particleSize: 1.0,
    particleMouseRadius: 100,
    particleMouseForce: 5,
    particleDrift: 0.1,
    particleReturnSpeed: 0.042,
    colors: ['#818cf8', '#a78bfa', '#22d3ee', '#6366f1', '#c4b5fd'],
    darkColors: ['#818cf8', '#a78bfa', '#22d3ee', '#c4b5fd', '#a5b4fc'],
  };

  function getColors() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? CFG.darkColors : CFG.colors;
  }

  // ---- Resize ----
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const heroSection = canvas.parentElement;
    W = heroSection.clientWidth;
    H = heroSection.clientHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- Sample text positions (always centered in full W×H) ----
  function sampleTextPositions() {
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');

    // Use full canvas dimensions — this is the fix for the off-center ghost
    offscreen.width  = W * dpr;
    offscreen.height = H * dpr;
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    offCtx.fillStyle = '#fff';
    offCtx.font = `${CFG.fontWeight} ${CFG.fontSize}px ${CFG.fontFamily}`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';

    const lineSpacing = CFG.fontSize * 1.35;
    const totalHeight = CFG.lines.length * lineSpacing;
    // Push text into the left 40% of the hero to avoid overlapping the main headline
    const textCenterX = W * 0.22;
    const startY = (H - totalHeight) / 2 + lineSpacing / 2;

    CFG.lines.forEach((line, i) => {
      offCtx.fillText(line, textCenterX, startY + i * lineSpacing);
    });

    const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imageData.data;
    const step = Math.max(2, Math.floor(3 * (1 / dpr)));
    const positions = [];

    for (let py = 0; py < offscreen.height; py += step) {
      for (let px = 0; px < offscreen.width; px += step) {
        const idx = (py * offscreen.width + px) * 4;
        if (data[idx] > 128) {
          positions.push({ x: px / dpr, y: py / dpr });
        }
      }
    }
    return positions;
  }

  // ---- Create particles ----
  function createParticles() {
    const positions = sampleTextPositions();
    const colors = getColors();
    particles = [];

    let selected;
    if (positions.length <= CFG.particleCount) {
      selected = positions;
    } else {
      selected = [];
      const ratio = CFG.particleCount / positions.length;
      for (let i = 0; i < positions.length; i++) {
        if (Math.random() < ratio) selected.push(positions[i]);
      }
      while (selected.length < CFG.particleCount && positions.length > 0) {
        selected.push(positions[Math.floor(Math.random() * positions.length)]);
      }
    }

    const spread = Math.min(W, 600) * 0.12;
    for (const pos of selected) {
      particles.push({
        homeX: pos.x,
        homeY: pos.y,
        x: pos.x + (Math.random() - 0.5) * spread,
        y: pos.y + (Math.random() - 0.5) * spread,
        size: CFG.particleSize * (0.6 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.35 + Math.random() * 0.55,
        vx: 0,
        vy: 0,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // ---- Animation Loop ----
  function animate() {
    ctx.clearRect(0, 0, W, H);
    const time = Date.now() * 0.001;

    for (let i = 0, len = particles.length; i < len; i++) {
      const p = particles[i];

      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const radiusSq = CFG.particleMouseRadius * CFG.particleMouseRadius;
        if (distSq < radiusSq) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / CFG.particleMouseRadius) * CFG.particleMouseForce;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      p.vx += (p.homeX - p.x) * CFG.particleReturnSpeed;
      p.vy += (p.homeY - p.y) * CFG.particleReturnSpeed;

      if (!prefersReducedMotion) {
        p.vx += Math.sin(time * 0.7 + p.phase) * CFG.particleDrift * 0.1;
        p.vy += Math.cos(time * 0.5 + p.phase) * CFG.particleDrift * 0.1;
      }

      p.vx *= 0.9;
      p.vy *= 0.9;
      p.x += p.vx;
      p.y += p.vy;

      const a = prefersReducedMotion
        ? p.alpha
        : p.alpha * (0.75 + 0.25 * Math.sin(time * 1.2 + p.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 6.2832);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(animate);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.homeX, p.homeY, p.size, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---- Init ----
  function init() {
    resize();
    createParticles();
    cancelAnimationFrame(animId);
    if (!prefersReducedMotion) {
      animate();
    } else {
      drawStatic();
    }
  }

  // ---- Events ----
  const heroSection = canvas.parentElement;

  heroSection.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });

  heroSection.addEventListener('mouseleave', () => { mouse.active = false; });

  heroSection.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
    mouse.active = true;
  }, { passive: true });

  heroSection.addEventListener('touchend', () => { mouse.active = false; });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 250);
  });

  const themeObserver = new MutationObserver(() => {
    createParticles();
    if (prefersReducedMotion) drawStatic();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  init();
})();
