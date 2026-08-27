// Multi-empresa: cada visitante autenticado pertenece a una empresa (ver
// lib/session.js para la cookie firmada y lib/store.js para el modelo de
// datos). checkAuth ya no valida una sola contraseña compartida — valida
// la sesión y devuelve la empresa + los datos ya cargados, para que cada
// función solo tenga que filtrar por auth.empresaId.
const { getEmpresaIdFromEvent } = require("./session");
const { getData, findEmpresa } = require("./store");

function loginRedirect(event) {
  const path = event.path || "/app";
  const params = event.queryStringParameters || {};
  const qs = Object.keys(params).map(k => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])).join("&");
  const next = encodeURIComponent(path + (qs ? "?" + qs : ""));
  return {
    statusCode: 302,
    headers: { Location: "/login?next=" + next },
    body: ""
  };
}

function unauthorizedJson() {
  return {
    statusCode: 401,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "No autenticado" })
  };
}

// opts.redirect: true para páginas HTML (GET) — manda al login en vez de
// devolver un JSON que el navegador no sabría qué hacer con él.
async function checkAuth(event, opts = {}) {
  const empresaId = getEmpresaIdFromEvent(event);
  const data = await getData();
  const empresa = empresaId ? findEmpresa(data, empresaId) : null;

  if (!empresa || empresa.activo === false) {
    return { ok: false, response: opts.redirect ? loginRedirect(event) : unauthorizedJson() };
  }

  return { ok: true, empresaId: empresa.id, empresa, data };
}

// Acceso de administración (crear/gestionar empresas) — separado del login
// de cada cliente a propósito: una empresa nunca debe poder crear otras
// empresas. Usa Basic Auth simple con sus propias credenciales
// (ADMIN_USER/ADMIN_PASS), igual de sencillo que el login único que tenía
// toda la app antes, pero ahora solo protege esta pantalla de operación
// interna de CKT.
function checkAdminAuth(event) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  const realm = "RadarObra360 — administración";

  if (!user || !pass) {
    return { ok: false, response: { statusCode: 503, body: "Acceso de administración no configurado." } };
  }

  const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  const [scheme, encoded] = authHeader.split(" ");
  const unauthorized = {
    statusCode: 401,
    headers: { "WWW-Authenticate": `Basic realm="${realm}"`, "Content-Type": "text/plain" },
    body: "Autenticación requerida."
  };
  if (scheme !== "Basic" || !encoded) {
    return { ok: false, response: unauthorized };
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const sepIndex = decoded.indexOf(":");
  const providedUser = decoded.slice(0, sepIndex);
  const providedPass = decoded.slice(sepIndex + 1);
  if (providedUser !== user || providedPass !== pass) {
    return { ok: false, response: unauthorized };
  }

  return { ok: true };
}

module.exports = { checkAuth, checkAdminAuth };
