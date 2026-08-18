function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

const BASE_STYLE = `
:root{--navy:#0b1f33;--navy-deep:#081221;--cyan:#0ea5e9;--amber:#f2a03d;--cream:#f7f4ef;--ink:#1c1c1c;--muted:#5a6472;--border:#e2e0da;--font:"Segoe UI",system-ui,-apple-system,sans-serif;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:var(--font);background:var(--cream);color:var(--ink);min-height:100vh;}
a{color:inherit;}
.topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:14px 5vw;background:rgba(8,18,33,0.97);backdrop-filter:blur(8px);gap:12px;}
.topbar__brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:#fff;font-weight:800;flex-shrink:0;}
.topbar__brand span.mark{color:var(--cyan);font-size:1.2rem;}
.topbar__brand span.n360{color:var(--cyan);}
.topbar__actions{display:flex;gap:10px;align-items:center;}
.btn{display:inline-block;padding:10px 18px;border-radius:999px;font-weight:700;font-size:0.85rem;text-decoration:none;border:1.5px solid transparent;cursor:pointer;font-family:inherit;}
.btn--primary{background:var(--cyan);color:#04141f;}
.btn--ghost{border-color:rgba(255,255,255,0.4);color:#fff;background:none;}
.btn--block{width:100%;text-align:center;}
.btn--small{padding:7px 14px;font-size:0.78rem;}
.linklike{background:none;border:none;color:var(--cyan);font-weight:600;cursor:pointer;font-size:inherit;font-family:inherit;padding:0;}
.wrap{max-width:1100px;margin:0 auto;padding:6vh 5vw;}
.wrap--narrow{max-width:560px;}
.wrap--wide{max-width:1300px;}
.eyebrow{display:inline-block;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--cyan);font-weight:700;margin-bottom:10px;}
h1{font-size:clamp(1.5rem,3vw,2.1rem);color:var(--navy);margin-bottom:8px;}
p.lead{color:var(--muted);margin-bottom:28px;}
.back{display:block;margin-bottom:16px;color:var(--cyan);text-decoration:none;font-size:0.85rem;font-weight:600;}

.punto-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.punto-card{background:#fff;border:1px solid var(--border);border-radius:16px;overflow:hidden;text-decoration:none;color:inherit;display:block;transition:transform .15s ease;}
.punto-card:hover{transform:translateY(-2px);}
.punto-card__thumb{aspect-ratio:4/3;background:linear-gradient(160deg,var(--navy),var(--navy-deep));display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);font-size:2rem;overflow:hidden;}
.punto-card__thumb img{width:100%;height:100%;object-fit:cover;}
.punto-card__body{padding:14px 16px;}
.punto-card__name{font-weight:700;color:var(--navy);font-size:1rem;margin-bottom:4px;}
.punto-card__meta{font-size:0.8rem;color:var(--muted);}
.empty{background:#fff;border:1px dashed var(--border);border-radius:16px;padding:40px;text-align:center;color:var(--muted);}
.empty a{color:var(--cyan);font-weight:700;text-decoration:none;}

.registro{background:#fff;border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:18px;}
.registro__head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;flex-wrap:wrap;gap:8px;}
.registro__fecha{font-weight:800;color:var(--navy);}
.registro__nota{color:var(--muted);font-size:0.92rem;margin-bottom:14px;}
.registro__media{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;}
.registro__media img,.registro__media video{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;background:#000;}
.registro__media video{aspect-ratio:16/9;object-fit:contain;}
.registro__media img{cursor:zoom-in;}

.lightbox{position:fixed;inset:0;background:rgba(4,10,18,0.94);z-index:200;display:none;align-items:center;justify-content:center;padding:50px;}
.lightbox.lightbox--open{display:flex;}
.lightbox__img{max-width:90vw;max-height:82vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.5);}
.lightbox__close{position:absolute;top:18px;right:22px;background:rgba(255,255,255,0.1);border:none;color:#fff;font-size:1.3rem;width:40px;height:40px;border-radius:50%;cursor:pointer;line-height:1;}
.lightbox__close:hover{background:rgba(255,255,255,0.2);}
.lightbox__nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.1);border:none;color:#fff;font-size:1.8rem;width:48px;height:48px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.lightbox__nav:hover{background:rgba(255,255,255,0.2);}
.lightbox__nav--prev{left:16px;}
.lightbox__nav--next{right:16px;}
.lightbox__count{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.7);font-size:0.8rem;}
@media (max-width:640px){.lightbox{padding:16px;}.lightbox__nav{width:40px;height:40px;font-size:1.4rem;}}

label{display:block;font-size:0.82rem;font-weight:700;color:var(--navy);margin-bottom:6px;margin-top:16px;}
input,select,textarea{width:100%;border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-family:inherit;font-size:0.92rem;background:#fff;}
textarea{resize:vertical;}
.hint{font-size:0.76rem;color:var(--muted);margin-top:4px;}
.card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 20px 50px -20px rgba(0,0,0,0.15);}
.status{margin-top:14px;font-size:0.85rem;text-align:center;}
.status--error{color:#b5453f;}
.status--ok{color:var(--cyan);}

.plano-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:18px;}
.plano-stage{position:relative;background:#000;border-radius:16px;overflow:hidden;line-height:0;cursor:crosshair;user-select:none;}
.plano-stage img{width:100%;display:block;pointer-events:none;}
.plano-stage.placing{cursor:cell;}
.pin{
  position:absolute;transform:translate(-50%,-100%);
  display:flex;flex-direction:column;align-items:center;
  text-decoration:none;color:#fff;
}
.pin__dot{
  width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
  background:var(--cyan);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);
}
.pin__label{
  margin-top:2px;background:rgba(8,18,33,0.85);color:#fff;font-size:0.68rem;font-weight:700;
  padding:2px 8px;border-radius:999px;white-space:nowrap;
}
.plano-stage.moving{cursor:cell;}
.plano-stage.removing{cursor:not-allowed;}
.pin--moving .pin__dot{background:#fff;box-shadow:0 0 0 4px rgba(14,165,233,0.55),0 2px 6px rgba(0,0,0,0.4);animation:pin-pulse 1s ease-in-out infinite;}
.pin--moving .pin__label{background:var(--cyan);color:#04141f;}
@keyframes pin-pulse{0%,100%{transform:rotate(-45deg) scale(1);}50%{transform:rotate(-45deg) scale(1.3);}}
.pin-picker{
  position:fixed;inset:0;background:rgba(8,18,33,0.6);display:flex;align-items:center;justify-content:center;
  z-index:50;padding:20px;
}
.pin-picker__card{background:#fff;border-radius:16px;padding:22px;max-width:360px;width:100%;}
.pin-picker__card h3{color:var(--navy);margin-bottom:14px;font-size:1.05rem;}
.unplaced-list{display:flex;flex-direction:column;gap:8px;margin-top:24px;}
.unplaced-item{background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:0.88rem;color:var(--navy);}

.plano-layout{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;align-items:start;}
.plano-stage-col{min-width:0;}
.pin--active .pin__dot{background:var(--amber);box-shadow:0 0 0 4px rgba(242,160,61,0.35),0 2px 6px rgba(0,0,0,0.4);}
.pin--active .pin__label{background:var(--amber);color:#04141f;}
.plano-detail{background:#fff;border:1px solid var(--border);border-radius:16px;padding:22px;position:sticky;top:90px;max-height:calc(100vh - 110px);overflow-y:auto;}
.plano-detail__empty{color:var(--muted);font-size:0.9rem;text-align:center;padding:30px 10px;}
.plano-detail__head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.plano-detail__head h2{font-size:1.15rem;color:var(--navy);}
.plano-detail .registro{padding:14px;margin-bottom:12px;}
.plano-detail .registro__media{grid-template-columns:repeat(auto-fill,minmax(100px,1fr));}
.week-bars{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px;}
.week-bar{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:3px;background:var(--navy-deep);color:rgba(255,255,255,0.75);border:none;border-radius:10px;padding:10px 14px;cursor:pointer;font-family:inherit;min-width:60px;transition:transform .1s ease;}
.week-bar:hover{transform:translateY(-2px);}
.week-bar__label{font-size:0.78rem;font-weight:800;}
.week-bar__count{font-size:0.66rem;color:rgba(255,255,255,0.55);white-space:nowrap;}
.week-bar--active{background:linear-gradient(160deg,var(--cyan),#0284c7);color:#04141f;}
.week-bar--active .week-bar__count{color:rgba(4,20,31,0.7);}
@media (max-width:860px){
  .plano-layout{grid-template-columns:1fr;}
  .plano-detail{position:static;max-height:none;}
}
`;

function shell(title, body) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | RadarObra360</title>
<meta name="robots" content="noindex, nofollow">
<style>${BASE_STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function topbar() {
  return `<header class="topbar">
    <a href="/app" class="topbar__brand"><span class="mark">◎</span>RadarObra<span class="n360">360</span></a>
    <div class="topbar__actions">
      <a href="/app/plano" class="btn btn--ghost">🗺️ Plano</a>
      <a href="/app/registrar" class="btn btn--primary">＋ Registrar</a>
    </div>
  </header>`;
}

// Full-screen photo viewer with prev/next. Shared markup + script so every
// page that renders .registro__media photos gets the same behavior: click a
// photo -> open it enlarged, arrows (or ←/→ keys) move through the photos
// currently on screen. Videos keep their own native controls, not included.
function lightboxMarkup() {
  return `
    <div class="lightbox" id="lightbox">
      <button type="button" class="lightbox__close" id="lightboxClose" aria-label="Cerrar">✕</button>
      <button type="button" class="lightbox__nav lightbox__nav--prev" id="lightboxPrev" aria-label="Anterior">‹</button>
      <img class="lightbox__img" id="lightboxImg" src="" alt="Foto ampliada">
      <button type="button" class="lightbox__nav lightbox__nav--next" id="lightboxNext" aria-label="Siguiente">›</button>
      <div class="lightbox__count" id="lightboxCount"></div>
    </div>`;
}

function lightboxScript() {
  return `
    (function () {
      const lightbox = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightboxImg');
      const lightboxClose = document.getElementById('lightboxClose');
      const lightboxPrev = document.getElementById('lightboxPrev');
      const lightboxNext = document.getElementById('lightboxNext');
      const lightboxCount = document.getElementById('lightboxCount');
      let galleryIds = [];
      let galleryIndex = 0;

      function showLightboxImage() {
        lightboxImg.src = '/app/media?id=' + galleryIds[galleryIndex];
        lightboxCount.textContent = (galleryIndex + 1) + ' / ' + galleryIds.length;
        const multi = galleryIds.length > 1;
        lightboxPrev.style.display = multi ? 'flex' : 'none';
        lightboxNext.style.display = multi ? 'flex' : 'none';
      }

      window.openLightbox = function (ids, index) {
        galleryIds = ids;
        galleryIndex = index;
        showLightboxImage();
        lightbox.classList.add('lightbox--open');
      };

      function closeLightbox() { lightbox.classList.remove('lightbox--open'); }

      lightboxClose.addEventListener('click', closeLightbox);
      lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
      lightboxPrev.addEventListener('click', function () {
        galleryIndex = (galleryIndex - 1 + galleryIds.length) % galleryIds.length;
        showLightboxImage();
      });
      lightboxNext.addEventListener('click', function () {
        galleryIndex = (galleryIndex + 1) % galleryIds.length;
        showLightboxImage();
      });
      document.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('lightbox--open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') lightboxPrev.click();
        if (e.key === 'ArrowRight') lightboxNext.click();
      });

      window.attachLightbox = function (container) {
        (container || document).querySelectorAll('.lightbox-trigger').forEach(function (img) {
          img.addEventListener('click', function () {
            const all = Array.prototype.slice.call((container || document).querySelectorAll('.lightbox-trigger'));
            const ids = all.map(function (el) { return el.dataset.mediaId; });
            window.openLightbox(ids, all.indexOf(img));
          });
        });
      };
    })();
  `;
}

module.exports = { esc, shell, topbar, lightboxMarkup, lightboxScript };
