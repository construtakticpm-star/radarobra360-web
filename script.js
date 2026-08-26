const CONFIG = {
  whatsappNumber: "529999988676", // mismo número que construtaktic.com, es intencional
  whatsappMessage: "Hola. Quiero saber más sobre RadarObra360 para dar seguimiento visual a mi obra.",
  ga4Id: "G-56WC2HQ3FY",
  metaPixelId: ""
};

function trackEvent(name, params = {}) {
  if (window.gtag) window.gtag("event", name, params);
  if (window.fbq) window.fbq("trackCustom", name, params);
}

(function loadTracking() {
  if (CONFIG.ga4Id) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4Id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CONFIG.ga4Id);
  }
  trackEvent("page_view");
})();

const whatsappBtn = document.getElementById("whatsappBtn");
if (whatsappBtn) {
  whatsappBtn.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
}

const navToggle = document.getElementById("navToggle");
const navMobile = document.getElementById("navMobile");
if (navToggle && navMobile) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMobile.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
  navMobile.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMobile.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

document.querySelectorAll("[data-track]").forEach((el) => {
  el.addEventListener("click", () => trackEvent(el.dataset.track));
});

const lpForm = document.getElementById("lpForm");
if (lpForm) {
  let started = false;
  lpForm.addEventListener("focusin", () => {
    if (!started) {
      started = true;
      trackEvent("form_start");
    }
  });
}

// ---------- Mockup ilustrativo del SITE (sección "Así se ve") ----------
const SITE_DEMO_POINTS = [
  { nombre: "Cimentación", left: 14, top: 74, estatus: "ok", responsable: "Obra Civil ABC", hora: "Ayer · 17:10" },
  { nombre: "Baño 04", left: 58, top: 34, estatus: "proceso", responsable: "Instalaciones XYZ", hora: "Hoy · 13:40" },
  { nombre: "Fachada Norte", left: 30, top: 14, estatus: "atencion", responsable: "Acabados Norte", hora: "Hoy · 09:20" },
  { nombre: "Oficina 03", left: 78, top: 58, estatus: "sin", responsable: "Sin asignar", hora: "Hace 6 días" },
  { nombre: "Azotea", left: 88, top: 18, estatus: "ok", responsable: "Impermeabilizantes MX", hora: "Ayer · 11:00" },
  { nombre: "Estacionamiento", left: 20, top: 90, estatus: "proceso", responsable: "Obra Civil ABC", hora: "Hoy · 08:15" }
];
const SITE_DEMO_ESTATUS_LABEL = { ok: "Terminado", proceso: "En proceso", atencion: "Requiere atención", sin: "Sin actualización" };

(function initSiteDemo() {
  const plano = document.getElementById("siteDemoPlano");
  const card = document.getElementById("siteDemoCard");
  if (!plano || !card) return;

  function selectPoint(i) {
    const p = SITE_DEMO_POINTS[i];
    plano.querySelectorAll(".site-demo__point").forEach((el, idx) => el.classList.toggle("is-active", idx === i));
    card.innerHTML =
      '<p class="site-demo__card-name">' + p.nombre + '</p>' +
      '<div class="site-demo__card-photos">' +
        '<div class="site-demo__card-photo photo-chip--1">📷</div>' +
        '<div class="site-demo__card-photo photo-chip--3">📷</div>' +
        '<div class="site-demo__card-photo photo-chip--4">📷</div>' +
      '</div>' +
      '<div class="site-demo__card-row"><span class="site-demo__card-label">Última actualización</span><span class="site-demo__card-value">' + p.hora + '</span></div>' +
      '<div class="site-demo__card-row"><span class="site-demo__card-label">Responsable</span><span class="site-demo__card-value">' + p.responsable + '</span></div>' +
      '<div class="site-demo__card-row"><span class="site-demo__card-label">Estatus</span><span class="site-demo__card-estatus site-demo__card-estatus--' + p.estatus + '">' + SITE_DEMO_ESTATUS_LABEL[p.estatus] + '</span></div>' +
      '<div class="site-demo__card-history"><span>12 Ago</span> → <span>15 Ago</span> → <span>18 Ago</span></div>';
    trackEvent("site_demo_point_click", { punto: p.nombre });
  }

  SITE_DEMO_POINTS.forEach((p, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "site-demo__point site-demo__point--" + p.estatus;
    btn.style.left = p.left + "%";
    btn.style.top = p.top + "%";
    btn.setAttribute("aria-label", "Punto: " + p.nombre);
    btn.addEventListener("click", () => selectPoint(i));
    plano.appendChild(btn);
  });

  selectPoint(1); // arranca mostrando "Baño 04" (el ejemplo de referencia)
})();
