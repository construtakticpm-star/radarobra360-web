const { checkAuth } = require("./lib/auth");
const { empresaSugerencias } = require("./lib/store");
const { esc, shell, topbar } = require("./lib/ui");

exports.handler = async (event) => {
  const auth = await checkAuth(event, { redirect: true });
  if (!auth.ok) return auth.response;

  const sugerencias = empresaSugerencias(auth.data, auth.empresaId);

  const listaHtml = sugerencias.length
    ? sugerencias.map(s => `
      <div class="registro">
        <div class="registro__head">
          <span class="registro__fecha">${esc(s.fecha)}</span>
          ${s.nombre ? `<span class="registro__responsable">👤 ${esc(s.nombre)}</span>` : ""}
        </div>
        <p class="registro__nota">${esc(s.mensaje)}</p>
      </div>`).join("")
    : `<div class="empty">Todavía no hay sugerencias registradas.</div>`;

  const body = `
    ${topbar()}
    <div class="wrap wrap--narrow">
      <p class="eyebrow">Contacto</p>
      <h1>Sugerencias</h1>
      <p class="lead">¿Algo que falta, que no funciona, o que se te ocurrió mientras usabas la herramienta? Déjalo aquí.</p>

      <div class="card">
        <form id="f">
          <label for="nombre">Nombre (opcional)</label>
          <input type="text" id="nombre" placeholder="Ej. Juan Pérez">

          <label for="mensaje">Sugerencia / comentario</label>
          <textarea id="mensaje" rows="4" required placeholder="Cuéntanos qué mejorarías..."></textarea>

          <button type="submit" class="btn btn--primary btn--block" id="submitBtn" style="margin-top:22px;">Enviar sugerencia</button>
          <div class="status" id="status"></div>
        </form>
      </div>

      <p class="eyebrow" style="margin-top:32px;">Sugerencias anteriores</p>
      ${listaHtml}
    </div>
    <script>
      const form = document.getElementById('f');
      const submitBtn = document.getElementById('submitBtn');
      const statusEl = document.getElementById('status');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value.trim();
        const mensaje = document.getElementById('mensaje').value.trim();
        if (!mensaje) return;
        submitBtn.disabled = true;
        statusEl.className = 'status';
        statusEl.textContent = 'Enviando...';
        try {
          const res = await fetch('/app/sugerencia-crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, mensaje })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
          window.location.reload();
        } catch (err) {
          statusEl.className = 'status status--error';
          statusEl.textContent = err.message || 'No se pudo enviar.';
          submitBtn.disabled = false;
        }
      });
    </script>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell("Contacto", body)
  };
};
