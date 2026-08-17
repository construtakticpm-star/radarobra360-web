const CONFIG = {
  whatsappNumber: "529999988676", // mismo número que construtaktic.com — confirmar si RadarObra360 usa una línea distinta
  whatsappMessage: "Hola. Quiero saber más sobre RadarObra360 para dar seguimiento visual a mi obra.",
  ga4Id: "",
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
