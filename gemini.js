// ============================================================
// ASSISTANT GEMINI — Java Torréfié
// Mode secours : le service intégré est temporairement indisponible.
// ============================================================
(function () {
  "use strict";

  let els = {};

  function qs(id) {
    return document.getElementById(id);
  }

  function cacheEls() {
    els = {
      window: qs("geminiWindow"),
      openBtn: qs("geminiTopbarBtn"),
      minimizeBtn: qs("geminiMinimizeBtn"),
      closeBtn: qs("geminiCloseBtn")
    };
  }

  function open() {
    if (!els.window) return;
    els.window.classList.remove("is-minimized");
    els.window.classList.add("is-open");
    els.window.setAttribute("aria-hidden", "false");
    if (els.openBtn) els.openBtn.setAttribute("aria-expanded", "true");
  }

  function close() {
    if (!els.window) return;
    els.window.classList.remove("is-open", "is-minimized");
    els.window.setAttribute("aria-hidden", "true");
    if (els.openBtn) els.openBtn.setAttribute("aria-expanded", "false");
  }

  function toggleMinimize() {
    if (!els.window) return;
    els.window.classList.toggle("is-minimized");
  }

  function bindEvents() {
    if (els.openBtn) els.openBtn.addEventListener("click", open);
    if (els.closeBtn) els.closeBtn.addEventListener("click", close);
    if (els.minimizeBtn) els.minimizeBtn.addEventListener("click", toggleMinimize);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && els.window && els.window.classList.contains("is-open")) {
        close();
      }
    });
  }

  function init() {
    cacheEls();
    if (!els.window) return;
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.GeminiChat = { open, close, toggleMinimize };
})();
