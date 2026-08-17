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
.wrap{max-width:1100px;margin:0 auto;padding:6vh 5vw;}
.wrap--narrow{max-width:560px;}
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

label{display:block;font-size:0.82rem;font-weight:700;color:var(--navy);margin-bottom:6px;margin-top:16px;}
input,select,textarea{width:100%;border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-family:inherit;font-size:0.92rem;background:#fff;}
textarea{resize:vertical;}
.hint{font-size:0.76rem;color:var(--muted);margin-top:4px;}
.card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 20px 50px -20px rgba(0,0,0,0.15);}
.status{margin-top:14px;font-size:0.85rem;text-align:center;}
.status--error{color:#b5453f;}
.status--ok{color:var(--cyan);}
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
      <a href="/app/registrar" class="btn btn--primary">＋ Registrar</a>
    </div>
  </header>`;
}

module.exports = { esc, shell, topbar };
