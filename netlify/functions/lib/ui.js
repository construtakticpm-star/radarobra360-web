function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

const BASE_STYLE = `
:root{--navy:#1b2a41;--navy-deep:#0d1622;--cyan:#e8590c;--amber:#c9a227;--cream:#c2ccd6;--ink:#182430;--muted:#5a6774;--border:#a9b7c2;--font:"Oswald","Segoe UI",system-ui,-apple-system,sans-serif;--font-hud:"Orbitron","Oswald",monospace;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:var(--font);background:var(--cream);color:var(--ink);min-height:100vh;}
body.radar-bg{
  background-color:var(--cream);
  background-image:url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0MDAnIGhlaWdodD0nNDAwJz4KPHJlY3Qgd2lkdGg9JzQwMCcgaGVpZ2h0PSc0MDAnIGZpbGw9J25vbmUnLz4KPGNpcmNsZSBjeD0nMjAwJyBjeT0nMjAwJyByPSc1MCcgZmlsbD0nbm9uZScgc3Ryb2tlPSdyZ2JhKDI3LDQyLDY1LDAuMjgpJyBzdHJva2Utd2lkdGg9JzEuNScvPgo8Y2lyY2xlIGN4PScyMDAnIGN5PScyMDAnIHI9JzEwMCcgZmlsbD0nbm9uZScgc3Ryb2tlPSdyZ2JhKDI3LDQyLDY1LDAuMjQpJyBzdHJva2Utd2lkdGg9JzEuNScvPgo8Y2lyY2xlIGN4PScyMDAnIGN5PScyMDAnIHI9JzE1MCcgZmlsbD0nbm9uZScgc3Ryb2tlPSdyZ2JhKDI3LDQyLDY1LDAuMjApJyBzdHJva2Utd2lkdGg9JzEuNScvPgo8Y2lyY2xlIGN4PScyMDAnIGN5PScyMDAnIHI9JzE5NScgZmlsbD0nbm9uZScgc3Ryb2tlPSdyZ2JhKDI3LDQyLDY1LDAuMTYpJyBzdHJva2Utd2lkdGg9JzEuNScvPgo8bGluZSB4MT0nMCcgeTE9JzIwMCcgeDI9JzQwMCcgeTI9JzIwMCcgc3Ryb2tlPSdyZ2JhKDI3LDQyLDY1LDAuMTgpJyBzdHJva2Utd2lkdGg9JzEuNScvPgo8bGluZSB4MT0nMjAwJyB5MT0nMCcgeDI9JzIwMCcgeTI9JzQwMCcgc3Ryb2tlPSdyZ2JhKDI3LDQyLDY1LDAuMTgpJyBzdHJva2Utd2lkdGg9JzEuNScvPgo8cGF0aCBkPSdNMCA2MCBRMTAwIDIwIDIwMCA1NSBUNDAwIDUwJyBmaWxsPSdub25lJyBzdHJva2U9J3JnYmEoMjcsNDIsNjUsMC4xNiknIHN0cm9rZS13aWR0aD0nMS41Jy8+CjxwYXRoIGQ9J00wIDM0MCBRMTAwIDM4MCAyMDAgMzUwIFQ0MDAgMzU1JyBmaWxsPSdub25lJyBzdHJva2U9J3JnYmEoMjcsNDIsNjUsMC4xNiknIHN0cm9rZS13aWR0aD0nMS41Jy8+CjxjaXJjbGUgY3g9JzIwMCcgY3k9JzIwMCcgcj0nNCcgZmlsbD0ncmdiYSgyMzIsODksMTIsMC41KScvPgo8L3N2Zz4=");
  background-repeat:repeat;background-size:400px 400px;background-attachment:fixed;
}
a{color:inherit;}
.topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 5vw;background:rgba(13,22,34,0.97);backdrop-filter:blur(8px);gap:10px 12px;overflow:hidden;border-bottom:2px solid var(--cyan);}
.topbar::after{
  content:'';position:absolute;left:0;top:0;bottom:0;width:120px;
  background:linear-gradient(90deg,transparent,rgba(232,89,12,0.35),transparent);
  animation:scan-sweep 4s linear infinite;pointer-events:none;
}
@keyframes scan-sweep{0%{left:-120px;}100%{left:100%;}}
.topbar__left{display:flex;align-items:center;gap:10px;min-width:0;position:relative;z-index:1;}
.topbar__brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:#fff;font-weight:800;flex-shrink:0;}
.topbar__brand span.mark{color:var(--cyan);font-size:1.2rem;}
.topbar__brand span.n360{color:var(--cyan);}
.topbar__brand span.version{font-family:var(--font-hud);color:var(--amber);font-size:0.6rem;font-weight:700;border:1px solid var(--amber);border-radius:5px;padding:2px 6px;margin-left:2px;letter-spacing:0.03em;}
.topbar__proyecto{color:rgba(255,255,255,0.55);font-size:0.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:10px;border-left:1px solid rgba(255,255,255,0.15);}
.topbar__actions{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;position:relative;z-index:1;}
.btn{
  display:inline-block;padding:11px 18px;border-radius:10px;font-weight:600;font-size:0.85rem;
  text-decoration:none;border:2px solid rgba(0,0,0,0.35);cursor:pointer;font-family:inherit;
  white-space:nowrap;
  box-shadow:0 3px 0 rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.2);
  transition:transform .08s ease,box-shadow .08s ease;position:relative;top:0;
}
.btn:active{transform:translateY(3px);box-shadow:0 0 0 rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.15);}
.btn--primary{background:var(--cyan);color:#fff;border-color:#a13f08;}
.btn--primary:hover{box-shadow:0 3px 0 rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.2),0 0 14px rgba(232,89,12,0.65);}
.btn--ghost{border-color:rgba(255,255,255,0.5);color:#fff;background:rgba(255,255,255,0.04);}
.btn--block{width:100%;text-align:center;}
.btn--small{padding:8px 14px;font-size:0.78rem;border-radius:8px;box-shadow:0 2px 0 rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.2);}
.btn--small:active{transform:translateY(2px);box-shadow:0 0 0 rgba(0,0,0,0.35);}
.linklike{background:none;border:none;color:var(--cyan);font-weight:600;cursor:pointer;font-size:inherit;font-family:inherit;padding:0;}
.wrap{max-width:1100px;margin:0 auto;padding:6vh 5vw;}
.wrap--narrow{max-width:560px;}
.wrap--wide{max-width:1300px;}
.eyebrow{font-family:var(--font-hud);display:inline-block;font-size:0.7rem;letter-spacing:0.03em;color:var(--cyan);font-weight:700;margin-bottom:10px;border:2px solid var(--cyan);border-radius:6px;padding:4px 10px;}
h1{font-family:var(--font-hud);font-size:clamp(1.4rem,3vw,2rem);font-weight:700;color:var(--navy);margin-bottom:8px;display:inline-block;border-bottom:4px solid var(--cyan);padding-bottom:8px;}
p.lead{color:var(--muted);margin-bottom:28px;border-left:3px solid var(--border);padding-left:14px;}
.back{display:block;margin-bottom:16px;color:var(--cyan);text-decoration:none;font-size:0.85rem;font-weight:600;}
.page-actions{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;}
.page-actions .back{margin-bottom:0;}
.page-actions__right{display:flex;gap:8px;flex-wrap:wrap;}

.punto-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.punto-card{background:#fff;border:2px solid var(--border);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;display:block;transition:transform .15s ease;box-shadow:0 4px 0 rgba(0,0,0,0.12);}
.punto-card:hover{transform:translateY(-2px);}
.punto-card__thumb{aspect-ratio:4/3;background:linear-gradient(160deg,var(--navy),var(--navy-deep));display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);font-size:2rem;overflow:hidden;}
.punto-card__thumb img{width:100%;height:100%;object-fit:cover;}
.punto-card__body{padding:14px 16px;}
.punto-card__name{font-weight:700;color:var(--navy);font-size:1rem;margin-bottom:4px;}
.punto-card__meta{font-size:0.8rem;color:var(--muted);}
.empty{background:#fff;border:1px dashed var(--border);border-radius:14px;padding:40px;text-align:center;color:var(--muted);}
.empty a{color:var(--cyan);font-weight:700;text-decoration:none;}

.registro{position:relative;background:#fff;border:2px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 3px 0 rgba(0,0,0,0.1);}
.registro__head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;flex-wrap:wrap;gap:8px;}
.registro__fecha{font-weight:800;color:var(--navy);}
.registro__nota{color:var(--muted);font-size:0.92rem;margin-bottom:14px;}
.registro__media{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;}
.media-item{position:relative;}
.media-item img,.media-item video{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#000;display:block;}
.media-item video{aspect-ratio:16/9;object-fit:contain;}
.media-item img{cursor:zoom-in;}
.media-item__delete{position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;background:rgba(13,22,34,0.75);color:#fff;border:none;cursor:pointer;font-size:0.72rem;display:flex;align-items:center;justify-content:center;z-index:2;padding:0;}
.media-item__delete:hover{background:#a13a2e;}
.media-item__delete:disabled{opacity:0.5;cursor:default;}
.media-item__share{position:absolute;top:6px;left:6px;width:26px;height:26px;border-radius:50%;background:rgba(13,22,34,0.75);color:#fff;border:none;cursor:pointer;font-size:0.72rem;display:flex;align-items:center;justify-content:center;z-index:2;padding:0;text-decoration:none;}
.media-item__share:hover{background:#25D366;}

.registro__estatus{font-family:var(--font-hud);display:inline-block;font-size:0.7rem;font-weight:700;padding:4px 10px;border-radius:8px;}
.registro__estatus--pendiente{background:#ddd6b0;color:#5c5730;}
.registro__estatus--en-proceso{background:rgba(201,162,39,0.24);color:#8a6b0f;}
.registro__estatus--listo{background:rgba(27,42,65,0.22);color:#1b2a41;}
.registro__responsable{font-size:0.72rem;color:var(--navy);border:1px solid var(--border);border-radius:6px;padding:3px 9px;display:inline-block;}
.registro__notify{margin-top:10px;}
.registro__edit-toggle{font-size:0.85rem;padding:0;}
.registro__edit{display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:10px;margin:8px 0 14px;}
.registro__edit select{width:auto;flex:1 1 130px;margin:0;}
.registro__edit .status{margin:0;flex-basis:100%;}

.usuario-row{display:flex;justify-content:space-between;align-items:center;background:#fff;border:2px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:8px;box-shadow:0 2px 0 rgba(0,0,0,0.1);}
.usuario-row__nombre{font-weight:700;color:var(--navy);font-size:0.95rem;}
.usuario-row__whatsapp{font-size:0.82rem;color:var(--muted);margin-top:2px;}

.lightbox{position:fixed;inset:0;background:rgba(12,13,7,0.94);z-index:200;display:none;align-items:center;justify-content:center;padding:50px;}
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

label{display:block;font-size:0.82rem;font-weight:700;color:var(--navy);margin-bottom:6px;margin-top:16px;border-bottom:2px solid var(--border);padding-bottom:4px;}
input,select,textarea{width:100%;border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-family:inherit;font-size:0.92rem;background:#fff;}
.quick-upload-form{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:end;border-top:1px solid var(--border);padding-top:14px;}
.quick-upload-form__field{flex:1 1 130px;min-width:120px;}
.quick-upload-form__field label{margin:0 0 3px;font-size:0.68rem;border-bottom:none;padding-bottom:0;}
.quick-upload-form__field input{padding:6px 9px;font-size:0.78rem;}
.quick-upload-form .btn{flex:0 0 auto;}
textarea{resize:vertical;}
.hint{font-size:0.76rem;color:var(--muted);margin-top:4px;}
.card{position:relative;background:#fff;border:2px solid var(--border);border-radius:14px;padding:24px;box-shadow:0 6px 0 rgba(0,0,0,0.1);}
.status{margin-top:14px;font-size:0.85rem;text-align:center;}
.status--error{color:#a13a2e;}
.status--ok{color:var(--cyan);}

.control-console{
  position:relative;background:rgba(13,22,34,0.97);border:2px solid var(--cyan);border-radius:14px;
  padding:22px 24px 20px;margin-bottom:24px;box-shadow:0 6px 0 rgba(0,0,0,0.25);
}
.control-console::before,.control-console::after{
  content:'';position:absolute;width:30px;height:30px;pointer-events:none;
  filter:drop-shadow(0 0 6px rgba(232,89,12,0.7));
}
.control-console::before{top:-4px;left:-4px;border-top:4px solid var(--cyan);border-left:4px solid var(--cyan);border-radius:6px 0 0 0;}
.control-console::after{bottom:-4px;right:-4px;border-bottom:4px solid var(--cyan);border-right:4px solid var(--cyan);border-radius:0 0 6px 0;}
.control-console h1{color:#fff;text-shadow:0 0 18px rgba(232,89,12,0.45);}
.control-console p.lead{color:rgba(255,255,255,0.72);border-left-color:rgba(255,255,255,0.3);margin-bottom:18px;}
.control-console .hint{color:rgba(255,255,255,0.55);}
.control-console .status{color:rgba(255,255,255,0.85);}
.plano-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:0;}
.plano-stage{position:relative;background:#000;border-radius:14px;overflow:hidden;line-height:0;cursor:crosshair;user-select:none;}
.plano-stage img{width:100%;display:block;pointer-events:none;}
.plano-stage.placing{cursor:cell;}
.pin{
  position:absolute;transform:translate(-50%,-100%);
  display:flex;flex-direction:column;align-items:center;
  text-decoration:none;color:#fff;
  background:none;border:none;padding:0;cursor:pointer;
}
.pin__dot{
  width:14px;height:14px;border-radius:0;transform:rotate(45deg);
  background:var(--cyan);border:2px solid var(--cream);box-shadow:0 2px 6px rgba(0,0,0,0.5);
}
.pin__label{
  margin-top:2px;background:rgba(13,22,34,0.85);color:#fff;font-size:0.68rem;font-weight:700;
  padding:2px 8px;border-radius:8px;white-space:nowrap;
}
.pin__responsable{
  margin-top:2px;background:rgba(255,255,255,0.92);color:var(--navy);font-size:0.6rem;font-weight:700;
  padding:1px 7px;border-radius:8px;white-space:nowrap;
}
.pin--estatus-pendiente .pin__dot{background:#a39a6b;}
.pin--estatus-en-proceso .pin__dot{background:var(--amber);}
.plano-stage.moving{cursor:cell;}
.plano-stage.removing{cursor:not-allowed;}
.pin--moving .pin__dot{background:#fff;box-shadow:0 0 0 4px rgba(232,89,12,0.55),0 2px 6px rgba(0,0,0,0.4);animation:pin-pulse 1s ease-in-out infinite;}
.pin--moving .pin__label{background:var(--cyan);color:#04141f;}
@keyframes pin-pulse{0%,100%{transform:rotate(45deg) scale(1);}50%{transform:rotate(45deg) scale(1.3);}}
.unplaced-panel{margin-top:24px;}
.unplaced-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin-bottom:18px;}
.unplaced-card{display:flex;flex-direction:column;gap:8px;}
.unplaced-card__gallery{display:block;width:100%;background:none;border:none;padding:0;margin:0;text-align:left;font:inherit;color:inherit;cursor:pointer;}
.unplaced-card__thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
.unplaced-card__thumb{aspect-ratio:1;border-radius:6px;object-fit:cover;background:var(--navy-deep);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);font-size:0.7rem;text-align:center;overflow:hidden;}
.unplaced-card__thumb--empty{grid-column:span 3;aspect-ratio:auto;padding:16px 6px;}
.unplaced-card__name{display:block;margin-top:6px;font-weight:700;color:var(--navy);font-size:0.82rem;}
.unplaced-card__place{width:100%;}

.plano-layout{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;align-items:start;}
.plano-stage-col{min-width:0;}
.pin--active .pin__dot{box-shadow:0 0 0 4px rgba(232,89,12,0.55),0 2px 6px rgba(0,0,0,0.4),0 0 14px rgba(232,89,12,0.8);}
.pin--active .pin__label{background:var(--cyan);color:#04141f;}
.plano-detail{background:#fff;border:2px solid var(--border);border-radius:14px;padding:22px;position:sticky;top:90px;max-height:calc(100vh - 110px);overflow-y:auto;box-shadow:0 4px 0 rgba(0,0,0,0.1);}
.card::before,.card::after,.registro::before,.registro::after,.plano-detail::before,.plano-detail::after{
  content:'';position:absolute;width:30px;height:30px;pointer-events:none;
  filter:drop-shadow(0 0 6px rgba(232,89,12,0.7));
}
.card::before,.registro::before,.plano-detail::before{top:-4px;left:-4px;border-top:4px solid var(--cyan);border-left:4px solid var(--cyan);border-radius:6px 0 0 0;}
.card::after,.registro::after,.plano-detail::after{bottom:-4px;right:-4px;border-bottom:4px solid var(--cyan);border-right:4px solid var(--cyan);border-radius:0 0 6px 0;}
.plano-detail__empty{color:var(--muted);font-size:0.9rem;text-align:center;padding:30px 10px;}
.plano-detail__head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.plano-detail__head h2{font-size:1.15rem;color:var(--navy);}
.plano-detail__actions{display:flex;gap:8px;flex-wrap:wrap;}
.plano-detail__responsable{font-size:0.85rem;color:var(--muted);margin-top:-10px;margin-bottom:16px;}
.plano-detail .registro{padding:14px;margin-bottom:12px;}
.plano-detail .registro__media{grid-template-columns:repeat(auto-fill,minmax(100px,1fr));}
.week-bars{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px;}
.week-bar{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:3px;background:var(--navy-deep);color:rgba(255,255,255,0.75);border:none;border-radius:8px;padding:10px 14px;cursor:pointer;font-family:inherit;min-width:60px;transition:transform .1s ease;}
.week-bar:hover{transform:translateY(-2px);}
.week-bar__label{font-family:var(--font-hud);font-size:0.72rem;font-weight:700;}
.week-bar__count{font-size:0.66rem;color:rgba(255,255,255,0.55);white-space:nowrap;}
.week-bar--active{background:linear-gradient(160deg,var(--cyan),#a83f08);color:#fff;}
.week-bar--active .week-bar__count{color:rgba(255,255,255,0.75);}
@media (max-width:860px){
  .plano-layout{grid-template-columns:1fr;}
  .plano-detail{position:static;max-height:none;}
}

@media print{
  body{background:#fff;}
  .topbar,.plano-toolbar,.page-actions,.lightbox,.plano-stage-col,#replaceInput,.plano-detail__actions,.week-bars,.media-item__delete,.media-item__share,.registro__notify,.registro__edit,.registro__edit-toggle{display:none !important;}
  .wrap,.wrap--wide{max-width:none;padding:0;margin:0;}
  .plano-layout{display:block;}
  .plano-detail{position:static;max-height:none;overflow:visible;border:none;padding:0;box-shadow:none;}
  .registro{break-inside:avoid;border:1px solid #ccc;box-shadow:none;}
  .registro__media img,.registro__media video{break-inside:avoid;}
}
`;

function shell(title, body, bodyClass) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | RadarObra360</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Orbitron:wght@500;700;800&display=swap" rel="stylesheet">
<style>${BASE_STYLE}</style>
</head>
<body${bodyClass ? ` class="${esc(bodyClass)}"` : ""}>
${body}
<script>${soundScript()}</script>
</body>
</html>`;
}

function topbar(proyectoId, proyectoNombre) {
  const q = proyectoId ? "?proyecto=" + encodeURIComponent(proyectoId) : "";
  const actions = proyectoId
    ? `<a href="/app${q}" class="btn btn--ghost">⬅ Panel principal</a>
       <a href="/app" class="btn btn--ghost">📁 Proyectos</a>
       <a href="/app/plano${q}" class="btn btn--ghost">📡 RadarObra360</a>
       <a href="/app/registrar${q}" class="btn btn--primary">＋ Registrar</a>`
    : "";
  return `<header class="topbar">
    <div class="topbar__left">
      <a href="/app" class="topbar__brand"><span class="mark">◎</span>RadarObra<span class="n360">360</span><span class="version">V2.0</span></a>
      ${proyectoNombre ? `<span class="topbar__proyecto">${esc(proyectoNombre)}</span>` : ""}
    </div>
    <div class="topbar__actions">
      ${actions}
      <a href="/app/usuarios" class="btn btn--ghost">👥 Usuarios</a>
      <a href="/app/contacto" class="btn btn--ghost">📨 Contacto</a>
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

// Button-click blip (synthesized, no audio file needed) + a global mute
// toggle persisted in localStorage. Loaded on every page via shell() so the
// sound and the mute state are consistent everywhere; the actual toggle
// button (class="audio-toggle") only needs to exist on one page — this
// script wires up as many as it finds.
function soundScript() {
  return `
    (function () {
      var MUTE_KEY = 'radarobra360_muted';

      function isMuted() {
        return localStorage.getItem(MUTE_KEY) === 'true';
      }

      window.playClickSound = function () {
        if (isMuted()) return;
        try {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return;
          var ctx = window.__radarAudioCtx || (window.__radarAudioCtx = new Ctx());
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(720, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.07, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
        } catch (e) {}
      };

      function updateToggleUI() {
        var muted = isMuted();
        document.querySelectorAll('.audio-toggle').forEach(function (btn) {
          btn.textContent = muted ? '🔇 Sonido: OFF' : '🔊 Sonido: ON';
        });
      }

      window.toggleAudioMute = function () {
        localStorage.setItem(MUTE_KEY, isMuted() ? 'false' : 'true');
        updateToggleUI();
      };

      document.querySelectorAll('.audio-toggle').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          window.toggleAudioMute();
        });
      });
      updateToggleUI();

      document.addEventListener('click', function (e) {
        if (e.target.closest('.btn')) window.playClickSound();
      });
    })();
  `;
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

module.exports = { esc, shell, topbar, lightboxMarkup, lightboxScript, soundScript };
