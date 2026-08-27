const { getData, findEmpresaByUsuario } = require("./lib/store");
const { verifyPassword, buildSessionCookie } = require("./lib/session");
const { shell } = require("./lib/ui");

exports.handler = async (event) => {
  if (event.httpMethod === "POST") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "JSON inválido" }) };
    }

    const usuario = (payload.usuario || "").trim();
    const password = payload.password || "";
    if (!usuario || !password) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Faltan usuario o contraseña" }) };
    }

    try {
      const data = await getData();
      const empresa = findEmpresaByUsuario(data, usuario);
      const valido = empresa && empresa.activo !== false && empresa.passwordHash && verifyPassword(password, empresa.passwordHash);
      if (!valido) {
        return { statusCode: 401, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Usuario o contraseña incorrectos" }) };
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Set-Cookie": buildSessionCookie(empresa.id) },
        body: JSON.stringify({ ok: true })
      };
    } catch (e) {
      return {
        statusCode: 503,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No se pudo validar el acceso.", debug: e.message })
      };
    }
  }

  const params = event.queryStringParameters || {};
  // Solo se acepta una ruta relativa propia — nunca una URL externa, para
  // que este parámetro no se pueda usar como redirect abierto.
  const rawNext = params.next || "/app";
  const next = (rawNext.startsWith("/") && !rawNext.startsWith("//")) ? rawNext : "/app";
  const nextJson = JSON.stringify(next).replace(/</g, "\\u003c");

  const body = `
    <div class="wrap wrap--narrow" style="padding-top:14vh;">
      <p class="eyebrow">RadarObra360</p>
      <h1>Iniciar sesión</h1>
      <div class="card">
        <form id="f">
          <label for="usuario">Usuario</label>
          <input type="text" id="usuario" required autocomplete="username">

          <label for="password">Contraseña</label>
          <input type="password" id="password" required autocomplete="current-password">

          <button type="submit" class="btn btn--primary btn--block" id="submitBtn" style="margin-top:18px;">Entrar</button>
          <div class="status" id="status"></div>
        </form>
      </div>
    </div>
    <script>
      const NEXT = ${nextJson};
      const form = document.getElementById('f');
      const submitBtn = document.getElementById('submitBtn');
      const statusEl = document.getElementById('status');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        statusEl.className = 'status';
        statusEl.textContent = 'Entrando...';
        try {
          const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usuario: document.getElementById('usuario').value,
              password: document.getElementById('password').value
            })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || 'No se pudo iniciar sesión.');
          window.location.href = NEXT;
        } catch (err) {
          statusEl.className = 'status status--error';
          statusEl.textContent = err.message || 'No se pudo iniciar sesión.';
          submitBtn.disabled = false;
        }
      });
    </script>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell("Iniciar sesión", body)
  };
};
