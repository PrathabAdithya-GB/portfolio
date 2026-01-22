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
    // When theme changes, re-run sketch with new color mapping (if canvas exists)
    const canvas = document.getElementById('sketch-canvas');
    if (canvas && canvas._lastImage) {
      // re-render with same image
      renderSketchFromImage(canvas._lastImage, canvas);
    }
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
// Sobel edge and color posterize, blends with theme-aware edge color.
// Renders into canvas#sketch-canvas, shows progress bar and fades in final image after exactly 3s.
function initSketch(){
  const img = document.getElementById('profile-photo');
  const canvas = document.getElementById('sketch-canvas');
  const bar = document.querySelector('.progress-bar');
  if (!img || !canvas || !bar) return;

  const ctx = canvas.getContext('2d');

  // When called externally to re-render after theme change
  canvas._lastImage = img;

  img.style.opacity = 0; // hide final until ready

  function drawSketchFromImage(){
    renderSketchFromImage(img, canvas);
  }

  if (img.complete && img.naturalWidth !== 0) {
    drawSketchFromImage();
  } else {
    img.addEventListener('load', drawSketchFromImage);
  }
}

// core renderer: given image element and a canvas, compute posterized colored base and edges
function renderSketchFromImage(imgEl, canvas){
  const ctx = canvas.getContext('2d');
  // pick size - keep within max for performance but maintain ratio
  const maxW = 900;
  const w = imgEl.naturalWidth;
  const h = imgEl.naturalHeight;
  const scale = Math.min(1, maxW / Math.max(w, h));
  const dw = Math.max(260, Math.floor(w * scale));
  const dh = Math.floor(h * scale);
  canvas.width = dw;
  canvas.height = dh;

  // draw original scaled
  ctx.clearRect(0,0,dw,dh);
  ctx.drawImage(imgEl, 0, 0, dw, dh);
  const base = ctx.getImageData(0, 0, dw, dh);
  const gray = new Uint8ClampedArray(dw * dh);

  // to grayscale
  for (let i=0, p=0; i<dw*dh; i++, p+=4){
    gray[i] = Math.round(0.299*base.data[p] + 0.587*base.data[p+1] + 0.114*base.data[p+2]);
  }

  // Sobel kernels
  const gx = [-1,0,1,-2,0,2,-1,0,1];
  const gy = [-1,-2,-1,0,0,0,1,2,1];
  const edge = new Float32Array(dw*dh);

  for (let y=1; y<dh-1; y++){
    for (let x=1; x<dw-1; x++){
      let sx=0, sy=0, k=0;
      for (let j=-1; j<=1; j++){
        for (let i=-1; i<=1; i++){
          const idx = (y+j)*dw + (x+i);
          const val = gray[idx];
          sx += val * gx[k];
          sy += val * gy[k];
          k++;
        }
      }
      const v = Math.hypot(sx, sy);
      edge[y*dw + x] = v;
    }
  }

  // normalize edge to 0..1
  let maxE = 0;
  for (let i=0;i<edge.length;i++) if (edge[i] > maxE) maxE = edge[i];
  const invMax = maxE > 0 ? 1 / maxE : 0;

  // decide theme-aware edge color and strength
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  let edgeTint = { r: 255, g: 255, b: 255 }; // default: white edges for dark theme
  let baseBoost = 1.0;
  if (theme === 'light') {
    edgeTint = { r: 24, g: 24, b: 24 }; // darker edges for light theme
    baseBoost = 0.95;
  } else {
    // dark theme: slightly brighten colors while keeping edges strong
    edgeTint = { r: 240, g: 240, b: 240 };
    baseBoost = 1.02;
  }

  // posterize steps: reduce color bands but preserve tones
  const out = ctx.createImageData(dw, dh);
  for (let i=0, p=0; i<dw*dh; i++, p+=4){
    const e = Math.min(1, edge[i] * invMax); // 0..1
    // posterize (quantize) base color into 8 levels
    const pr = Math.floor(base.data[p] / 32) * 32;
    const pg = Math.floor(base.data[p+1] / 32) * 32;
    const pb = Math.floor(base.data[p+2] / 32) * 32;

    // edge shading factor: stronger edges get more tint and darker base
    const edgeFactor = Math.pow(e, 0.9); // emphasize mid-high edges
    const shade = 1 - 0.88 * edgeFactor; // darker at edges

    // base color with slight theme boost
    let r = Math.max(0, Math.min(255, Math.round(pr * shade * baseBoost)));
    let g = Math.max(0, Math.min(255, Math.round(pg * shade * baseBoost)));
    let b = Math.max(0, Math.min(255, Math.round(pb * shade * baseBoost)));

    // blend edge tint onto pixel based on edge strength
    const blend = edgeFactor * 0.95; // how much edge tint overrides
    r = Math.round(r * (1-blend) + edgeTint.r * blend);
    g = Math.round(g * (1-blend) + edgeTint.g * blend);
    b = Math.round(b * (1-blend) + edgeTint.b * blend);

    out.data[p] = r;
    out.data[p+1] = g;
    out.data[p+2] = b;
    out.data[p+3] = 255;
  }

  // put final image into canvas
  ctx.putImageData(out, 0, 0);

  // animate progress bar for exactly 3s and then reveal final photo (fade-in)
  const bar = document.querySelector('.progress-bar');
  const finalImg = document.getElementById('profile-photo');

  if (bar) {
    // reset
    bar.style.transition = 'none';
    bar.style.width = '0%';
    // force layout
    void bar.offsetWidth;
    // animate width for 3000ms
    bar.style.transition = 'width 3s linear';
    bar.style.width = '100%';
  }

  // ensure the final image is visible and placed over canvas after progress
  setTimeout(()=> {
    if (finalImg) {
      finalImg.style.transition = 'opacity 0.8s ease';
      finalImg.classList.add('loaded');
      finalImg.style.opacity = '1';
      // optionally hide the canvas drawing after a moment so user sees final image
      setTimeout(()=> {
        canvas.style.opacity = '0.0';
      }, 500);
      // fade out progress container
      const dp = document.querySelector('.drawing-progress');
      if (dp) dp.style.opacity = '0';
    }
  }, 3000);
}

// Public: call on DOM ready
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










// Scroll Reveal Animation
function scrollReveal() {
  const reveals = document.querySelectorAll(".reveal");

  reveals.forEach((el) => {
    const windowHeight = window.innerHeight;
    const elementTop = el.getBoundingClientRect().top;
    const elementVisible = 120;

    if (elementTop < windowHeight - elementVisible) {
      el.classList.add("show");
    }
  });
}

window.addEventListener("scroll", scrollReveal);
window.addEventListener("load", scrollReveal);
















// ===== EMAILJS CONTACT FORM (FINAL FIX) =====
document.addEventListener("DOMContentLoaded", function () {

  if (typeof emailjs === "undefined") {
    console.error("EmailJS not loaded");
    return;
  }

  emailjs.init("uAUkeK9KfKCVKO9UZ");

  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");

  if (!form || !status) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!name || !email || !message) {
      status.textContent = "❌ Please fill all fields.";
      status.style.color = "#ea4335";
      return;
    }

    status.textContent = "Sending...";
    status.style.color = "#38bdf8";

    emailjs.send(
      "service_zjq6pjv",
      "template_e9aavtg",
      {
        from_name: name,
        reply_to: email,
        message: message
      }
    )
    .then(() => {
      status.textContent = "✅ Message sent successfully!";
      status.style.color = "#2ec866";
      form.reset();
    })
    .catch((error) => {
      status.textContent = "❌ Send failed. See console.";
      status.style.color = "#ea4335";
      console.error("EmailJS Error:", error);
    });
  });

});


