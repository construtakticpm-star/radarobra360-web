// Shared Basic Auth check — the product is still in build/demo phase,
// gated until there's a real client ready to receive their own access.

function unauthorized(realm) {
  return {
    statusCode: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}"`,
      "Content-Type": "text/plain"
    },
    body: "Autenticación requerida."
  };
}

function checkAuth(event, realm = "RadarObra360 — acceso privado") {
  const user = process.env.RADAROBRA_USER;
  const pass = process.env.RADAROBRA_PASS;

  if (!user || !pass) {
    return { ok: false, response: { statusCode: 503, body: "Acceso no configurado todavía." } };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const [scheme, encoded] = authHeader.split(" ");

  if (scheme !== "Basic" || !encoded) {
    return { ok: false, response: unauthorized(realm) };
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const sepIndex = decoded.indexOf(":");
  const providedUser = decoded.slice(0, sepIndex);
  const providedPass = decoded.slice(sepIndex + 1);

  if (providedUser !== user || providedPass !== pass) {
    return { ok: false, response: unauthorized(realm) };
  }

  return { ok: true };
}

module.exports = { checkAuth };
