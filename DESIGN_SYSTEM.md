# DESIGN SYSTEM — articles-immeit.vercel.app
> Version 2.0 · OpenCode Injection Ready · Juin 2026

---

## 1. VISION DESIGN

**Concept :** « Tableau de Bord Éditorial Industriel »
L'outil doit incarner la double identité d'IMMEIT : rigueur industrielle (maintenance B2B, West Africa) 
et efficacité éditoriale (LinkedIn, publication digitale). Le résultat visé est celui d'un SaaS interne 
premium — entre la densité de Linear et la clarté de Notion — avec l'accent LinkedIn comme fil rouge.

**Persona :** Yelli NIANG et ses consultants, à Dakar ou Paris, qui produisent 3–5 articles/semaine.
**Job à accomplir :** Générer → réviser → valider → copier. Zéro friction, feedback immédiat.

---

## 2. PALETTE DE COULEURS

```css
:root {
  /* ── Primaire IMMEIT ── */
  --clr-navy:          #0D1B2A;   /* Sidebar, header dark */
  --clr-navy-mid:      #162133;   /* Hover états sidebar */
  --clr-navy-light:    #1E2E44;   /* Borders sur fond sombre */

  /* ── LinkedIn Blue (accent principal) ── */
  --clr-linkedin:      #0A66C2;   /* CTA primaires, focus rings */
  --clr-linkedin-hover:#0957a8;   /* Hover sur bouton primary */
  --clr-linkedin-light:#EBF3FC;   /* Background badge "Publié" */
  --clr-linkedin-muted:#D0E8F8;   /* Hover sur item liste */

  /* ── Or IMMEIT (accent IA / premium) ── */
  --clr-gold:          #D4A017;   /* Badge IA, bouton "Régénérer" */
  --clr-gold-light:    #FDF4DC;   /* Background badge IA */

  /* ── Statuts sémantiques ── */
  --clr-draft:         #64748B;   /* Brouillon — slate */
  --clr-draft-bg:      #F1F5F9;
  --clr-review:        #B45309;   /* En révision — amber */
  --clr-review-bg:     #FEF3C7;
  --clr-validated:     #15803D;   /* Validé — green */
  --clr-validated-bg:  #DCFCE7;
  --clr-published:     #0A66C2;   /* Publié — linkedin */
  --clr-published-bg:  #EBF3FC;
  --clr-archived:      #374151;   /* Archivé — gray dark */
  --clr-archived-bg:   #F3F4F6;

  /* ── Surfaces ── */
  --clr-bg-page:       #F0F4F8;   /* Fond général (légèrement bleuté) */
  --clr-bg-sidebar:    #0D1B2A;   /* Sidebar */
  --clr-bg-card:       #FFFFFF;   /* Cards, éditeur */
  --clr-bg-input:      #F8FAFC;   /* Champs de saisie */
  --clr-bg-hover:      #F1F5F9;   /* Hover item liste */

  /* ── Texte ── */
  --clr-text-primary:  #0F172A;   /* Titres, contenu principal */
  --clr-text-secondary:#475569;   /* Labels, métadonnées */
  --clr-text-muted:    #94A3B8;   /* Placeholder, compteurs */
  --clr-text-inverse:  #F8FAFC;   /* Texte sur fond sombre */
  --clr-text-sidebar:  #CBD5E1;   /* Texte sidebar */

  /* ── Bordures ── */
  --clr-border:        #E2E8F0;   /* Bordures légères */
  --clr-border-mid:    #CBD5E1;   /* Bordures moyennes */
  --clr-border-focus:  #0A66C2;   /* Focus ring */

  /* ── Danger / Succès ── */
  --clr-danger:        #DC2626;
  --clr-danger-bg:     #FEF2F2;
  --clr-success:       #16A34A;
  --clr-success-bg:    #F0FDF4;
}
```

---

## 3. TYPOGRAPHIE

```css
/* Import Google Fonts — à ajouter dans <head> HTML */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

:root {
  /* ── Familles ── */
  --font-display: 'Space Grotesk', system-ui, sans-serif;  /* Titres, logo, H1-H2 */
  --font-body:    'Inter', system-ui, sans-serif;           /* Corps, UI, boutons */

  /* ── Échelle typographique ── */
  --text-xs:   11px;   /* Timestamps, meta secondaire */
  --text-sm:   13px;   /* Labels, badges, compteurs */
  --text-base: 15px;   /* Corps texte, inputs */
  --text-md:   17px;   /* Titres de section */
  --text-lg:   20px;   /* H2 éditeur, titre article */
  --text-xl:   24px;   /* H1 page, titre modal */
  --text-2xl:  30px;   /* Logo, gros compteurs */

  /* ── Poids ── */
  --weight-regular: 400;
  --weight-medium:  500;
  --weight-semibold:600;
  --weight-bold:    700;   /* Space Grotesk uniquement */

  /* ── Interlignage ── */
  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-relaxed:1.7;  /* Pour le corps de l'article */
}
```

---

## 4. ESPACEMENTS & LAYOUT

```css
:root {
  /* ── Espacements ── */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;

  /* ── Rayon de bordure ── */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-pill: 999px;

  /* ── Sidebar ── */
  --sidebar-width:       240px;
  --sidebar-collapsed:   64px;

  /* ── Liste articles ── */
  --list-width:          320px;

  /* ── Layout général ── */
  --layout-gap:          0;         /* Sidebar | Liste | Éditeur collés */
  --header-height:       56px;

  /* ── Transitions ── */
  --transition-fast:     100ms ease;
  --transition-base:     160ms ease;
  --transition-slow:     260ms ease;

  /* ── Ombres ── */
  --shadow-card:  0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04);
  --shadow-modal: 0 20px 60px rgba(15,23,42,.18), 0 4px 16px rgba(15,23,42,.08);
  --shadow-dropdown: 0 4px 16px rgba(15,23,42,.10);
}
```

---

## 5. LAYOUT GLOBAL — Structure 3 colonnes

```
┌──────────────┬─────────────────────┬─────────────────────────────┐
│              │                     │                             │
│   SIDEBAR    │   LISTE ARTICLES    │        ÉDITEUR              │
│  (240px)     │     (320px)         │       (flex: 1)             │
│              │                     │                             │
│  Logo        │  [Onglets status]   │  Titre interne              │
│  ─────────── │  ────────────────   │  ───────────────────────    │
│  + Nouvel    │  • Article 1        │  Corps de l'article         │
│              │    Brouillon        │  (textarea tall)            │
│              │  • Article 2        │                             │
│              │    En révision      │  [Métadonnées]              │
│              │  ...                │  ───────────────────────    │
│  ─────────── │                     │  Hashtags · Source          │
│  Déconnexion │  [Pagination]       │  IA · Dates · Sauvegarde    │
│              │                     │                             │
│              │                     │  [Barre d'actions sticky]   │
└──────────────┴─────────────────────┴─────────────────────────────┘
```

**Responsive breakpoints :**
- `>= 1200px` : Layout 3 colonnes complet
- `768px – 1199px` : Sidebar icônes (64px) + Liste + Éditeur
- `< 768px` : Navigation par onglets mobiles (Liste OU Éditeur, pas les deux)

---

## 6. COMPOSANTS UI

### 6.1 Sidebar

```css
/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--clr-bg-sidebar);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0;
  z-index: 100;
  border-right: 1px solid var(--clr-navy-light);
}

.sidebar__logo {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--clr-navy-light);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.sidebar__logo img {
  height: 28px;
  width: auto;
  filter: brightness(0) invert(1);  /* Force logo blanc sur fond sombre */
  opacity: 0.9;
}

.sidebar__logo-text {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--clr-text-inverse);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.sidebar__nav {
  flex: 1;
  padding: var(--space-4) var(--space-3);
  overflow-y: auto;
}

.sidebar__btn-new {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--clr-linkedin);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  cursor: pointer;
  transition: background var(--transition-fast);
  margin-bottom: var(--space-4);
}
.sidebar__btn-new:hover { background: var(--clr-linkedin-hover); }
.sidebar__btn-new .icon { font-size: 16px; flex-shrink: 0; }

.sidebar__footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--clr-navy-light);
}

.sidebar__logout {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--clr-text-sidebar);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2) 0;
  transition: color var(--transition-fast);
  width: 100%;
}
.sidebar__logout:hover { color: var(--clr-text-inverse); }
```

---

### 6.2 Badge de statut

```css
/* ── Status Badge ── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 3px var(--space-2);
  border-radius: var(--radius-pill);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.badge--draft     { background: var(--clr-draft-bg);     color: var(--clr-draft);     }
.badge--review    { background: var(--clr-review-bg);    color: var(--clr-review);    }
.badge--validated { background: var(--clr-validated-bg); color: var(--clr-validated); }
.badge--published { background: var(--clr-published-bg); color: var(--clr-published); }
.badge--archived  { background: var(--clr-archived-bg);  color: var(--clr-archived);  }

.badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* Map JS : statut → classe CSS */
/* 'Brouillon'   → badge--draft     */
/* 'En révision' → badge--review    */
/* 'Validé'      → badge--validated */
/* 'Publié'      → badge--published */
/* 'Archivé'     → badge--archived  */
```

**JS helper (à ajouter dans app.js) :**
```javascript
function getBadgeClass(status) {
  const map = {
    'Brouillon':   'draft',
    'En révision': 'review',
    'Validé':      'validated',
    'Publié':      'published',
    'Archivé':     'archived'
  };
  return `badge badge--${map[status] || 'draft'}`;
}

function renderStatusBadge(status) {
  return `<span class="${getBadgeClass(status)}">${status}</span>`;
}
```

---

### 6.3 Carte article (liste)

```css
/* ── Article Card (liste) ── */
.article-item {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--clr-border);
  cursor: pointer;
  transition: background var(--transition-fast);
  position: relative;
}

.article-item:hover { background: var(--clr-bg-hover); }
.article-item.active {
  background: var(--clr-linkedin-muted);
  border-left: 3px solid var(--clr-linkedin);
}

.article-item__title {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--clr-text-primary);
  margin: 0 0 var(--space-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-item__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--clr-text-muted);
}

.article-item__preview {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--clr-text-secondary);
  margin: var(--space-2) 0 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: var(--leading-normal);
}
```

---

### 6.4 Onglets de statut (filtre liste)

```css
/* ── Status Tabs ── */
.tabs {
  display: flex;
  overflow-x: auto;
  gap: 2px;
  padding: var(--space-3) var(--space-3) 0;
  background: var(--clr-bg-card);
  border-bottom: 1px solid var(--clr-border);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar { display: none; }

.tab {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--clr-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--transition-fast), border-color var(--transition-fast);
  white-space: nowrap;
}

.tab:hover { color: var(--clr-text-primary); }
.tab.active {
  color: var(--clr-linkedin);
  border-bottom-color: var(--clr-linkedin);
}

.tab__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--clr-bg-hover);
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  margin-left: var(--space-1);
}
.tab.active .tab__count {
  background: var(--clr-linkedin-light);
  color: var(--clr-linkedin);
}
```

---

### 6.5 Éditeur d'article

```css
/* ── Éditeur principal ── */
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--clr-bg-page);
  overflow: hidden;
}

.editor__header {
  padding: var(--space-5) var(--space-8);
  background: var(--clr-bg-card);
  border-bottom: 1px solid var(--clr-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-shrink: 0;
}

.editor__title-input {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  color: var(--clr-text-primary);
  border: none;
  background: transparent;
  width: 100%;
  outline: none;
  padding: 0;
}
.editor__title-input::placeholder { color: var(--clr-text-muted); }

.editor__body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6) var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* ── Zone de texte principal ── */
.editor__content-area {
  background: var(--clr-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--clr-border);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.editor__textarea-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--clr-border);
  background: var(--clr-bg-input);
}

.editor__textarea-label {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--clr-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.editor__word-count {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--clr-text-muted);
  transition: color var(--transition-fast);
}
.editor__word-count.warn  { color: var(--clr-review); }
.editor__word-count.ok    { color: var(--clr-validated); }

.editor__textarea {
  width: 100%;
  min-height: 380px;
  padding: var(--space-5);
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--clr-text-primary);
  resize: none;
  outline: none;
  box-sizing: border-box;
}

/* ── Panneau métadonnées ── */
.editor__meta-panel {
  background: var(--clr-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--clr-border);
  box-shadow: var(--shadow-card);
  padding: var(--space-5);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4) var(--space-6);
}

.meta-field__label {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--clr-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--space-1);
}

.meta-field__value {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--clr-text-primary);
}

.meta-field__value--muted {
  color: var(--clr-text-muted);
  font-style: italic;
}

/* ── Champ hashtags ── */
.hashtag-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--clr-border);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  background: var(--clr-bg-input);
  color: var(--clr-text-primary);
  transition: border-color var(--transition-fast);
  outline: none;
}
.hashtag-input:focus {
  border-color: var(--clr-border-focus);
  box-shadow: 0 0 0 3px rgba(10,102,194,.1);
}
```

---

### 6.6 Barre d'actions (sticky footer éditeur)

```css
/* ── Action Bar ── */
.action-bar {
  position: sticky;
  bottom: 0;
  background: var(--clr-bg-card);
  border-top: 1px solid var(--clr-border);
  padding: var(--space-4) var(--space-8);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  z-index: 10;
  box-shadow: 0 -4px 16px rgba(15,23,42,.04);
}

/* Groupe gauche : actions principales */
.action-bar__primary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
}

/* Groupe droite : actions secondaires + destructives */
.action-bar__secondary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* ── Boutons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast),
              border-color var(--transition-fast), transform 80ms ease;
  white-space: nowrap;
  text-decoration: none;
  border: 1px solid transparent;
  line-height: 1.4;
}
.btn:active { transform: scale(0.97); }
.btn .btn__icon { font-size: 15px; flex-shrink: 0; }

/* Primary — Enregistrer */
.btn--primary {
  background: var(--clr-linkedin);
  color: #fff;
  border-color: var(--clr-linkedin);
}
.btn--primary:hover { background: var(--clr-linkedin-hover); border-color: var(--clr-linkedin-hover); }

/* Secondary — Valider, Copier */
.btn--secondary {
  background: var(--clr-bg-card);
  color: var(--clr-text-primary);
  border-color: var(--clr-border-mid);
}
.btn--secondary:hover { background: var(--clr-bg-hover); }

/* AI — Régénérer avec IA */
.btn--ai {
  background: var(--clr-gold-light);
  color: var(--clr-gold);
  border-color: #e8c85a;
}
.btn--ai:hover { background: #fbefc0; }
.btn--ai .btn__icon { font-size: 14px; }

/* Ghost — actions mineures */
.btn--ghost {
  background: transparent;
  color: var(--clr-text-secondary);
  border-color: transparent;
}
.btn--ghost:hover { background: var(--clr-bg-hover); color: var(--clr-text-primary); }

/* Danger — Supprimer */
.btn--danger {
  background: transparent;
  color: var(--clr-danger);
  border-color: transparent;
}
.btn--danger:hover { background: var(--clr-danger-bg); border-color: #fca5a5; }

/* Success — Copier pour LinkedIn */
.btn--linkedin {
  background: var(--clr-linkedin-light);
  color: var(--clr-linkedin);
  border-color: var(--clr-linkedin-light);
}
.btn--linkedin:hover { background: var(--clr-linkedin-muted); }

/* Disabled */
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

/* Loading state */
.btn--loading .btn__icon::before {
  content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

---

### 6.7 Toast Notifications

```css
/* ── Toast System ── */
.toast-container {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--clr-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--clr-border);
  box-shadow: var(--shadow-dropdown);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--clr-text-primary);
  pointer-events: auto;
  animation: slideInToast 200ms ease forwards;
  max-width: 360px;
}

.toast--success { border-left: 3px solid var(--clr-success); }
.toast--error   { border-left: 3px solid var(--clr-danger); }
.toast--info    { border-left: 3px solid var(--clr-linkedin); }
.toast--warning { border-left: 3px solid var(--clr-review); }

.toast__icon {
  font-size: 18px;
  flex-shrink: 0;
}
.toast--success .toast__icon { color: var(--clr-success); }
.toast--error   .toast__icon { color: var(--clr-danger); }
.toast--info    .toast__icon { color: var(--clr-linkedin); }
.toast--warning .toast__icon { color: var(--clr-review); }

@keyframes slideInToast {
  from { transform: translateX(20px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

.toast.removing {
  animation: fadeOutToast 180ms ease forwards;
}
@keyframes fadeOutToast {
  to { transform: translateX(20px); opacity: 0; }
}
```

**JS helper :**
```javascript
function showToast(message, type = 'info', duration = 3500) {
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };
  const container = document.querySelector('.toast-container')
    || (() => {
      const el = document.createElement('div');
      el.className = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${icons[type]}</span>
    <span class="toast__msg">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}
```

---

### 6.8 Modal Génération IA (nouveau design)

```css
/* ── Modal IA ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13,27,42,.7);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  animation: fadeInOverlay 160ms ease forwards;
}
@keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }

.modal {
  background: var(--clr-bg-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUpModal 200ms ease forwards;
}
@keyframes slideUpModal {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.modal__header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--clr-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--clr-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.modal__title-ai-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 3px var(--space-2);
  background: var(--clr-gold-light);
  border: 1px solid #e8c85a;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--clr-gold);
  letter-spacing: 0.02em;
}

.modal__close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--clr-bg-input);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--clr-text-secondary);
  font-size: 18px;
  transition: background var(--transition-fast);
}
.modal__close:hover { background: var(--clr-bg-hover); color: var(--clr-text-primary); }

.modal__body {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.modal__divider {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--clr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.modal__divider::before,
.modal__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--clr-border);
}

/* Spinner IA */
.ai-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-6);
}

.ai-spinner__ring {
  width: 48px;
  height: 48px;
  border: 3px solid var(--clr-border);
  border-top-color: var(--clr-gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.ai-spinner__text {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--clr-text-secondary);
}

/* Liste actualités */
.news-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.news-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--clr-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.news-item:hover {
  border-color: var(--clr-linkedin);
  background: var(--clr-linkedin-light);
}
.news-item.selected {
  border-color: var(--clr-linkedin);
  background: var(--clr-linkedin-light);
  box-shadow: 0 0 0 2px rgba(10,102,194,.1);
}

.news-item__source {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--clr-linkedin);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}

.news-item__title {
  font-size: var(--text-sm);
  color: var(--clr-text-primary);
  line-height: var(--leading-normal);
}

.modal__footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--clr-border);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}
```

---

### 6.9 Skeleton Loader

```css
/* ── Skeleton Loader ── */
@keyframes shimmer {
  from { background-position: -600px 0; }
  to   { background-position:  600px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--clr-border) 25%,
    var(--clr-bg-hover) 50%,
    var(--clr-border) 75%
  );
  background-size: 1200px 100%;
  animation: shimmer 1.4s infinite ease-in-out;
  border-radius: var(--radius-sm);
}

.skeleton--title  { height: 18px; width: 70%; margin-bottom: var(--space-2); }
.skeleton--text   { height: 13px; width: 90%; margin-bottom: var(--space-1); }
.skeleton--badge  { height: 20px; width: 80px; border-radius: var(--radius-pill); }
.skeleton--card   {
  height: 80px;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}
```

**HTML skeleton article item :**
```html
<div class="article-item">
  <div class="skeleton skeleton--title"></div>
  <div style="display:flex; gap:8px; margin-top:8px;">
    <div class="skeleton skeleton--badge"></div>
    <div class="skeleton" style="height:20px;width:60px;border-radius:999px;"></div>
  </div>
  <div class="skeleton skeleton--text" style="margin-top:10px;"></div>
  <div class="skeleton skeleton--text" style="width:60%;"></div>
</div>
```

---

### 6.10 Connexion — Page Login

```css
/* ── Login Page ── */
.login-page {
  min-height: 100vh;
  background: var(--clr-bg-sidebar);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.login-card {
  background: var(--clr-bg-card);
  border-radius: var(--radius-xl);
  box-shadow: 0 32px 80px rgba(0,0,0,.35);
  padding: var(--space-10) var(--space-10);
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
}

.login-card__logo {
  height: 36px;
  width: auto;
}

.login-card__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--clr-text-primary);
  text-align: center;
  margin: 0;
}

.login-card__subtitle {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--clr-text-secondary);
  text-align: center;
  margin: calc(-1 * var(--space-4)) 0 0;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.login-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--clr-border-mid);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-base);
  background: var(--clr-bg-input);
  color: var(--clr-text-primary);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}
.login-input:focus {
  border-color: var(--clr-border-focus);
  box-shadow: 0 0 0 3px rgba(10,102,194,.12);
}

.login-btn {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--clr-linkedin);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  cursor: pointer;
  transition: background var(--transition-fast), transform 80ms ease;
}
.login-btn:hover  { background: var(--clr-linkedin-hover); }
.login-btn:active { transform: scale(0.99); }
```

---

## 7. STRUCTURE HTML GLOBALE

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Articles LinkedIn — IMMEIT</title>
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <!-- Styles -->
  <link rel="stylesheet" href="/style.css">
</head>
<body>

<!-- PAGE LOGIN (visible si non authentifié) -->
<div id="login-page" class="login-page">
  <div class="login-card">
    <img src="/logo-immeit.webp" alt="IMMEIT" class="login-card__logo">
    <h1 class="login-card__title">Articles LinkedIn</h1>
    <p class="login-card__subtitle">Plateforme de publication IMMEIT</p>
    <div class="login-form">
      <input type="password" id="password-input" class="login-input"
             placeholder="Mot de passe" autocomplete="current-password">
      <button id="login-btn" class="login-btn">Se connecter</button>
      <div id="login-error" style="display:none; color:var(--clr-danger); font-size:var(--text-sm); text-align:center;"></div>
    </div>
  </div>
</div>

<!-- APP PRINCIPALE (visible si authentifié) -->
<div id="app" class="app" style="display:none;">

  <!-- SIDEBAR -->
  <aside class="sidebar" role="navigation" aria-label="Navigation principale">
    <div class="sidebar__logo">
      <img src="/logo-immeit.webp" alt="IMMEIT">
      <span class="sidebar__logo-text">Articles</span>
    </div>
    <nav class="sidebar__nav">
      <button id="btn-new-article" class="sidebar__btn-new">
        <span class="icon" aria-hidden="true">+</span>
        Nouvel article
      </button>
    </nav>
    <div class="sidebar__footer">
      <button id="btn-logout" class="sidebar__logout">
        <span aria-hidden="true">⎋</span>
        Déconnexion
      </button>
    </div>
  </aside>

  <!-- LISTE ARTICLES -->
  <section class="article-list" role="region" aria-label="Liste des articles">
    <!-- Onglets filtre status -->
    <div class="tabs" role="tablist" aria-label="Filtrer par statut">
      <button class="tab active" role="tab" data-status="all">Tous <span class="tab__count" id="count-all">—</span></button>
      <button class="tab" role="tab" data-status="Brouillon">Brouillon</button>
      <button class="tab" role="tab" data-status="En révision">En révision</button>
      <button class="tab" role="tab" data-status="Validé">Validé</button>
      <button class="tab" role="tab" data-status="Publié">Publié</button>
      <button class="tab" role="tab" data-status="Archivé">Archivé</button>
    </div>
    <!-- Contenu liste -->
    <div id="articles-container" aria-live="polite">
      <!-- Skeleton initial -->
      <div class="article-item" aria-hidden="true">
        <div class="skeleton skeleton--title"></div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <div class="skeleton skeleton--badge"></div>
        </div>
        <div class="skeleton skeleton--text" style="margin-top:10px;"></div>
        <div class="skeleton skeleton--text" style="width:55%;"></div>
      </div>
    </div>
    <!-- Pagination -->
    <div id="pagination" class="pagination"></div>
  </section>

  <!-- ÉDITEUR -->
  <main class="editor" role="main" aria-label="Éditeur d'article">
    <!-- Placeholder vide -->
    <div id="editor-empty" class="editor__empty">
      <div class="editor__empty-icon" aria-hidden="true">✦</div>
      <p class="editor__empty-title">Sélectionnez un article</p>
      <p class="editor__empty-sub">ou créez-en un nouveau depuis la sidebar</p>
    </div>
    <!-- Éditeur actif -->
    <div id="editor-active" style="display:none; flex:1; overflow:hidden; display:flex; flex-direction:column;">
      <!-- Header titre -->
      <div class="editor__header">
        <input type="text" id="article-title" class="editor__title-input"
               placeholder="Titre interne de l'article…" aria-label="Titre de l'article">
        <span id="article-status-badge" class="badge badge--draft">Brouillon</span>
      </div>
      <!-- Corps + méta -->
      <div class="editor__body">
        <!-- Zone texte -->
        <div class="editor__content-area">
          <div class="editor__textarea-header">
            <span class="editor__textarea-label">Corps de l'article</span>
            <span id="word-count" class="editor__word-count">0 mots</span>
          </div>
          <textarea id="article-body" class="editor__textarea"
                    placeholder="Rédigez ou collez le corps de l'article LinkedIn…"
                    aria-label="Corps de l'article" aria-describedby="word-count"></textarea>
        </div>
        <!-- Métadonnées -->
        <div class="editor__meta-panel">
          <div class="meta-field">
            <div class="meta-field__label">Hashtags</div>
            <input type="text" id="article-hashtags" class="hashtag-input"
                   placeholder="#maintenance #GMAO" aria-label="Hashtags">
          </div>
          <div class="meta-field">
            <div class="meta-field__label">Source</div>
            <div id="article-source" class="meta-field__value meta-field__value--muted">—</div>
          </div>
          <div class="meta-field">
            <div class="meta-field__label">Modèle IA</div>
            <div id="article-model" class="meta-field__value meta-field__value--muted">—</div>
          </div>
          <div class="meta-field">
            <div class="meta-field__label">Créé le</div>
            <div id="article-created" class="meta-field__value meta-field__value--muted">—</div>
          </div>
          <div class="meta-field">
            <div class="meta-field__label">Dernière sauvegarde</div>
            <div id="article-saved" class="meta-field__value meta-field__value--muted">—</div>
          </div>
        </div>
        <!-- Zone instructions régénération -->
        <div id="regen-section" style="display:none;">
          <div class="editor__content-area">
            <div class="editor__textarea-header">
              <span class="editor__textarea-label">Consignes pour la régénération</span>
            </div>
            <textarea id="regen-instructions" class="editor__textarea" style="min-height:100px;"
                      placeholder="Décrivez les modifications souhaitées…"></textarea>
          </div>
        </div>
      </div>
      <!-- Barre d'actions sticky -->
      <div class="action-bar">
        <div class="action-bar__primary">
          <button id="btn-save" class="btn btn--primary">
            <span class="btn__icon" aria-hidden="true">↓</span>
            Enregistrer
          </button>
          <button id="btn-validate" class="btn btn--secondary">
            <span class="btn__icon" aria-hidden="true">✓</span>
            Valider
          </button>
          <button id="btn-copy" class="btn btn--linkedin">
            <span class="btn__icon" aria-hidden="true">⌘</span>
            Copier LinkedIn
          </button>
          <button id="btn-regen" class="btn btn--ai">
            <span class="btn__icon" aria-hidden="true">✦</span>
            Régénérer
          </button>
        </div>
        <div class="action-bar__secondary">
          <button id="btn-archive" class="btn btn--ghost">Archiver</button>
          <button id="btn-restore" class="btn btn--ghost" style="display:none;">Restaurer</button>
          <button id="btn-delete" class="btn btn--danger">Supprimer</button>
        </div>
      </div>
    </div>
  </main>

</div><!-- /#app -->

<!-- Toast container -->
<div class="toast-container" role="status" aria-live="polite" aria-atomic="true"></div>

<!-- Modals -->
<!-- ... -->

<script src="/app.js" defer></script>
</body>
</html>
```

---

## 8. EMPTY STATES

```css
/* ── Empty State (éditeur vide) ── */
.editor__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: var(--clr-text-muted);
  text-align: center;
  padding: var(--space-10);
}

.editor__empty-icon {
  font-size: 48px;
  opacity: 0.25;
  color: var(--clr-linkedin);
}

.editor__empty-title {
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--clr-text-secondary);
  margin: 0;
}

.editor__empty-sub {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--clr-text-muted);
  margin: 0;
}

/* ── Empty State (liste vide) ── */
.list-empty {
  padding: var(--space-10) var(--space-6);
  text-align: center;
  color: var(--clr-text-muted);
  font-family: var(--font-body);
  font-size: var(--text-sm);
}

.list-empty__icon { font-size: 32px; margin-bottom: var(--space-3); opacity: 0.3; }
```

---

## 9. RESPONSIVE MOBILE

```css
/* ── Mobile layout ── */
@media (max-width: 767px) {
  .app {
    flex-direction: column;
  }

  .sidebar {
    position: relative;
    width: 100%;
    height: auto;
    flex-direction: row;
    padding: var(--space-3) var(--space-4);
    align-items: center;
  }

  .sidebar__nav { flex: 1; padding: 0 var(--space-3); }
  .sidebar__footer { border-top: none; border-left: 1px solid var(--clr-navy-light); padding: 0 0 0 var(--space-4); }

  .article-list {
    width: 100%;
    height: calc(100vh - 56px - 56px);
    border-right: none;
    border-bottom: 1px solid var(--clr-border);
  }

  .editor {
    display: none;
  }

  .editor.active {
    display: flex;
    position: fixed;
    inset: 56px 0 0 0;
    z-index: 50;
    background: var(--clr-bg-card);
  }

  /* Bouton retour sur mobile */
  .editor__header::before {
    content: '← Retour';
    font-size: var(--text-sm);
    color: var(--clr-linkedin);
    cursor: pointer;
    margin-right: var(--space-4);
    flex-shrink: 0;
  }

  /* Action bar scroll horizontal sur mobile */
  .action-bar {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: var(--space-3) var(--space-4);
  }
  .action-bar::-webkit-scrollbar { display: none; }
  .action-bar__secondary { flex-shrink: 0; }

  /* Modal plein écran sur mobile */
  .modal {
    max-width: 100%;
    max-height: 95vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    margin-top: auto;
  }
  .modal-overlay { align-items: flex-end; padding: 0; }
}
```

---

## 10. CSS BASE RESET

```css
/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font-body);
  background: var(--clr-bg-page);
  color: var(--clr-text-primary);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* App container */
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Scrollbar personnalisée */
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb  { background: var(--clr-border-mid); border-radius: var(--radius-pill); }
::-webkit-scrollbar-thumb:hover { background: var(--clr-text-muted); }

/* Focus visible accessible */
:focus-visible {
  outline: 2px solid var(--clr-border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Réduction de mouvement */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
