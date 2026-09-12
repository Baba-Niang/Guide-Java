// ============================================================
// JAVA TORRÉFIÉ — Static Site JavaScript
// ============================================================

// === THEME MANAGEMENT ===
function getStoredTheme() {
  try {
    return localStorage.getItem('java-torrifie-theme');
  } catch (e) {
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem('java-torrifie-theme', theme);
  } catch (e) {
    // Ignore storage errors (e.g. private browsing)
  }
}

function getPreferredTheme() {
  const stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  // Default to dark (the coffee roasting theme)
  return 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // Update toggle button aria-label
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.setAttribute('aria-label', theme === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair');
    btn.setAttribute('title', theme === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  setStoredTheme(next);
}

// === Hauteur réelle de la topbar (variable, car la barre d'outils peut faire
// varier sa hauteur selon la largeur d'écran) : on la mesure et on l'expose
// en variable CSS pour que le contenu et la barre de progression s'alignent. ===
function updateTopbarHeight() {
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    document.documentElement.style.setProperty('--topbar-h', topbar.offsetHeight + 'px');
  }
}

// === Masquer/afficher la sidebar des chapitres pour lire en plein écran ===
function applySidebarState(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  const btn = document.getElementById('sidebarToggleBtn');
  if (btn) {
    btn.setAttribute('aria-label', collapsed ? 'Afficher la liste des chapitres' : 'Masquer la liste des chapitres');
    btn.setAttribute('title', collapsed ? 'Afficher la liste des chapitres' : 'Masquer la liste des chapitres');
  }
}

function toggleSidebar() {
  const collapsed = !document.body.classList.contains('sidebar-collapsed');
  applySidebarState(collapsed);
  try {
    localStorage.setItem('javaTorrefieSidebarCollapsed', collapsed ? '1' : '0');
  } catch (e) {
    /* localStorage indisponible (mode privé, etc.) : l'état ne sera pas mémorisé */
  }
}

function initSidebarStateEarly() {
  let collapsed = false;
  try {
    collapsed = localStorage.getItem('javaTorrefieSidebarCollapsed') === '1';
  } catch (e) {
    /* localStorage indisponible : on part de l'état par défaut (sidebar visible) */
  }
  applySidebarState(collapsed);
}

// Apply theme ASAP to avoid flash (called inline in <head>)
function initThemeEarly() {
  applyTheme(getPreferredTheme());
}

// === MARKED.JS CONFIGURATION ===
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
}

// === JAVA SYNTAX HIGHLIGHTING ===
function highlightJava(code) {
  const keywords = new Set([
    'public', 'private', 'protected', 'static', 'final', 'void', 'class', 'interface',
    'abstract', 'extends', 'implements', 'new', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'break', 'continue', 'default', 'try', 'catch', 'finally',
    'throw', 'throws', 'import', 'package', 'this', 'super', 'null', 'true', 'false',
    'int', 'long', 'double', 'float', 'char', 'boolean', 'byte', 'short',
    'String', 'var', 'enum', 'record', 'instanceof',
    // C keywords (for ```c code blocks in C vs Java chapter)
    'struct', 'union', 'typedef', 'sizeof', 'const', 'extern',
    'unsigned', 'signed', 'goto', 'volatile', 'register', 'auto',
  ]);

  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const regex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|(\b\d+\.?\d*[fLdD]?\b)|([A-Za-z_]\w*)|(\s+)|([^\s\w])/g;
  let result = '';
  let match;
  
  while ((match = regex.exec(escaped)) !== null) {
    const [full, comment, str, num, word, ws, punct] = match;
    if (comment) {
      result += '<span class="token-comment">' + comment + '</span>';
    } else if (str) {
      result += '<span class="token-string">' + str + '</span>';
    } else if (num) {
      result += '<span class="token-number">' + num + '</span>';
    } else if (word) {
      if (keywords.has(word)) {
        result += '<span class="token-keyword">' + word + '</span>';
      } else if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        result += '<span class="token-class">' + word + '</span>';
      } else {
        result += word;
      }
    } else if (ws) {
      result += ws;
    } else if (punct) {
      result += '<span class="token-punct">' + punct + '</span>';
    }
  }
  return result;
}

// === CUSTOM MARKED RENDERER ===
function renderMarkdown(content, accentColor) {
  if (typeof marked === 'undefined') {
    return '<p style="color:red">Erreur: marked.js non chargé</p>';
  }

  // Custom renderer for code blocks
  const renderer = new marked.Renderer();
  const originalCode = renderer.code.bind(renderer);
  
  renderer.code = function(code, language) {
    // marked v9+ passes an object, v12+ passes string directly
    if (typeof code === 'object') {
      language = code.lang;
      code = code.text;
    }
    let highlighted;
    if (language === 'java' || language === 'c') {
      highlighted = highlightJava(code);
    } else {
      highlighted = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    const langLabel = language ? language.toUpperCase() : '';
    const escapedCode = code.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    return '<div class="code-block-wrapper" style="--heading-color:' + accentColor + '">' +
      (langLabel ? '<div class="code-block-header">' +
        '<span class="code-block-lang">' + langLabel + '</span>' +
        '<button class="code-block-copy" onclick="copyCode(this)" data-code="' + escapedCode + '">📋 Copier</button>' +
      '</div>' : '') +
      '<pre><code>' + highlighted + '</code></pre>' +
      '</div>';
  };

  // Tables wrapper
  const originalTable = renderer.table.bind(renderer);
  renderer.table = function(header, body) {
    return '<div class="table-wrap">' + originalTable(header, body) + '</div>';
  };

  // Links open in new tab
  const originalLink = renderer.link.bind(renderer);
  renderer.link = function(href, title, text) {
    if (typeof href === 'object') {
      text = title;
      title = href.title;
      href = href.href;
    }
    return '<a href="' + href + '" target="_blank" rel="noopener noreferrer"' + (title ? ' title="' + title + '"' : '') + '>' + text + '</a>';
  };

  return marked.parse(content, { renderer: renderer });
}

// === FICHE TOGGLE ===
function toggleFiche(btn) {
  const card = btn.closest('.fiche-card');
  const content = card.querySelector('.fiche-content');
  const isOpen = card.classList.contains('open');
  
  if (isOpen) {
    content.style.display = 'none';
    card.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  } else {
    // Render markdown on first open
    const markdownDivs = card.querySelectorAll('.fiche-markdown');
    const accentColor = card.style.getPropertyValue('--accent');
    markdownDivs.forEach(markdownDiv => {
      if (!markdownDiv.dataset.rendered) {
        const rawContent = markdownDiv.getAttribute('data-content-raw') || '';
        const txt = document.createElement('textarea');
        txt.innerHTML = rawContent;
        const unescaped = txt.value;
        markdownDiv.innerHTML = renderMarkdown(unescaped, accentColor);
        markdownDiv.dataset.rendered = 'true';
      }
    });
    
    content.style.display = 'block';
    card.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

// === IMAGE TOGGLE ===
function toggleImage(btn) {
  const card = btn.closest('.fiche-card');
  const imgWrap = card.querySelector('.fiche-image-wrap');
  const isHidden = getComputedStyle(imgWrap).display === 'none';
  
  if (isHidden) {
    imgWrap.style.display = 'block';
    btn.innerHTML = '🖼 Masquer l\'image';
  } else {
    imgWrap.style.display = 'none';
    btn.innerHTML = '🖼 Voir l\'image source';
  }
}

// === COPY CODE ===
function copyCode(btn) {
  const code = btn.getAttribute('data-code');
  // Unescape HTML entities
  const txt = document.createElement('textarea');
  txt.innerHTML = code;
  const unescaped = txt.value;
  
  navigator.clipboard.writeText(unescaped).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '✅ Copié';
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = unescaped;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    btn.innerHTML = '✅ Copié';
    setTimeout(() => { btn.innerHTML = '📋 Copier'; }, 1500);
  });
}

// === SCROLL TO CHAPTER (horizontal) ===

function toggleHiddenFiches() {
  const body = document.body;
  const btn = document.getElementById('hiddenFichesToggle');
  if (!btn) return;
  const showing = body.classList.toggle('show-hidden-fiches');
  btn.setAttribute('aria-pressed', String(showing));
  btn.innerHTML = (showing ? '🙈 Masquer les images masquées ' : '👁 Afficher les images masquées ');
  const span = document.createElement('span');
  span.className = 'hidden-count';
  span.textContent = '(18)';
  btn.appendChild(span);
  document.querySelectorAll('.fiche-card.overloaded-hidden').forEach(card => {
    card.setAttribute('aria-hidden', String(!showing));
  });
}

function scrollToChapter(id) {
  const slide = document.getElementById('slide-' + id);
  if (slide) {
    slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  } else {
    // Fallback: scroll the slides container
    const container = document.getElementById('slidesContainer');
    if (container) {
      const idx = CHAPTERS_IDS.indexOf(id);
      if (idx >= 0) {
        container.scrollTo({ left: (idx + 1) * container.offsetWidth, behavior: 'smooth' });
      }
    }
  }
}

var CHAPTERS_IDS = ['fondations', 'premier-programme', 'variables-types', 'commentaires-strings', 'exceptions', 'operateurs', 'conditions', 'boucles', 'tableaux', 'poo-fondamentaux', 'poo-avance', 'exceptions-cours-complet', 'object', 'generics', 'collections', 'comparable-comparator', 'files', 'enum', 'date-time'];

// === SCROLL TO TOP (go to first slide) ===
function scrollToTop() {
  const container = document.getElementById('slidesContainer');
  if (container) {
    container.scrollTo({ left: 0, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// === HORIZONTAL SLIDE NAVIGATION ===
function navigateSlides(direction) {
  const container = document.getElementById('slidesContainer');
  if (!container) return;
  const slideWidth = container.offsetWidth;
  const currentIdx = Math.round(container.scrollLeft / slideWidth);
  const newIdx = Math.max(0, Math.min(container.children.length - 1, currentIdx + direction));
  container.scrollTo({ left: newIdx * slideWidth, behavior: 'smooth' });
}

function goToSlide(index) {
  const container = document.getElementById('slidesContainer');
  if (!container) return;
  const slideWidth = container.offsetWidth;
  container.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
}

// === UPDATE SLIDE COUNTER & PROGRESS ===
function updateSlideUI() {
  const container = document.getElementById('slidesContainer');
  if (!container) return;
  
  const slideWidth = container.offsetWidth;
  const currentIdx = Math.round(container.scrollLeft / slideWidth);
  const totalSlides = container.children.length;
  
  // Update counter
  const currentEl = document.getElementById('slideCurrent');
  if (currentEl) currentEl.textContent = currentIdx + 1;
  
  // Update progress bar
  const progressEl = document.getElementById('progressFill');
  if (progressEl) {
    const progress = ((currentIdx + 1) / totalSlides) * 100;
    progressEl.style.width = progress + '%';
  }
  
  // Update nav arrows
  const prevBtn = document.getElementById('navPrev');
  const nextBtn = document.getElementById('navNext');
  if (prevBtn) prevBtn.disabled = currentIdx === 0;
  if (nextBtn) nextBtn.disabled = currentIdx === totalSlides - 1;
  
  // Hide scroll hint after first navigation
  const hint = document.getElementById('scrollHint');
  if (hint && currentIdx > 0) {
    hint.classList.add('hidden');
  }
  
  // Update sidebar active state
  const currentSlide = container.children[currentIdx];
  if (currentSlide) {
    const chapterId = currentSlide.getAttribute('data-chapter-id');
    if (chapterId) {
      document.querySelectorAll('.sidebar-item').forEach(function(item) {
        if (item.dataset.chapter === chapterId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
      document.querySelectorAll('.mobile-chip').forEach(function(chip) {
        if (chip.dataset.chapter === chapterId) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    } else {
      // Hero slide — no active chapter
      document.querySelectorAll('.sidebar-item, .mobile-chip').forEach(function(item) {
        item.classList.remove('active');
      });
    }
  }
}

// === SIDEBAR ACTIVE TRACKING (now via horizontal scroll) ===
function setupSidebarTracking() {
  const container = document.getElementById('slidesContainer');
  if (!container) return;
  
  // Listen to horizontal scroll
  let scrollTimer;
  container.addEventListener('scroll', function() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateSlideUI, 50);
  });
  
  // Also update on resize
  window.addEventListener('resize', updateSlideUI);
  
  // Initial update
  updateSlideUI();
}

// === KEYBOARD NAVIGATION (arrow keys) ===
function setupKeyboardNav() {
  document.addEventListener('keydown', function(e) {
    // Don't intercept if user is typing in an input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateSlides(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateSlides(1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSlide(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      const container = document.getElementById('slidesContainer');
      if (container) goToSlide(container.children.length - 1);
    }
  });
}

// === WHEEL NAVIGATION (convert vertical wheel to horizontal) ===
function setupWheelNav() {
  const container = document.getElementById('slidesContainer');
  if (!container) return;
  
  let isAnimating = false;
  container.addEventListener('wheel', function(e) {
    // If the slide content is scrollable vertically, let it scroll
    const currentSlide = container.children[Math.round(container.scrollLeft / container.offsetWidth)];
    if (currentSlide && currentSlide.scrollHeight > currentSlide.clientHeight) {
      // Check if we're at the top/bottom of the slide's vertical scroll
      const atTop = currentSlide.scrollTop <= 0;
      const atBottom = currentSlide.scrollTop + currentSlide.clientHeight >= currentSlide.scrollHeight - 2;
      
      if (e.deltaY < 0 && !atTop) return; // Let it scroll up
      if (e.deltaY > 0 && !atBottom) return; // Let it scroll down
    }
    
    // Convert vertical wheel to horizontal navigation
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      if (isAnimating) return;
      isAnimating = true;
      navigateSlides(e.deltaY > 0 ? 1 : -1);
      setTimeout(function() { isAnimating = false; }, 400);
    }
  }, { passive: false });
}

// === PARTICLES ===
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = 6 + (i % 3) * 4;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.left = (10 + i * 11) + '%';
    particle.style.background = i % 2 === 0
      ? 'rgba(245, 158, 11, 0.3)'
      : 'rgba(234, 88, 12, 0.2)';
    particle.style.setProperty('--drift', (i % 2 === 0 ? '20px' : '-20px'));
    particle.style.animationDelay = (i * 0.8) + 's';
    particle.style.animationDuration = (6 + i) + 's';
    container.appendChild(particle);
  }
}

// === SMOOTH SCROLL FOR SIDEBAR LINKS (horizontal navigation) ===
function setupSmoothScroll() {
  document.querySelectorAll('.sidebar-item, .mobile-chip, .footer-links a').forEach(function(link) {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        e.preventDefault();
        const chapterId = href.slice(1);
        scrollToChapter(chapterId);
      }
    });
  });
}

// === INIT ===
document.addEventListener('DOMContentLoaded', function() {
  // Activer les transitions de thème après le premier rendu (évite le flash)
  requestAnimationFrame(function() {
    document.body.classList.add('theme-ready');
  });
  
  // Initialiser le bouton de thème
  applyTheme(getPreferredTheme());

  // Restaurer l'état masqué/affiché de la sidebar des chapitres
  initSidebarStateEarly();

  // Mesurer la hauteur réelle de la topbar (icônes/labels peuvent la faire varier)
  updateTopbarHeight();
  window.addEventListener('resize', updateTopbarHeight);

  createParticles();
  setupSidebarTracking();
  setupSmoothScroll();
  setupKeyboardNav();
  setupWheelNav();
  
  console.log('☕ Java Baba Niang Guide Apprentissage — site chargé');
  console.log('📖 180 fiches · 20 chapitres · Baba Niang');
  console.log('⌨️  Utilise ← → pour naviguer entre les chapitres');
});
