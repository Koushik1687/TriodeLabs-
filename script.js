// ---- safe storage (guards against blocked/disabled localStorage) ----
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
};

// ---- live clock ----
function tick() {
  const el = document.getElementById('clock');
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
tick();
setInterval(tick, 30000);

// ---- theme toggle ----
// Light is the default; users can opt into dark via the toggle (saved in localStorage).
const rootEl = document.documentElement;
const themeToggles = document.querySelectorAll('.theme-toggle');
const initialTheme = storage.get('theme') === 'dark' ? 'dark' : 'light';
rootEl.dataset.theme = initialTheme;
const metaTheme = document.querySelector('meta[name="theme-color"]');
const syncMeta = () => {
  if (metaTheme) metaTheme.setAttribute('content', rootEl.dataset.theme === 'dark' ? '#08080b' : '#f3f3f8');
};
syncMeta();
const setToggleAria = () => themeToggles.forEach(b =>
  b.setAttribute('aria-label', rootEl.dataset.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'));
setToggleAria();
themeToggles.forEach(toggle => toggle.addEventListener('click', () => {
  const next = rootEl.dataset.theme === 'light' ? 'dark' : 'light';
  rootEl.dataset.theme = next;
  storage.set('theme', next);
  setToggleAria();
  syncMeta();
}));

// ---- header on scroll ----
const header = document.getElementById('header');
addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 10), { passive: true });

// ---- mobile menu (right drawer) ----
const burger = document.getElementById('burger');
const menuPanel = document.getElementById('menuPanel');
function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open);
  menuPanel.setAttribute('aria-hidden', String(!open));
}
burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
// close on backdrop click, close button, or any menu link
document.getElementById('menuBackdrop').addEventListener('click', () => setMenu(false));
document.getElementById('menuClose').addEventListener('click', () => setMenu(false));
menuPanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
// close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
});

// ---- scroll reveal ----
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ---- 3D tilt + glare ----
document.querySelectorAll('.tilt').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
    card.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
    card.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
    card.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
  });
  card.addEventListener('mouseleave', () => {
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });
});

// ---- animated counters ----
function animateCount(el) {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const dur = 1300;
  const t0 = performance.now();
  (function step(t) {
    const p = Math.min((t - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
const cio = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); } });
}, { threshold: 0.5 });
document.querySelectorAll('.count').forEach(el => cio.observe(el));

// ---- scrollspy ----
const secs = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav .links a');
const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
secs.forEach(s => spy.observe(s));

// ---- custom cursor ----
if (window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const dot = document.getElementById('cDot');
  const ring = document.getElementById('cRing');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function loop() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    dot.style.transform = 'translate(' + (mx - 3) + 'px,' + (my - 3) + 'px)';
    ring.style.transform = 'translate(' + (rx - 17) + 'px,' + (ry - 17) + 'px)';
    requestAnimationFrame(loop);
  })();
  const interactive = 'a, button, .tilt, .svc-cell, .proc-cell, .quote';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactive)) ring.classList.add('hot');
  });
  // Only cool down when the pointer actually leaves the interactive element,
  // not when moving between its children (avoids flicker).
  document.addEventListener('mouseout', e => {
    if (!e.target.closest(interactive)) return;
    const to = e.relatedTarget;
    if (!to || !to.closest || !to.closest(interactive)) ring.classList.remove('hot');
  });
}

// ---- contact form (composes a pre-filled email) ----
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(contactForm);
    const name = String(f.get('name') || '').trim();
    const email = String(f.get('email') || '').trim();
    const budget = String(f.get('budget') || '').trim();
    const msg = String(f.get('message') || '').trim();
    const subject = encodeURIComponent('Project inquiry from ' + name);
    const lines = ['Name: ' + name, 'Email: ' + email, 'Budget: ' + (budget || 'Not specified')];
    if (msg) lines.push('', msg);
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = 'mailto:hello@triostudio.dev?subject=' + subject + '&body=' + body;
  });
}

// ---- back to top ----
const toTop = document.getElementById('toTop');
addEventListener('scroll', () => toTop.classList.toggle('show', scrollY > 600), { passive: true });
toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
