(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMQ = window.matchMedia('(max-width: 767px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -4% 0px' });
    revealEls.forEach(el => io.observe(el));
    // Safety net: anything already on screen shows even if observer callbacks are delayed.
    setTimeout(() => {
      revealEls.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
      });
    }, 400);
  }

  /* ---------- Mobile menu ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  /* ---------- Floating contact button ---------- */
  const fab = document.getElementById('fab');
  const fabToggle = fab.querySelector('.fab-toggle');
  const setFab = open => {
    fab.classList.toggle('open', open);
    fabToggle.setAttribute('aria-expanded', String(open));
  };
  fabToggle.addEventListener('click', () => {
    const open = !fab.classList.contains('open');
    setFab(open);
    if (open) fab.querySelector('.fab-item').focus({ preventScroll: true });
  });
  fab.addEventListener('click', e => { if (e.target.closest('.fab-item')) setFab(false); });
  document.addEventListener('click', e => { if (!fab.contains(e.target)) setFab(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && fab.classList.contains('open')) {
      setFab(false);
      fabToggle.focus();
    }
  });

  /* ---------- Partner map: pins drop in; cards and pins highlight each other ---------- */
  const pmap = document.querySelector('.pmap');
  if (pmap) {
    const pins = [...pmap.querySelectorAll('.pin')];
    const cards = [...document.querySelectorAll('.pcard')];
    const drop = () => pmap.classList.add('dropped');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) drop();
    else {
      const mio = new IntersectionObserver(es => {
        if (es.some(e => e.isIntersecting)) { drop(); mio.disconnect(); }
      }, { threshold: 0.3 });
      mio.observe(pmap);
    }
    const setActive = id => {
      pins.forEach(p => {
        const on = p.dataset.place === id;
        if (on && !p.classList.contains('active')) {
          p.classList.remove('ping');
          void p.offsetWidth;
          p.classList.add('ping');
        }
        p.classList.toggle('active', on);
      });
      cards.forEach(c => c.classList.toggle('active', c.dataset.place === id));
    };
    cards.forEach(c => {
      c.addEventListener('mouseenter', () => setActive(c.dataset.place));
      c.addEventListener('focus', () => setActive(c.dataset.place));
      c.addEventListener('click', () => {
        setActive(c.dataset.place);
        // On phones the map scrolls away above the list; bring it back into view.
        if (mobileMQ.matches) pmap.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
      });
      c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } });
    });
    document.querySelector('.plist').addEventListener('mouseleave', () => setActive(null));
    pins.forEach(p => {
      p.addEventListener('click', () => {
        setActive(p.dataset.place);
        const card = cards.find(c => c.dataset.place === p.dataset.place);
        if (card && mobileMQ.matches) card.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
      });
      p.addEventListener('mouseenter', () => setActive(p.dataset.place));
    });
  }

  /* ---------- Flavors: category chips filter the list ---------- */
  const flvGroups = document.querySelector('.flv-groups');
  if (flvGroups) {
    const chips = [...document.querySelectorAll('.flv-chip')];
    const groups = [...flvGroups.querySelectorAll('.flv-group')];
    const showCat = cat => {
      chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.cat === cat)));
      groups.forEach(g => { g.hidden = cat !== 'all' && g.dataset.cat !== cat; });
      flvGroups.classList.remove('swap');
      void flvGroups.offsetWidth;
      flvGroups.classList.add('swap');
    };
    chips.forEach(c => c.addEventListener('click', () => {
      showCat(c.dataset.cat);
      c.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    }));
    // A best-seller photo links to its card; make sure that card's category is showing.
    document.querySelectorAll('.fb-link').forEach(a => a.addEventListener('click', () => {
      const card = document.querySelector(a.getAttribute('href'));
      const group = card && card.closest('.flv-group');
      if (group && group.hidden) showCat('all');
    }));
  }

  /* ---------- Active section in menu ---------- */
  const navLinks = [...nav.querySelectorAll('a')];
  const sections = navLinks.map(a => document.querySelector(a.getAttribute('href')));
  const markActive = () => {
    const line = window.innerHeight * 0.35;
    let current = null;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= line) current = i; });
    navLinks.forEach((a, i) => {
      if (i === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  /* ---------- Lightbox ---------- */
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('.lb-img');
  let lastTrigger = null;
  document.querySelectorAll('.zoom').forEach(btn => {
    btn.addEventListener('click', () => {
      const img = btn.querySelector('img');
      lastTrigger = btn;
      lbImg.src = btn.dataset.full;
      lbImg.width = btn.dataset.w;
      lbImg.height = btn.dataset.h;
      lbImg.alt = img ? img.alt : '';
      document.body.classList.add('lb-open');
      lb.showModal();
    });
  });
  const stage = lb.querySelector('.lb-stage');
  const ZOOM = 2.5;
  const unzoom = () => {
    stage.classList.remove('zoomed');
    lbImg.style.width = '';
  };
  // Tap/click the image to zoom in at that spot; tap again to fit the screen.
  let down = null;
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    down = [e.clientX, e.clientY];
    if (e.pointerType === 'mouse' && stage.classList.contains('zoomed')) {
      drag = [e.clientX, e.clientY, stage.scrollLeft, stage.scrollTop];
      stage.setPointerCapture(e.pointerId);
    }
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    stage.scrollLeft = drag[2] - (e.clientX - drag[0]);
    stage.scrollTop = drag[3] - (e.clientY - drag[1]);
  });
  stage.addEventListener('pointerup', () => { drag = null; });
  stage.addEventListener('click', e => {
    const moved = down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8;
    if (moved) return;
    if (e.target !== lbImg) {
      if (!stage.classList.contains('zoomed')) lb.close();
      else unzoom();
      return;
    }
    if (stage.classList.contains('zoomed')) {
      unzoom();
      return;
    }
    const r = lbImg.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    const w = r.width * ZOOM;
    stage.classList.add('zoomed');
    lbImg.style.width = w + 'px';
    const h = r.height * ZOOM;
    stage.scrollLeft = fx * w - stage.clientWidth / 2;
    stage.scrollTop = fy * h - stage.clientHeight / 2;
  });
  lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
  lb.addEventListener('close', () => {
    document.body.classList.remove('lb-open');
    unzoom();
    lbImg.removeAttribute('src');
    if (lastTrigger) lastTrigger.focus();
  });

  /* ---------- Package card tilt ---------- */
  document.querySelectorAll('.pkg-card').forEach(card => {
    const tilt = card.querySelector('.tilt');
    card.addEventListener('pointermove', e => {
      if (!finePointer.matches || reduceMotion.matches || e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add('tilting');
      tilt.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('tilting');
      tilt.style.setProperty('--ry', '0deg');
      tilt.style.setProperty('--rx', '0deg');
    });
  });

  /* ---------- Scoops ---------- */
  const FLAVORS = [
    ['#6B3E26', '#4A2817', '#8A5638'],   // chocolate
    ['#F59BB0', '#E0728D', '#FFC3D0'],   // strawberry
    ['#B5D38A', '#8DB25E', '#D3E8B3'],   // pistachio
    ['#FFF3D6', '#E8C98E', '#FFFFFF'],   // vanilla
    ['#FFB547', '#F08A12', '#FFD08A'],   // mango
    ['#A9A6E8', '#8582CF', '#CBC9F5'],   // blueberry
    ['#F6861A', '#D96A00', '#FFAE5C'],   // sunset orange
  ];
  const DOTS = ['#FFFFFF', '#F6861A', '#4A2817', '#E0728D', '#8DB25E', '#8582CF'];
  let flavorIx = Math.floor(Math.random() * FLAVORS.length);

  function scoopSVG(f) {
    const [base, shade, light] = f;
    let dots = '';
    for (let i = 0; i < 5; i++) {
      const x = 22 + Math.random() * 56;
      const y = 22 + Math.random() * 34;
      const r = Math.round(Math.random() * 180);
      const c = DOTS[Math.floor(Math.random() * DOTS.length)];
      dots += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="9" height="3.4" rx="1.7" fill="${c}" transform="rotate(${r} ${(x + 4.5).toFixed(1)} ${(y + 1.7).toFixed(1)})"/>`;
    }
    return `<svg viewBox="0 0 100 92" focusable="false">` +
      `<path d="M50 4C76 4 94 22 94 46c0 8-2 14-5 18 4 2 6 6 5 10-1 5-7 7-11 4-2 5-8 7-12 3-3 5-10 6-14 2-4 4-11 3-14-2-4 4-10 3-12-2-5 3-11 1-12-4-1-4 1-8 5-10-3-4-5-10-5-18C6 22 24 4 50 4z" fill="${base}" stroke="${shade}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M12 62c10 8 24 10 38 10s28-2 38-10" fill="none" stroke="${shade}" stroke-width="3" stroke-linecap="round" opacity=".55"/>` +
      `<ellipse cx="34" cy="24" rx="12" ry="7" fill="${light}" opacity=".85" transform="rotate(-25 34 24)"/>` +
      dots + `</svg>`;
  }

  function makeScoop(className) {
    const el = document.createElement('div');
    el.className = className ? 'scoop ' + className : 'scoop';
    el.innerHTML = scoopSVG(FLAVORS[flavorIx++ % FLAVORS.length]);
    return el;
  }

  const SPRINKLE_COLORS = ['#F6861A', '#FFFFFF', '#FFB566', '#A94700', '#F59BB0', '#B5D38A'];
  function burst(host, x, y, allRound) {
    const n = 26;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'sprinkle';
      const angle = allRound
        ? (Math.PI * 2 * i) / n + Math.random() * 0.3
        : Math.PI + (Math.PI * i) / (n - 1) + (Math.random() - 0.5) * 0.3;
      const dist = 60 + Math.random() * 80;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--x', (Math.cos(angle) * dist).toFixed(1) + 'px');
      s.style.setProperty('--y', (Math.sin(angle) * dist * 0.85).toFixed(1) + 'px');
      s.style.setProperty('--r', Math.round(Math.random() * 540 - 270) + 'deg');
      s.style.setProperty('--c', SPRINKLE_COLORS[i % SPRINKLE_COLORS.length]);
      s.style.animationDelay = Math.round(Math.random() * 90) + 'ms';
      s.addEventListener('animationend', () => s.remove());
      host.appendChild(s);
    }
  }

  /* Falling scoops: dropped from the top of the screen while scrolling down */
  const layer = document.querySelector('.scoop-layer');
  const falling = [];
  let lastScroll = window.scrollY;
  let scrollAcc = 0;
  let running = false;
  let lastT = 0;

  function spawn(xHint, yHint) {
    const mobile = mobileMQ.matches;
    if (falling.length >= (mobile ? 9 : 18)) return;
    const size = mobile ? 34 + Math.random() * 24 : 48 + Math.random() * 46;
    const w = window.innerWidth;
    let x;
    if (xHint != null) x = xHint;
    else if (!mobile && Math.random() < 0.35) x = w / 2 + (Math.random() - 0.5) * 80;   // centre lane
    else x = Math.random() * w;
    const el = makeScoop();
    el.style.width = size.toFixed(0) + 'px';
    layer.appendChild(el);
    const tapped = yHint != null;
    falling.push({
      el, size,
      x: x - size / 2,
      y: tapped ? yHint - size / 2 : -size - Math.random() * 40,
      vx: (Math.random() - 0.5) * (tapped ? 160 : 40),
      vy: tapped ? -380 - Math.random() * 120 : 80 + Math.random() * 120,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 160,
    });
    if (!running) {
      running = true;
      lastT = performance.now();
      requestAnimationFrame(step);
    }
  }

  function step(t) {
    const dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000));
    lastT = t;
    const h = window.innerHeight;
    for (let i = falling.length - 1; i >= 0; i--) {
      const s = falling[i];
      s.vy += 900 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
      if (s.y > h + 20) {
        s.el.remove();
        falling.splice(i, 1);
        continue;
      }
      s.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0) rotate(${s.rot.toFixed(1)}deg)`;
    }
    if (falling.length) requestAnimationFrame(step);
    else running = false;
  }

  function onScrollScoops() {
    const y = window.scrollY;
    const delta = y - lastScroll;
    lastScroll = y;
    if (reduceMotion.matches) return;
    // Scoops already in the air drift with the page a little.
    falling.forEach(s => { s.y -= delta * 0.18; });
    if (delta <= 0) { scrollAcc = 0; return; }
    scrollAcc += delta;
    const every = mobileMQ.matches ? 220 : 120;
    while (scrollAcc >= every) {
      spawn();
      scrollAcc -= every;
    }
  }

  /* Cone before the contact section: one scoop per section passed */
  const cone = document.querySelector('.cone-catch');
  const stack = cone.querySelector('.stack');
  const milestones = ['about', 'wholesale', 'packages', 'catering'].map(id => document.getElementById(id));
  const stacked = [];

  function targetCount() {
    if (reduceMotion.matches) return milestones.length;
    const vh = window.innerHeight;
    let n = 0;
    milestones.forEach((sec, i) => {
      if (sec.getBoundingClientRect().top < vh * 0.5) n = i + 1;
    });
    return n;
  }

  function updateCone() {
    const n = targetCount();
    const animate = !reduceMotion.matches;
    while (stacked.length < n) {
      const el = makeScoop(animate ? 'drop-in' : '');
      const i = stacked.length;
      const tilt = (i % 2 ? 1 : -1) * (3 + Math.random() * 4);
      el.style.bottom = `calc(var(--cone-w) * ${(i * 0.52).toFixed(2)})`;
      el.style.zIndex = String(10 + i);
      el.style.setProperty('--r1', tilt.toFixed(1) + 'deg');
      el.style.setProperty('--r0', (Math.random() * 60 - 30).toFixed(0) + 'deg');
      if (!animate) el.style.transform = `rotate(${tilt.toFixed(1)}deg)`;
      stack.appendChild(el);
      stacked.push(el);
      if (animate && stacked.length === milestones.length) {
        setTimeout(() => {
          if (!el.isConnected) return;
          cone.classList.remove('full');
          void cone.offsetWidth;
          cone.classList.add('full');
          const coneBox = cone.getBoundingClientRect();
          const scoopBox = el.getBoundingClientRect();
          burst(cone, coneBox.width / 2, scoopBox.top - coneBox.top + scoopBox.height * 0.35);
        }, 450);
      }
    }
    while (stacked.length > n) {
      const el = stacked.pop();
      if (animate) {
        el.classList.remove('drop-in');
        el.classList.add('pop-out');
        el.addEventListener('animationend', () => el.remove(), { once: true });
      } else {
        el.remove();
      }
    }
  }

  /* Tap an empty spot: pop a falling scoop into sprinkles, or toss a new one */
  const BUSY = 'a, button, input, label, dialog, .site-header, .fab, .pmap-card, .col-text, .hero-copy, .hero-media, ' +
    '.pkg-card, .gallery, .contact-links, .frame, .photo-strip, .site-footer, .flavors-box';
  document.addEventListener('click', e => {
    if (reduceMotion.matches || e.button !== 0 || e.target.closest(BUSY)) return;
    if (window.getSelection && String(window.getSelection())) return;
    const x = e.clientX, y = e.clientY;
    for (let i = falling.length - 1; i >= 0; i--) {
      const s = falling[i];
      const cx = s.x + s.size / 2, cy = s.y + s.size * 0.46, r = s.size * 0.55;
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        s.el.remove();
        falling.splice(i, 1);
        burst(layer, cx, cy, true);
        return;
      }
    }
    spawn(x, y);
  });

  /* ---------- Sunset sky ---------- */
  const sky = document.querySelector('.sky');
  const SKY = [
    [0.00, '#FFF8EF', '#FFEBD6'],
    [0.40, '#FFF1DE', '#FFD8B0'],
    [0.75, '#FFE0BD', '#FFB892'],
    [1.00, '#FFCFA3', '#FF9C80'],
  ];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => 'rgb(' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t)).join(',') + ')';
  function updateSky() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    let k = 0;
    while (k < SKY.length - 2 && p > SKY[k + 1][0]) k++;
    const [p0, t0, b0] = SKY[k];
    const [p1, t1, b1] = SKY[k + 1];
    const t = (p - p0) / (p1 - p0);
    sky.style.setProperty('--sky-top', mix(t0, t1, t));
    sky.style.setProperty('--sky-bot', mix(b0, b1, t));
    if (!reduceMotion.matches) {
      sky.style.setProperty('--sun-y', (6 + p * 62).toFixed(1) + 'vh');
      sky.style.setProperty('--sun-o', (0.5 + p * 0.4).toFixed(2));
    }
  }

  /* ---------- Hero doodles follow the mouse; sprinkle trail ---------- */
  const hero = document.querySelector('.hero');
  const trailLayer = document.querySelector('.trail-layer');
  let lastTrail = null;
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !finePointer.matches || reduceMotion.matches) return;
    const hr = hero.getBoundingClientRect();
    if (e.clientY < hr.bottom) {
      hero.style.setProperty('--mx', ((e.clientX / window.innerWidth) - 0.5).toFixed(3));
      hero.style.setProperty('--my', (((e.clientY - hr.top) / hr.height) - 0.5).toFixed(3));
    }
    if (lastTrail && Math.hypot(e.clientX - lastTrail[0], e.clientY - lastTrail[1]) < 18) return;
    lastTrail = [e.clientX, e.clientY];
    if (trailLayer.childElementCount > 40) return;
    const s = document.createElement('span');
    s.className = 'trail';
    s.style.left = e.clientX + 'px';
    s.style.top = e.clientY + 'px';
    s.style.setProperty('--c', SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)]);
    s.style.setProperty('--r', Math.round(Math.random() * 180) + 'deg');
    s.style.setProperty('--dx', Math.round(Math.random() * 24 - 12) + 'px');
    s.addEventListener('animationend', () => s.remove());
    trailLayer.appendChild(s);
  }, { passive: true });

  let ticking = false;
  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        onScrollScoops();
        updateCone();
        updateSky();
        markActive();
      });
    }
  };
  window.addEventListener('resize', updateSky);

  window.addEventListener('scroll', requestUpdate, { passive: true });
  reduceMotion.addEventListener('change', updateCone);

  // A small welcome shower in the hero.
  if (!reduceMotion.matches) {
    const w = window.innerWidth;
    [0.12, 0.5, 0.88, 0.3, 0.7].forEach((f, i) => setTimeout(() => spawn(w * f), 300 + i * 220));
  }
  updateCone();
  updateSky();
  markActive();
})();
