// ===== Theme on all pages =====
function setInitialTheme(){
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (prefersDarkScheme.matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}
function initThemeToggle(){
  const btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

// ===== Mobile nav & active link =====
function initMobileNav(){
  const toggle = document.querySelector('.nav__toggle');
  const mobile = document.getElementById('mobileMenu');
  if (!toggle || !mobile) return;
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    mobile.hidden = expanded;
  });
  mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    mobile.hidden = true;
  }));
}
function highlightActiveNav(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a, .nav__mobile a').forEach(a => {
    const href = a.getAttribute('href'); if (!href) return;
    const file = href.replace('./','');
    if ((path === 'index.html' && file === 'index.html') || (file === path) || (path === '' && file === 'index.html'))
      a.classList.add('active');
  });
}

// ===== Utilities =====
function initYear(){ const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear(); }
function initContactForm(){
  const form = document.getElementById('contactForm'); if (!form) return;
  form.addEventListener('submit', (e)=>{ e.preventDefault(); alert('Thanks! This is a static demo.'); form.reset(); });
}

// ===== Rotating words every 5s =====
function initRotatingText(){
  const el = document.getElementById('rotating-text'); if (!el) return;
  const words = ['smooth.', 'responsive.', 'user-friendly.', 'animated.', 'modern.'];
  let i = 0;
  setInterval(()=>{
    el.style.opacity = '0'; el.style.transform = 'translateY(8px)';
    setTimeout(()=>{ i=(i+1)%words.length; el.textContent = words[i]; el.style.opacity='1'; el.style.transform='translateY(0)'; }, 300);
  }, 5000);
}

// ===== Color-accurate sketch (3s) =====
function initSketch(){
  const img = document.getElementById('profile-photo');
  const canvas = document.getElementById('sketch-canvas');
  const bar = document.querySelector('.progress-bar');
  if (!img || !canvas || !bar) return;
  const ctx = canvas.getContext('2d');

  function drawSketch(){
    const w = img.naturalWidth, h = img.naturalHeight;
    const maxW = 880, scale = Math.min(1, maxW / w);
    const dw = Math.max(320, Math.floor(w*scale)), dh = Math.floor(h*scale);
    canvas.width = dw; canvas.height = dh;

    // Draw full-color image for base
    ctx.drawImage(img, 0, 0, dw, dh);
    const base = ctx.getImageData(0, 0, dw, dh);
    const gray = new Uint8ClampedArray(dw*dh);

    // Grayscale for edges
    for (let i=0, p=0; i<dw*dh; i++, p+=4){
      gray[i] = 0.299*base.data[p] + 0.587*base.data[p+1] + 0.114*base.data[p+2];
    }

    // Sobel edges
    const gx = [-1,0,1,-2,0,2,-1,0,1], gy = [-1,-2,-1,0,0,0,1,2,1];
    const edge = new Float32Array(dw*dh);
    for (let y=1; y<dh-1; y++){
      for (let x=1; x<dw-1; x++){
        let sx=0, sy=0, k=0;
        for (let j=-1; j<=1; j++) for (let i=-1; i<=1; i++){
          const idx=(y+j)*dw+(x+i); const val = gray[idx];
          sx += val*gx[k]; sy += val*gy[k]; k++;
        }
        edge[y*dw+x] = Math.min(255, Math.hypot(sx, sy));
      }
    }

    // Convert to a color sketch: darken along edges; lightly posterize colors for a drawn feel
    const out = ctx.createImageData(dw, dh);
    for (let i=0, p=0; i<dw*dh; i++, p+=4){
      const e = edge[i]/255;                // 0..1
      const shade = 1 - 0.85*e;             // darker at edges
      // Posterize base color slightly (reduce banding; keeps your color tones)
      const pr = Math.round(base.data[p]/16)*16;
      const pg = Math.round(base.data[p+1]/16)*16;
      const pb = Math.round(base.data[p+2]/16)*16;
      out.data[p]   = Math.max(0, Math.min(255, pr * shade));
      out.data[p+1] = Math.max(0, Math.min(255, pg * shade));
      out.data[p+2] = Math.max(0, Math.min(255, pb * shade));
      out.data[p+3] = 255;
    }
    ctx.putImageData(out, 0, 0);

    // Animate progress to 100% over exactly 3s, then reveal photo
    requestAnimationFrame(()=>{ bar.style.width='100%'; });
    setTimeout(()=>{
      img.classList.add('loaded');
      setTimeout(()=>{ const dp=document.querySelector('.drawing-progress'); if (dp) dp.style.opacity='0'; }, 400);
    }, 3000);
  }

  if (img.complete){ drawSketch(); } else { img.addEventListener('load', drawSketch); }
}

document.addEventListener('DOMContentLoaded', ()=>{
  setInitialTheme();
  initThemeToggle();
  initMobileNav();
  highlightActiveNav();
  initYear();
  initContactForm();
  initRotatingText();
  initSketch();
});
