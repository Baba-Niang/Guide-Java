// ============================================================
// ASSISTANT GEMINI — Java Torréfié
// Fichier isolé : ne touche à aucune fonctionnalité existante
// du site (script.js n'est pas modifié).
// ============================================================

(function () {
  "use strict";

  // Adresse du backend sécurisé (voir /api/gemini.js).
  // La clé API Gemini n'est JAMAIS présente dans ce fichier.
  //
  // ⚠️ Le site (GitHub Pages) et le backend (Vercel) sont sur deux
  // domaines différents : on ne peut PAS utiliser un chemin relatif
  // "/api/gemini" ici (il pointerait vers GitHub Pages, qui ne peut
  // pas l'exécuter). Remplace la ligne ci-dessous par l'URL complète
  // de ton déploiement Vercel une fois qu'il est en ligne, par ex. :
  //   const GEMINI_ENDPOINT = "https://java-torrefie-gemini.vercel.app/api/gemini";
  const GEMINI_ENDPOINT = "https://java-torrefie-gemini.vercel.app/api/gemini";

  // Anti-spam simple côté client : évite le double-envoi et
  // limite la fréquence des requêtes (le vrai rate-limiting
  // doit rester côté serveur, voir /api/gemini.js).
  const MIN_DELAY_BETWEEN_REQUESTS_MS = 1200;

  // Taille max d'une image jointe (avant encodage base64).
  // Reste sous la limite de taille de requête des fonctions
  // serverless usuelles (ex. ~4,5 Mo sur Vercel Hobby).
  const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 Mo
  const ALLOWED_IMAGE_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ];

  let els = {};
  let isRequestPending = false;
  let lastRequestAt = 0;
  let pendingAttachment = null; // { mimeType, data (base64 sans préfixe), previewUrl, name }

  function qs(id) {
    return document.getElementById(id);
  }

  function cacheEls() {
    els = {
      window: qs("geminiWindow"),
      openBtn: qs("geminiTopbarBtn"),
      minimizeBtn: qs("geminiMinimizeBtn"),
      closeBtn: qs("geminiCloseBtn"),
      messages: qs("geminiMessages"),
      typing: qs("geminiTyping"),
      form: qs("geminiForm"),
      input: qs("geminiInput"),
      sendBtn: qs("geminiSendBtn"),
      quickActions: qs("geminiQuickActions"),
      attachBtn: qs("geminiAttachBtn"),
      fileInput: qs("geminiFileInput"),
      attachmentPreview: qs("geminiAttachmentPreview"),
    };
  }

  // --- Ouverture / fermeture / réduction de la fenêtre ---

  function open() {
    if (!els.window) return;
    els.window.classList.remove("is-minimized");
    els.window.classList.add("is-open");
    els.window.setAttribute("aria-hidden", "false");
    if (els.openBtn) els.openBtn.setAttribute("aria-expanded", "true");
    setTimeout(() => els.input && els.input.focus(), 150);
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

  // --- Contexte pédagogique de la fiche actuellement consultée ---
  // On envoie uniquement le nécessaire (titre du chapitre + titre
  // de la fiche visible), jamais le contenu complet du site.

  function getCurrentContext() {
    try {
      const container = document.getElementById("slidesContainer");
      if (!container) return null;

      const slideWidth = container.offsetWidth || 1;
      const currentIdx = Math.round(container.scrollLeft / slideWidth);
      const currentSlide = container.children[currentIdx];
      if (!currentSlide) return null;

      const chapterTitleEl = currentSlide.querySelector(".chapter-title");
      const chapter = chapterTitleEl
        ? chapterTitleEl.textContent.trim()
        : null;

      // Fiche la plus visible dans le slide courant (au milieu du viewport)
      let fiche = null;
      const ficheCards = currentSlide.querySelectorAll(".fiche-card");
      if (ficheCards.length) {
        const viewportMid = window.innerHeight / 2;
        let best = null;
        let bestDist = Infinity;
        ficheCards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight) return;
          const dist = Math.abs((rect.top + rect.bottom) / 2 - viewportMid);
          if (dist < bestDist) {
            bestDist = dist;
            best = card;
          }
        });
        const target = best || ficheCards[0];
        const titleEl = target.querySelector(".fiche-title");
        fiche = titleEl ? titleEl.textContent.trim() : null;
      }

      if (!chapter && !fiche) return null;
      return { chapter, fiche };
    } catch (e) {
      return null;
    }
  }

  // --- Affichage des messages ---

  function scrollToBottom() {
    if (els.messages) els.messages.scrollTop = els.messages.scrollHeight;
  }

  function addMessage(role, text, isError, imagePreviewUrl) {
    const wrap = document.createElement("div");
    wrap.className =
      "gemini-msg " +
      (role === "user" ? "gemini-msg-user" : "gemini-msg-bot") +
      (isError ? " gemini-msg-error" : "");

    const bubble = document.createElement("div");
    bubble.className = "gemini-msg-bubble";

    if (imagePreviewUrl) {
      const img = document.createElement("img");
      img.className = "gemini-msg-image";
      img.src = imagePreviewUrl;
      img.alt = "Image jointe";
      bubble.appendChild(img);
    }

    const textNode = document.createElement("span");
    textNode.textContent = text;
    bubble.appendChild(textNode);

    wrap.appendChild(bubble);
    els.messages.appendChild(wrap);
    scrollToBottom();
    return bubble;
  }

  // --- Pièce jointe (capture d'écran / image) ---

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelected(file) {
    if (!file) return;

    if (ALLOWED_IMAGE_TYPES.indexOf(file.type) === -1) {
      addMessage(
        "bot",
        "Format d'image non supporté. Utilise un PNG, JPEG, WebP ou GIF.",
        true
      );
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      addMessage(
        "bot",
        "Cette image est trop lourde (max 3 Mo). Essaie une capture recadrée ou compressée.",
        true
      );
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const base64 = dataUrl.split(",")[1] || "";
      pendingAttachment = {
        mimeType: file.type,
        data: base64,
        previewUrl: dataUrl,
        name: file.name || "image",
      };
      renderAttachmentPreview();
    } catch (e) {
      addMessage("bot", "Impossible de lire ce fichier.", true);
    }
  }

  function clearAttachment() {
    pendingAttachment = null;
    if (els.fileInput) els.fileInput.value = "";
    renderAttachmentPreview();
  }

  function renderAttachmentPreview() {
    if (!els.attachmentPreview) return;
    els.attachmentPreview.innerHTML = "";

    if (!pendingAttachment) {
      els.attachmentPreview.classList.remove("is-active");
      return;
    }

    els.attachmentPreview.classList.add("is-active");

    const img = document.createElement("img");
    img.src = pendingAttachment.previewUrl;
    img.alt = "Aperçu de l'image jointe";

    const name = document.createElement("span");
    name.className = "gemini-attachment-preview-name";
    name.textContent = pendingAttachment.name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "gemini-attachment-remove-btn";
    removeBtn.setAttribute("aria-label", "Retirer l'image jointe");
    removeBtn.title = "Retirer l'image jointe";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", clearAttachment);

    els.attachmentPreview.appendChild(img);
    els.attachmentPreview.appendChild(name);
    els.attachmentPreview.appendChild(removeBtn);
  }

  function setTyping(active) {
    if (!els.typing) return;
    els.typing.classList.toggle("is-active", active);
    if (active) scrollToBottom();
  }

  function setSending(sending) {
    isRequestPending = sending;
    if (els.sendBtn) els.sendBtn.disabled = sending;
    if (els.input) els.input.disabled = sending;
  }

  // --- Envoi d'une question à Gemini via le backend sécurisé ---

  async function sendMessage(rawText) {
    const text = (rawText || "").trim();
    const attachment = pendingAttachment;

    // Il faut au moins un texte ou une image jointe pour envoyer.
    if ((!text && !attachment) || isRequestPending) return;

    const now = Date.now();
    if (now - lastRequestAt < MIN_DELAY_BETWEEN_REQUESTS_MS) return;
    lastRequestAt = now;

    const displayText = text || "(image jointe)";
    addMessage("user", displayText, false, attachment ? attachment.previewUrl : null);

    if (els.input) {
      els.input.value = "";
      autoResizeInput();
    }
    clearAttachment();

    setSending(true);
    setTyping(true);

    const payload = { message: text };
    const context = getCurrentContext();
    if (context) payload.context = context;
    if (attachment) {
      payload.image = { mimeType: attachment.mimeType, data: attachment.data };
    }

    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 404 || response.status === 501) {
        addMessage(
          "bot",
          "L'assistant Gemini n'est pas encore configuré.",
          true
        );
        return;
      }

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();
      const reply =
        (data && (data.reply || data.text || data.message)) ||
        "Désolé, je n'ai pas pu générer de réponse.";
      addMessage("bot", reply);
    } catch (err) {
      addMessage(
        "bot",
        "Impossible de contacter Gemini pour le moment. Réessaie dans quelques instants.",
        true
      );
    } finally {
      setTyping(false);
      setSending(false);
      els.input && els.input.focus();
    }
  }

  // --- Zone de saisie ---

  function autoResizeInput() {
    if (!els.input) return;
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 110) + "px";
  }

  function bindEvents() {
    if (els.openBtn) els.openBtn.addEventListener("click", open);
    if (els.closeBtn) els.closeBtn.addEventListener("click", close);
    if (els.minimizeBtn)
      els.minimizeBtn.addEventListener("click", toggleMinimize);

    if (els.form) {
      els.form.addEventListener("submit", (e) => {
        e.preventDefault();
        sendMessage(els.input ? els.input.value : "");
      });
    }

    if (els.input) {
      els.input.addEventListener("input", autoResizeInput);
      els.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage(els.input.value);
        }
      });
      els.input.addEventListener("paste", (e) => {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file" && item.type.indexOf("image/") === 0) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault(); // évite de coller un nom de fichier/binaire dans le texte
              handleFileSelected(file);
            }
            break;
          }
        }
      });
    }

    if (els.attachBtn && els.fileInput) {
      els.attachBtn.addEventListener("click", () => els.fileInput.click());
      els.fileInput.addEventListener("change", () => {
        const file = els.fileInput.files && els.fileInput.files[0];
        handleFileSelected(file);
      });
    }

    if (els.quickActions) {
      els.quickActions.addEventListener("click", (e) => {
        const btn = e.target.closest(".gemini-quick-btn");
        if (!btn) return;
        const prompt = btn.getAttribute("data-prompt") || "";
        if (els.input) {
          els.input.value = prompt;
          autoResizeInput();
          els.input.focus();
        }
      });
    }

    // Fermer avec la touche Échap
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        els.window &&
        els.window.classList.contains("is-open")
      ) {
        close();
      }
    });
  }

  function init() {
    cacheEls();
    if (!els.window) return; // markup absent, on ne fait rien
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);

  // Exposé pour le bouton topbar (onclick="GeminiChat.open()")
  window.GeminiChat = { open, close, toggleMinimize };
})();
