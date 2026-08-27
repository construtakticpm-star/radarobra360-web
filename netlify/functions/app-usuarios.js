const { checkAuth } = require("./lib/auth");
const { empresaUsuarios } = require("./lib/store");
const { esc, shell, topbar } = require("./lib/ui");

exports.handler = async (event) => {
  const auth = await checkAuth(event, { redirect: true });
  if (!auth.ok) return auth.response;

  const usuarios = empresaUsuarios(auth.data, auth.empresaId);

  const filasHtml = usuarios.length
    ? usuarios.map(u => `
      <div class="usuario-row">
        <div>
          <div class="usuario-row__nombre">${esc(u.nombre)}</div>
          <div class="usuario-row__whatsapp">📱 ${esc(u.whatsapp)}</div>
        </div>
      </div>`).join("")
    : `<div class="empty">Todavía no hay usuarios. Agrega el primero abajo.</div>`;

  const body = `
    ${topbar()}
    <div class="wrap wrap--narrow">
      <p class="eyebrow">Usuarios</p>
      <h1>Responsables y WhatsApp</h1>
      <p class="lead">Estas personas aparecen como opción de "responsable" al registrar avance, y reciben la notificación por WhatsApp cuando algo queda en estatus "Listo".</p>

      ${filasHtml}

      <div class="card" style="margin-top:24px;">
        <p class="eyebrow">Nuevo usuario</p>
        <form id="f">
          <label for="nombre">Nombre</label>
          <input type="text" id="nombre" required placeholder="Ej. Juan Pérez">

          <label for="whatsapp">Número de WhatsApp</label>
          <input type="tel" id="whatsapp" required placeholder="Ej. 529991234567">
          <div class="hint">Con código de país, solo números — sin espacios, guiones ni signo +.</div>

          <button type="submit" class="btn btn--primary btn--block" id="submitBtn" style="margin-top:16px;">＋ Agregar usuario</button>
          <div class="status" id="status"></div>
        </form>
      </div>
    </div>
    <script>
      const form = document.getElementById('f');
      const submitBtn = document.getElementById('submitBtn');
      const statusEl = document.getElementById('status');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value.trim();
        const whatsapp = document.getElementById('whatsapp').value.replace(/[^0-9]/g, '');
        if (!nombre || !whatsapp) return;
        submitBtn.disabled = true;
        statusEl.className = 'status';
        statusEl.textContent = 'Guardando...';
        try {
          const res = await fetch('/app/usuario-crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, whatsapp })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
          window.location.reload();
        } catch (err) {
          statusEl.className = 'status status--error';
          statusEl.textContent = err.message || 'No se pudo guardar.';
          submitBtn.disabled = false;
        }
      });
    </script>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell("Usuarios", body)
  };
};
