const crypto = require("crypto");

// Contraseñas: scrypt con salt aleatorio por registro, guardado como
// "salt:hash" en hex. No se necesita ninguna dependencia externa (bcrypt,
// etc.) — Node ya trae scrypt en su módulo crypto.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Sesión: cookie firmada (HMAC), sin estado en el servidor — igual de
// simple que el Basic Auth que reemplaza, pero ahora identifica a QUÉ
// empresa pertenece cada visitante en vez de una sola contraseña global.
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const COOKIE_NAME = "radarobra_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Falta SESSION_SECRET (variable de entorno).");
  return secret;
}

function signSession(empresaId) {
  const payload = empresaId + "." + (Date.now() + SESSION_MAX_AGE_MS);
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(payload + "." + sig, "utf-8").toString("base64url");
}

function verifySession(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const lastDot = decoded.lastIndexOf(".");
    const secondDot = decoded.lastIndexOf(".", lastDot - 1);
    if (lastDot === -1 || secondDot === -1) return null;
    const empresaId = decoded.slice(0, secondDot);
    const expiry = decoded.slice(secondDot + 1, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const payload = empresaId + "." + expiry;
    const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    if (Date.now() > Number(expiry)) return null;
    return empresaId;
  } catch (e) {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  String(header || "").split(";").forEach(part => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function buildSessionCookie(empresaId) {
  const token = signSession(empresaId);
  return COOKIE_NAME + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + Math.floor(SESSION_MAX_AGE_MS / 1000);
}

function buildClearCookie() {
  return COOKIE_NAME + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

function getEmpresaIdFromEvent(event) {
  const cookies = parseCookies((event.headers && (event.headers.cookie || event.headers.Cookie)) || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

module.exports = {
  hashPassword, verifyPassword,
  buildSessionCookie, buildClearCookie, getEmpresaIdFromEvent,
  COOKIE_NAME
};
