const crypto = require("crypto");
const { checkAdminAuth } = require("./lib/auth");
const { getData, saveData, slugify, findEmpresaByUsuario } = require("./lib/store");
const { hashPassword } = require("./lib/session");
const { esc, shell } = require("./lib/ui");

exports.handler = async (event) => {
  const auth = checkAdminAuth(event);
  if (!auth.ok) return auth.response;

  if (event.httpMethod === "POST") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "JSON inválido" }) };
    }

    const nombre = (payload.nombre || "").trim();
    const usuario = (payload.usuario || "").trim();
    const password = payload.password || "";
    if (!nombre || !usuario || !password) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Falta nombre, usuario o contraseña" }) };
    }
    if (password.length < 8) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "La contraseña debe tener al menos 8 caracteres" }) };
    }

    try {
      const data = await getData();
      if (findEmpresaByUsuario(data, usuario)) {
        return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Ese usuario ya existe" }) };
      }
      const base = slugify(nombre);
      let id = base;
      let n = 2;
      while ((data.empresas || []).find(e => e.id === id)) {
        id = base + "-" + n;
        n++;
      }
      data.empresas = data.empresas || [];
      data.empresas.push({
        id, nombre, usuario,
        passwordHash: hashPassword(password),
        activo: true,
        creadoEn: new Date().toISOString()
      });
      await saveData(data);
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, id }) };
    } catch (e) {
      return {
        statusCode: 503,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No se pudo crear la empresa.", debug: e.message })
      };
    }
  }

  if (event.httpMethod === "PATCH") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "JSON inválido" }) };
    }
    const { empresaId, activo } = payload;
    try {
      const data = await getData();
      const empresa = (data.empresas || []).find(e => e.id === empresaId);
      if (!empresa) {
        return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Empresa no encontrada" }) };
      }
      empresa.activo = !!activo;
      await saveData(data);
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return {
        statusCode: 503,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No se pudo actualizar.", debug: e.message })
      };
    }
  }

  const data = await getData();
  const empresas = data.empresas || [];
  const proyectosPorEmpresa = (empresaId) => (data.proyectos || []).filter(p => p.empresaId === empresaId).length;

  const filasHtml = empresas.length
    ? empresas.map(e => `
      <div class="usuario-row">
        <div>
          <div class="usuario-row__nombre">${esc(e.nombre)} ${e.activo === false ? '<span style="color:#a13a2e;font-size:0.75rem;">(desactivada)</span>' : ""}</div>
          <div class="usuario-row__whatsapp">usuario: ${esc(e.usuario)} · ${proyectosPorEmpresa(e.id)} proyecto(s)</div>
        </div>
        <button type="button" class="btn btn--ghost btn--small toggle-empresa" data-id="${esc(e.id)}" data-activo="${e.activo !== false}" style="color:var(--navy); border-color:var(--border);">${e.activo === false ? "Activar" : "Desactivar"}</button>
      </div>`).join("")
    : `<div class="empty">Todavía no hay empresas creadas.</div>`;

  const body = `
    <div class="wrap wrap--narrow">
      <p class="eyebrow">Administración</p>
      <h1>Empresas</h1>
      <p class="lead">Cada empresa es un cliente con su propio login y sus propios proyectos — aislados entre sí.</p>

      ${filasHtml}

      <div class="card" style="margin-top:24px;">
        <p class="eyebrow">Nueva empresa</p>
        <form id="f">
          <label for="nombre">Nombre de la empresa</label>
          <input type="text" id="nombre" required placeholder="Ej. Constructora Palmas">

          <label for="usuario">Usuario para su login</label>
          <input type="text" id="usuario" required placeholder="Ej. palmas">

          <label for="password">Contraseña</label>
          <input type="text" id="password" required minlength="8" placeholder="Mínimo 8 caracteres">

          <button type="submit" class="btn btn--primary btn--block" id="submitBtn" style="margin-top:16px;">＋ Crear empresa</button>
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
        submitBtn.disabled = true;
        statusEl.className = 'status';
        statusEl.textContent = 'Creando...';
        try {
          const res = await fetch('/admin/empresas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: document.getElementById('nombre').value.trim(),
              usuario: document.getElementById('usuario').value.trim(),
              password: document.getElementById('password').value
            })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || 'No se pudo crear.');
          window.location.reload();
        } catch (err) {
          statusEl.className = 'status status--error';
          statusEl.textContent = err.message;
          submitBtn.disabled = false;
        }
      });

      document.querySelectorAll('.toggle-empresa').forEach(btn => {
        btn.addEventListener('click', async () => {
          const activo = btn.dataset.activo === 'true';
          btn.disabled = true;
          try {
            const res = await fetch('/admin/empresas', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ empresaId: btn.dataset.id, activo: !activo })
            });
            if (!res.ok) throw new Error('No se pudo actualizar.');
            window.location.reload();
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
          }
        });
      });
    </script>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell("Administración — Empresas", body)
  };
};
