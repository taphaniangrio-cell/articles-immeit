const API_BASE = '/api'

let articles = []
let filter = ''
let editingId = null
let currentNews = null
let regenNews = null
let currentIaMeta = null
let availableModels = null
let currentPage = 1
let isDirty = false
let autoSaveTimer = null
let isGenerating = false
let accrocheActive = 'a'
const PAGE_SIZE = 10
const LINKEDIN_TARGET = 1500

const $ = id => document.getElementById(id)

const appContainer = $('app'), loginScreen = $('login-screen'), mainScreen = $('main-screen'), editorScreen = $('editor-screen')
const loginForm = $('login-form'), loginPassword = $('login-password'), loginError = $('login-error')
const editTitre = $('edit-titre'), editAccrocheA = $('edit-accroche-a'), editAccrocheB = $('edit-accroche-b'), editCorps = $('edit-corps'), editHashtags = $('edit-hashtags')
const editSource = $('edit-source'), editIaInfo = $('edit-ia-info'), editDates = $('edit-dates')
const editorPlaceholder = $('editor-placeholder'), editorForm = $('editor-form')
const btnBack = $('btn-back'), btnSave = $('btn-save'), btnValidate = $('btn-validate')
const btnCopy = $('btn-copy'), btnDelete = $('btn-delete'), btnRegen = $('btn-regen'), btnRegenGo = $('btn-regen-go')
const btnNew = $('btn-new'), btnLogout = $('btn-logout')
const btnArchive = $('btn-archive'), btnRestore = $('btn-restore')
const btnPrev = $('btn-prev'), btnNext = $('btn-next'), pageInfo = $('page-info')
const newsModal = $('news-modal'), modalClose = $('modal-close'), btnAiPick = $('btn-ai-pick')
const customPrompt = $('custom-prompt'), btnCustomGenerate = $('btn-custom-generate')
const regenBox = $('regen-box'), regenFeedback = $('regen-feedback')
const wordCount = $('word-count'), editorStatus = $('editor-status')
const articleList = $('article-list'), statusBar = $('status-bar')
const charCount = $('char-count'), saveIndicator = $('save-indicator')
const hashtagSuggestions = $('hashtag-suggestions')
const editImages = $('edit-images'), editImageArea = $('edit-image-area')
const btnAddImage = $('btn-add-image'), btnReplaceImage = $('btn-replace-image'), btnRemoveImage = $('btn-remove-image')
const imageSearchBox = $('image-search-box'), imageSearchInput = $('image-search-input'), imageSearchResults = $('image-search-results')
const accrocheRadios = document.querySelectorAll('input[name="accroche-active"]')
const accrocheCards = document.querySelectorAll('.accroche-card')
const aiProvider = $('ai-provider-main'), aiModel = $('ai-model-main'), aiKeyStatus = $('ai-key-status-main')
const btnPreview = $('btn-preview'), linkedinPreview = $('linkedin-preview'), liPreviewBody = $('li-preview-body'), btnClosePreview = $('btn-close-preview')
const btnDashboard = $('btn-dashboard'), dashboardScreen = $('dashboard-screen'), dashContent = $('dash-content')
const btnDashBack = $('btn-dash-back'), btnDashRefresh = $('btn-dash-refresh'), btnDashSync = $('btn-dash-sync')
const dashLoading = $('dash-loading'), dashError = $('dash-error'), dashErrorText = $('dash-error-text')
const dashUpdateInfo = $('dash-update-info')


const SUGGESTED_HASHTAGS = [
  '#MaintenanceIndustrielle', '#GMAO', '#Fiabilite', '#MaintenancePredictive',
  '#Industrie40', '#RCM', '#AMDEC', '#IoT', '#CMMS', '#MaintenancePreventive',
  '#TransitionNumerique', '#PerformanceIndustrielle', '#SecuriteDesEquipements',
  '#ImmEIT', '#ConseilMaintenance', '#Optimisation',
]

let articleImages = []
let selectedImageIndex = -1

function showToast(message, type = 'success', duration = 3000) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }
  const existing = document.querySelector('.toast-custom')
  if (existing) {
    existing.style.animation = 'fadeOut .2s ease forwards'
    setTimeout(() => existing.remove(), 200)
  }
  const toast = document.createElement('div')
  toast.className = 'toast-custom'
  toast.dataset.type = type
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.animation = 'fadeOut .2s ease forwards'
    setTimeout(() => toast.remove(), 200)
  }, duration)
}

function getBadgeClass(status) {
  const map = { brouillon: 's-brouillon', en_revision: 's-en_revision', valide: 's-valide', publie: 's-publie', archive: 's-archive' }
  return map[status] || 's-brouillon'
}

function formatDateRelative(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  const now = new Date()
  const diffMin = Math.floor((now - date) / 60000)
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Hier'
  if (diffD < 7) return `Il y a ${diffD} jours`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function esc(s) {
  if (s === null || s === undefined) return ''
  const d = document.createElement('div')
  d.textContent = String(s)
  return d.innerHTML
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusClass(s) { return 's-' + (s || 'brouillon') }

async function api(path, options = {}) {
  const sep = path.includes('?') ? '&' : '?'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)
  try {
    const res = await fetch(`${API_BASE}${path}${sep}_=${Date.now()}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.status === 401) {
      document.cookie = 'session=; Path=/; Max-Age=0'
      localStorage.removeItem('immeit_session')
      showLogin()
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return data
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

function hasSession() {
  return localStorage.getItem('immeit_session') === '1'
}

function loadAiSettings(forceProvider) {
  const provider = forceProvider || localStorage.getItem('immeit_ai_provider') || 'groq'
  return { provider, model: localStorage.getItem(`immeit_ai_model_${provider}`) || '' }
}

function saveAiSettings(provider, model) {
  localStorage.setItem('immeit_ai_provider', provider)
  if (model) localStorage.setItem(`immeit_ai_model_${provider}`, model)
}

// --- AI MODEL SELECTOR ---
async function loadAvailableModels() {
  try {
    const data = await api('/models')
    availableModels = data.models || {}
    const providerSel = aiProvider
    const modelSel = aiModel
    providerSel.innerHTML = ''
    const savedProvider = localStorage.getItem('immeit_ai_provider') || 'groq'

    for (const [key, prov] of Object.entries(availableModels)) {
      const opt = document.createElement('option')
      opt.value = key
      opt.textContent = prov.label + (prov.enabled ? '' : ' ⚠ clé manquante')
      providerSel.appendChild(opt)
    }

    providerSel.value = savedProvider
    updateModelList(savedProvider)
    updateKeyStatus(savedProvider)

    providerSel.addEventListener('change', () => {
      const p = providerSel.value
      localStorage.setItem('immeit_ai_provider', p)
      updateModelList(p)
      updateKeyStatus(p)
    })
  } catch {
    aiProvider.innerHTML = '<option value="">Erreur</option>'
    aiModel.innerHTML = '<option value="">—</option>'
  }
}

function updateModelList(providerKey) {
  const prov = availableModels?.[providerKey]
  const modelSel = aiModel
  modelSel.innerHTML = ''
  if (!prov || !prov.models) {
    modelSel.innerHTML = '<option value="">—</option>'
    return
  }
  const savedModel = localStorage.getItem(`immeit_ai_model_${providerKey}`)
  for (const m of prov.models) {
    const opt = document.createElement('option')
    opt.value = m.id
    opt.textContent = m.label
    modelSel.appendChild(opt)
  }
  if (savedModel && prov.models.some(m => m.id === savedModel)) {
    modelSel.value = savedModel
  } else if (prov.default) {
    modelSel.value = prov.default
  }
}

function updateKeyStatus(providerKey) {
  const prov = availableModels?.[providerKey]
  aiKeyStatus.textContent = prov?.enabled ? '✓' : '✗'
  aiKeyStatus.className = 'key-status ' + (prov?.enabled ? 'key-ok' : 'key-missing')
}

function getSelectedModel() {
  return aiModel.value || null
}

// --- IMAGE MANAGEMENT ---
function renderImages() {
  const el = editImages
  if (!articleImages.length) {
    el.innerHTML = '<div class="images-empty">Aucune illustration</div>'
    btnReplaceImage.classList.add('hidden')
    btnRemoveImage.classList.add('hidden')
    selectedImageIndex = -1
    return
  }
  el.innerHTML = articleImages.map((img, i) => {
    const sel = i === selectedImageIndex ? ' selected' : ''
    return `<div class="image-item${sel}" data-idx="${i}">
      <img src="${esc(img.thumbnail || img.url)}" alt="${esc(img.alt || 'Illustration ' + (i+1))}" loading="lazy" onerror="this.parentElement.classList.add('broken')">
      <span class="image-item-idx">${i + 1}</span>
      ${img.photographer ? `<a href="${esc(img.photographer_url || '#')}" target="_blank" rel="noopener" class="image-item-credit">📷 ${esc(img.photographer)}</a>` : ''}
    </div>`
  }).join('')

  el.querySelectorAll('.image-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedImageIndex = parseInt(item.dataset.idx)
      renderImages()
      btnReplaceImage.classList.remove('hidden')
      btnRemoveImage.classList.remove('hidden')
      markDirty()
    })
  })

  if (selectedImageIndex === -1 || selectedImageIndex >= articleImages.length) {
    selectedImageIndex = articleImages.length - 1
    btnReplaceImage.classList.remove('hidden')
    btnRemoveImage.classList.remove('hidden')
    renderImages()
  }
}

function addImage(url, thumbnail, photographer, photographerUrl, alt) {
  articleImages.push({ url, thumbnail, photographer, photographer_url: photographerUrl, alt: alt || '' })
  selectedImageIndex = articleImages.length - 1
  renderImages()
  markDirty()
}

function removeSelectedImage() {
  if (selectedImageIndex < 0 || selectedImageIndex >= articleImages.length) return
  articleImages.splice(selectedImageIndex, 1)
  selectedImageIndex = Math.min(selectedImageIndex, articleImages.length - 1)
  renderImages()
  markDirty()
}

btnAddImage.addEventListener('click', () => {
  imageSearchBox.classList.remove('hidden')
  imageSearchInput.value = ''
  imageSearchInput.focus()
  imageSearchResults.innerHTML = ''
})

btnReplaceImage.addEventListener('click', () => {
  imageSearchBox.classList.remove('hidden')
  imageSearchInput.value = ''
  imageSearchInput.focus()
  imageSearchResults.innerHTML = ''
})

btnRemoveImage.addEventListener('click', removeSelectedImage)

imageSearchInput.addEventListener('input', async () => {
  const q = imageSearchInput.value.trim()
  if (q.length < 3) { imageSearchResults.innerHTML = ''; return }
  try {
    const data = await api(`/images?query=${encodeURIComponent(q)}`)
    const photos = data.photos || []
    if (!photos.length) { imageSearchResults.innerHTML = '<div class="empty">Aucun résultat</div>'; return }
    imageSearchResults.innerHTML = photos.map(p => `
      <div class="search-result-item" data-url="${esc(p.url)}" data-thumb="${esc(p.thumbnail)}" data-photographer="${esc(p.photographer)}" data-photographer-url="${esc(p.photographer_url)}" data-alt="${esc(p.alt || '')}">
        <img src="${esc(p.thumbnail)}" alt="${esc(p.alt || '')}" loading="lazy">
        <div class="search-result-overlay">+</div>
      </div>
    `).join('')
    imageSearchResults.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const img = {
          url: el.dataset.url,
          thumbnail: el.dataset.thumb,
          photographer: el.dataset.photographer,
          photographer_url: el.dataset.photographerUrl,
          alt: el.dataset.alt,
        }
        if (selectedImageIndex >= 0 && selectedImageIndex < articleImages.length) {
          articleImages[selectedImageIndex] = img
        } else {
          articleImages.push(img)
          selectedImageIndex = articleImages.length - 1
        }
        renderImages()
        imageSearchBox.classList.add('hidden')
        markDirty()
      })
    })
  } catch { imageSearchResults.innerHTML = '<div class="empty">Erreur réseau</div>' }
})

function setArticleImages(images, primaryUrl) {
  articleImages = []
  if (images && images.length) {
    articleImages = images.slice()
  } else if (primaryUrl) {
    articleImages = [{ url: primaryUrl, thumbnail: primaryUrl, photographer: '', photographer_url: '', alt: '' }]
  }
  selectedImageIndex = articleImages.length > 0 ? 0 : -1
  renderImages()
}

// --- LOGIN ---
loginForm.addEventListener('submit', async e => {
  e.preventDefault()
  loginError.classList.add('hidden')
  try {
    const data = await api('/auth', { method: 'POST', body: JSON.stringify({ password: loginPassword.value.trim() }) })
    localStorage.setItem('immeit_session', '1')
    showMain()
  } catch (err) {
    loginError.textContent = err.message
    loginError.classList.remove('hidden')
  }
})

btnLogout.addEventListener('click', async () => {
  try {
    await api('/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) })
  } catch {}
  localStorage.removeItem('immeit_session')
  showLogin()
})

function showLogin() {
  appContainer.classList.add('hidden')
  loginScreen.classList.remove('hidden')
  mainScreen.classList.add('hidden')
  editorScreen.classList.add('hidden')
  dashboardScreen.classList.add('hidden')
  loginPassword.value = ''
  loginPassword.focus()
}

function showMain() {
  loginScreen.classList.add('hidden')
  mainScreen.classList.remove('hidden')
  editorScreen.classList.remove('hidden')
  dashboardScreen.classList.add('hidden')
  appContainer.classList.remove('hidden')
  resetEditor()
  currentPage = 1
  if (!availableModels) loadAvailableModels()
  loadArticles()
}

function resetEditor() {
  editingId = null
  editorPlaceholder.classList.remove('hidden')
  editorForm.classList.add('hidden')
  currentNews = null
  currentIaMeta = null
}

function showEditor(article) {
  editorPlaceholder.classList.add('hidden')
  editorForm.classList.remove('hidden')
  editingId = article ? article.id : null
  regenNews = null

  if (article) {
    editTitre.value = article.titre_interne || ''
    editAccrocheA.value = article.accroche_a || ''
    editAccrocheB.value = article.accroche_b || ''
    accrocheActive = article.accroche_active || 'a'
    accrocheRadios.forEach(r => r.checked = r.value === accrocheActive)
    accrocheCards.forEach(c => c.classList.toggle('selected', c.dataset.value === accrocheActive))
    editCorps.value = article.corps || ''
    const h = article.hashtags || []
    editHashtags.value = Array.isArray(h) ? h.join(' ') : String(h)
    editorStatus.textContent = article.statut
    editorStatus.className = 'badge ' + statusClass(article.statut)
    editSource.textContent = article.source_news_titre ? esc(article.source_news_titre) : '—'
    editIaInfo.textContent = article.ia_provider
      ? `${article.ia_provider} / ${article.ia_model || '—'} · ${article.generation_type === 'custom' ? 'sujet: ' + (article.custom_subject || '') : 'actualité: ' + (article.source_news_titre || '')}`
      : '—'
    editDates.textContent = [
      article.date_creation ? 'Créé: ' + fmtDate(article.date_creation) : '',
      article.date_validation ? 'Validé: ' + fmtDate(article.date_validation) : '',
      article.date_publication ? 'Publié: ' + fmtDate(article.date_publication) : '',
    ].filter(Boolean).join('\n') || '—'

    currentIaMeta = {
      provider: article.ia_provider || null,
      model: article.ia_model || null,
      generation_type: article.generation_type || null,
      custom_subject: article.custom_subject || null,
    }

    if (article.source_news_titre) {
      regenNews = { titre: article.source_news_titre, url: article.source_news_url || '', resume: (article.corps || '').slice(0, 200), source: article.source_news_source || '' }
    }

    setArticleImages(article.image_options || (article.image_url ? [{ url: article.image_url, thumbnail: article.image_url, photographer: article.image_photographer || '', photographer_url: article.image_photographer_url || '', alt: '' }] : []), article.image_url)
    updateEditorButtons(article.statut)
    updateStatusBar(article.statut)
  } else {
    editTitre.value = ''
    editAccrocheA.value = ''
    editAccrocheB.value = ''
    accrocheActive = 'a'
    accrocheRadios.forEach(r => r.checked = r.value === 'a')
    accrocheCards.forEach(c => c.classList.toggle('selected', c.dataset.value === 'a'))
    editCorps.value = ''
    editHashtags.value = ''
    editSource.textContent = currentNews ? esc(currentNews.titre) : '—'
    editIaInfo.textContent = currentIaMeta
      ? `${currentIaMeta.provider} / ${currentIaMeta.model || '—'} · ${currentIaMeta.generation_type === 'custom' ? 'sujet: ' + (currentIaMeta.custom_subject || '') : 'actualité: ' + (currentNews?.titre || '')}`
      : '—'
    editDates.textContent = '—'
    editorStatus.textContent = 'brouillon'
    editorStatus.className = 'badge s-brouillon'
    setArticleImages(currentIaMeta?.image_options || [], null)
    updateEditorButtons('brouillon_nouveau')
    updateStatusBar('brouillon')
  }
  updateWords()
  updateCharCount()
  renderHashtagSuggestions()
  isDirty = false
  setSaveStatus('—')
}

function updateStatusBar(statut) {
  const steps = ['brouillon', 'en_revision', 'valide', 'publie']
  const idx = steps.indexOf(statut)
  if (idx === -1) { statusBar.classList.add('hidden'); return }
  statusBar.classList.remove('hidden')
  statusBar.innerHTML = steps.map((s, i) => {
    let cls = 'status-step'
    if (i < idx) cls += ' done'
    else if (i === idx) cls += ' active'
    const labels = { brouillon: 'Brouillon', en_revision: 'En révision', valide: 'Validé', publie: 'Publié' }
    const icon = i < idx ? '✓' : i === idx ? '●' : '○'
    const arrow = i < steps.length - 1 ? '<span class="status-arrow">→</span>' : ''
    return `<span class="${cls}">${icon} ${labels[s]}</span>${arrow}`
  }).join('')
}

function updateEditorButtons(statut) {
  const hide = el => el.classList.add('hidden')
  const show = el => el.classList.remove('hidden')
  ;[btnSave, btnValidate, btnCopy, btnRegen, btnArchive, btnRestore, btnDelete, btnPreview].forEach(hide)
  btnSave.disabled = false
  btnValidate.disabled = false

  if (statut === 'brouillon_nouveau') {
    show(btnSave); show(btnRegen); show(btnDelete); btnValidate.disabled = true
  } else if (statut === 'brouillon' || statut === 'en_revision') {
    show(btnSave); show(btnValidate); show(btnRegen); show(btnDelete); show(btnPreview)
  } else if (statut === 'valide' || statut === 'publie') {
    show(btnCopy); show(btnArchive); show(btnRegen); show(btnPreview)
  } else if (statut === 'archive') {
    show(btnRestore); show(btnDelete)
  }
}

btnBack.addEventListener('click', () => showMain())

function markDirty() {
  if (!editingId) return
  isDirty = true
  setSaveStatus('⏳ Non enregistré')
  clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(autoSave, 3000)
}

function setSaveStatus(msg, cls) {
  saveIndicator.textContent = msg
  saveIndicator.className = 'save-indicator' + (cls ? ' ' + cls : '')
}

async function autoSave() {
  if (!isDirty || !editingId) return
  setSaveStatus('⏳ Sauvegarde...', 'saving')
  try {
    const imageOptions = articleImages.length ? articleImages : null
    await api(`/articles?id=${editingId}`, {
      method: 'PUT',
      body: JSON.stringify({
      titre_interne: editTitre.value,
      accroche_a: editAccrocheA.value || null,
      accroche_b: editAccrocheB.value || null,
      accroche_active: accrocheActive,
      corps: editCorps.value,
      hashtags: editHashtags.value.split(/\s+/).filter(h => h),
      image_url: articleImages[0]?.url || null,
      image_photographer: articleImages[0]?.photographer || null,
      image_photographer_url: articleImages[0]?.photographer_url || null,
      image_options: imageOptions,
      }),
    })
    isDirty = false
    setSaveStatus('✓ Sauvegardé', 'saved')
  } catch (e) {
    console.error('Auto-save error:', e)
    setSaveStatus('✗ ' + (e.message || 'Erreur sauvegarde'), 'error')
  }
}

window.addEventListener('beforeunload', e => {
  if (isDirty) e.preventDefault()
})

editTitre.addEventListener('input', markDirty)
editAccrocheA.addEventListener('input', markDirty)
editAccrocheB.addEventListener('input', markDirty)
editCorps.addEventListener('input', () => { markDirty(); updateWords(); updateCharCount() })
editHashtags.addEventListener('input', markDirty)

function injectAccrocheIntoBody() {
  const selected = accrocheActive === 'a' ? editAccrocheA.value : editAccrocheB.value
  const current = editCorps.value
  let clean = current

  const aVal = editAccrocheA.value
  const bVal = editAccrocheB.value

  if (aVal && clean.startsWith(aVal)) {
    clean = clean.slice(aVal.length).replace(/^\n+/, '')
  } else if (bVal && clean.startsWith(bVal)) {
    clean = clean.slice(bVal.length).replace(/^\n+/, '')
  }

  editCorps.value = selected ? selected + '\n\n' + clean : clean
  updateWords()
  updateCharCount()
  markDirty()
}

accrocheCards.forEach(c => {
  c.addEventListener('click', () => {
    const val = c.dataset.value
    accrocheActive = val
    accrocheRadios.forEach(r => r.checked = r.value === val)
    accrocheCards.forEach(card => card.classList.toggle('selected', card.dataset.value === val))
    injectAccrocheIntoBody()
  })
})

editAccrocheA.addEventListener('input', () => {
  if (accrocheActive === 'a') markDirty()
})
editAccrocheB.addEventListener('input', () => {
  if (accrocheActive === 'b') markDirty()
})

function formatHashtags(input) {
  return input
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    .filter(tag => /^#[a-zA-ZÀ-ÿ0-9_]+$/.test(tag))
    .join(' ')
}

editHashtags.addEventListener('blur', (e) => {
  e.target.value = formatHashtags(e.target.value)
  renderHashtagSuggestions()
})

function loadArticles() {
  showSkeleton(articleList)
  const params = new URLSearchParams()
  if (filter) params.set('statut', filter)
  params.set('limit', '50')
  if (currentPage > 1) params.set('page', String(currentPage))
  api(`/articles?${params}`).then(data => {
    articles = data.articles || []
    currentPage = 1
    renderArticles()
    if (!editingId && articles.length > 0) {
      showEditor(articles[0])
      renderArticles()
    }
  }).catch(() => {
    articleList.innerHTML = '<div class="empty">Erreur de chargement</div>'
  })
}

function showSkeleton(container) {
  container.innerHTML = Array(5).fill('<div class="skeleton skeleton-card"></div>').join('')
}

function renderArticles() {
  if (articles.length === 0) {
    articleList.innerHTML = '<div class="empty">Aucun article trouvé</div>'
    $('pagination').classList.add('hidden')
    return
  }
  const totalPages = Math.ceil(articles.length / PAGE_SIZE)
  if (currentPage > totalPages) currentPage = totalPages
  const start = (currentPage - 1) * PAGE_SIZE
  const page = articles.slice(start, start + PAGE_SIZE)

  articleList.innerHTML = page.map((a, i) => {
    const selected = editingId === a.id ? ' selected' : ''
    return `<div class="article-card${selected}" data-id="${a.id}">
      <div class="article-card-top">
        <span class="num">${start + i + 1}</span>
        <h3>${esc(a.titre_interne || '(sans titre)')}</h3>
        <span class="status ${statusClass(a.statut)}">${a.statut}</span>
      </div>
      <div class="meta">
        <span>${fmtDate(a.date_creation)}</span>
        ${a.ia_provider ? `<span class="ia-badge">${esc(a.ia_provider)} / ${esc(a.ia_model || '—')} · ${a.generation_type === 'custom' ? 'sujet: ' + esc(a.custom_subject || '').slice(0, 40) : 'actualité: ' + esc(a.source_news_titre || '').slice(0, 40)}</span>` : ''}
      </div>
      ${a.image_url ? `<div class="article-card-img"><img src="${esc(a.image_url)}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>` : ''}
    </div>`
  }).join('')

  articleList.querySelectorAll('.article-card').forEach(c => {
    c.addEventListener('click', () => {
      const a = articles.find(x => x.id === parseInt(c.dataset.id))
      if (a) { showEditor(a); renderArticles() }
    })
  })

  if (totalPages > 1) {
    $('pagination').classList.remove('hidden')
    pageInfo.textContent = `Page ${currentPage} / ${totalPages} (${articles.length} articles)`
    btnPrev.disabled = currentPage <= 1
    btnNext.disabled = currentPage >= totalPages
  } else $('pagination').classList.add('hidden')
}

btnPrev.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--
    const start = (currentPage - 1) * PAGE_SIZE
    const a = articles[start]
    if (a) showEditor(a)
    renderArticles()
  }
})
btnNext.addEventListener('click', () => {
  const t = Math.ceil(articles.length / PAGE_SIZE)
  if (currentPage < t) {
    currentPage++
    const start = (currentPage - 1) * PAGE_SIZE
    const a = articles[start]
    if (a) showEditor(a)
    renderArticles()
  }
})

document.querySelectorAll('.tab').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
    filter = b.dataset.filter
    editingId = null
    loadArticles()
  })
})

function updateWords() {
  const text = editCorps.value
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length
  const pct = Math.min(100, Math.round(words / LINKEDIN_TARGET * 100))
  const color = words < 800 ? '#F59E0B' : words <= 2000 ? '#10B981' : '#EF4444'

  wordCount.innerHTML = `
    <span style="color:${color};font-weight:600">${words} mots</span>
    <span style="color:var(--color-text-light)"> · ${chars} car. · ${pct}% cible LinkedIn</span>
  `
}

function updateCharCount() {
  const len = editCorps.value.length
  charCount.textContent = `${len} / 3000 car.`
  charCount.className = 'char-count'
  if (len > 2900) charCount.classList.add('warn')
  if (len > 3000) charCount.classList.add('over')
}

function renderHashtagSuggestions() {
  const current = editHashtags.value.split(/\s+/).filter(h => h).map(h => h.toLowerCase())
  let html = ''
  for (const tag of SUGGESTED_HASHTAGS) {
    const used = current.includes(tag.toLowerCase())
    html += `<span class="tag-suggestion${used ? ' used' : ''}" data-tag="${tag}">${tag}</span>`
  }
  hashtagSuggestions.innerHTML = html
  hashtagSuggestions.querySelectorAll('.tag-suggestion').forEach(el => {
    el.addEventListener('click', () => {
      const tag = el.dataset.tag
      const tags = editHashtags.value.split(/\s+/).filter(h => h)
      if (tags.map(h => h.toLowerCase()).includes(tag.toLowerCase())) return
      tags.push(tag)
      editHashtags.value = tags.join(' ')
      renderHashtagSuggestions()
      markDirty()
    })
  })
}

// SAVE
btnSave.addEventListener('click', async () => {
  const imageOptions = articleImages.length ? articleImages : null
  const data = {
    titre_interne: editTitre.value,
    accroche_a: editAccrocheA.value || null,
    accroche_b: editAccrocheB.value || null,
    accroche_active: accrocheActive,
    corps: editCorps.value,
    hashtags: editHashtags.value.split(/\s+/).filter(h => h),
    image_url: articleImages[0]?.url || null,
    image_photographer: articleImages[0]?.photographer || null,
    image_photographer_url: articleImages[0]?.photographer_url || null,
    image_options: imageOptions,
  }
  try {
    if (editingId) {
      await api(`/articles?id=${editingId}`, { method: 'PUT', body: JSON.stringify(data) })
      showToast('Article enregistré', 'success')
      isDirty = false
      setSaveStatus('✓ Sauvegardé', 'saved')
    } else {
      const articleData = {
        ...data,
        source_news_titre: currentNews?.titre || null,
        source_news_url: currentNews?.url || null,
        source_news_source: currentNews?.source || null,
        ia_provider: currentIaMeta?.provider || null,
        ia_model: currentIaMeta?.model || null,
        generation_type: currentIaMeta?.generation_type || null,
        custom_subject: currentIaMeta?.custom_subject || null,
      }
      const result = await api('/articles', { method: 'POST', body: JSON.stringify(articleData) })
      editingId = result.article.id
      articles.unshift(result.article)
      renderArticles()
      editorStatus.textContent = 'brouillon'
      editorStatus.className = 'badge s-brouillon'
      updateEditorButtons('brouillon')
      isDirty = false
      setSaveStatus('✓ Sauvegardé', 'saved')
      showToast('Article créé', 'success')
      return
    }
    const updated = await api(`/articles?id=${editingId}`, { method: 'GET' })
    const idx = articles.findIndex(a => a.id === editingId)
    if (idx !== -1) articles[idx] = updated.article
    renderArticles()
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
})

btnValidate.addEventListener('click', async () => {
  if (!editingId) return
  try {
    await api(`/articles?id=${editingId}`, {
      method: 'PUT',
      body: JSON.stringify({ statut: 'valide', date_validation: new Date().toISOString() }),
    })
    editorStatus.textContent = 'valide'
    editorStatus.className = 'badge s-valide'
    updateEditorButtons('valide')
    updateStatusBar('valide')
    isDirty = false
    showToast('Article validé', 'success')
    const idx = articles.findIndex(a => a.id === editingId)
    if (idx !== -1) { articles[idx].statut = 'valide'; renderArticles() }
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
})

// --- FORMAT FOR LINKEDIN (nettoyage avant copie) ---
function formatForLinkedIn(text) {
  let result = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-]\s+/gm, '• ')
    .replace(/^•\s*/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .split('\n')
    .map(l => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return result
}

function renderLinkedInPreview(text) {
  const lines = text.split('\n')
  let html = ''
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      if (inList) { html += '</ul>'; inList = false }
      html += '<div class="li-spacer"></div>'
      continue
    }

    const bulletMatch = trimmed.match(/^[•\-]\s+(.*)/)
    if (bulletMatch) {
      if (!inList) { html += '<ul class="li-list">'; inList = true }
      html += `<li>${esc(bulletMatch[1])}</li>`
      continue
    }

    if (inList) { html += '</ul>'; inList = false }

    const escaped = esc(trimmed)
    const formatted = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html += `<p class="li-paragraph">${formatted}</p>`
  }
  if (inList) html += '</ul>'

  return html
}

btnCopy.addEventListener('click', async () => {
  let text = formatForLinkedIn(editCorps.value)
  const h = Array.isArray(editHashtags.value) ? editHashtags.value : editHashtags.value.split(/\s+/).filter(h => h)
  if (h.length) text += '\n\n' + h.join(' ')

  if (text.length > 3000) {
    showToast(`⚠ ${text.length} car. (max 3000 recommandé)`, 'warning')
  }

  try {
    await navigator.clipboard.writeText(text)
    if (editingId) {
      await api(`/articles?id=${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({ statut: 'publie', date_publication: new Date().toISOString() }),
      })
      editorStatus.textContent = 'publie'
      editorStatus.className = 'badge s-publie'
      updateEditorButtons('publie')
      updateStatusBar('publie')
      const idx = articles.findIndex(a => a.id === editingId)
      if (idx !== -1) { articles[idx].statut = 'publie'; renderArticles() }
    }
    showToast('Copié pour LinkedIn !', 'success')
  } catch { showToast('Erreur de copie', 'error') }
})

// --- LINKEDIN PREVIEW (improved) ---
btnPreview.addEventListener('click', () => {
  let bodyHtml = ''

  if (articleImages.length > 0) {
    bodyHtml += `<div class="li-cover"><img src="${esc(articleImages[0].url)}" alt="Illustration" onerror="this.parentElement.remove()"></div>`
  }

  bodyHtml += renderLinkedInPreview(editCorps.value)

  const h = editHashtags.value.split(/\s+/).filter(h => h)
  if (h.length) {
    bodyHtml += `<div class="li-hashtags">${h.map(t => `<span class="li-hashtag">${esc(t)}</span>`).join(' ')}</div>`
  }

  liPreviewBody.innerHTML = bodyHtml
  linkedinPreview.classList.remove('hidden')
})

btnClosePreview.addEventListener('click', () => {
  linkedinPreview.classList.add('hidden')
})

linkedinPreview.addEventListener('click', (e) => {
  if (e.target === linkedinPreview) linkedinPreview.classList.add('hidden')
})

btnArchive.addEventListener('click', async () => {
  if (!editingId) return
  try {
    await api(`/articles?id=${editingId}`, { method: 'PUT', body: JSON.stringify({ statut: 'archive' }) })
    editorStatus.textContent = 'archive'
    editorStatus.className = 'badge s-archive'
    updateEditorButtons('archive')
    statusBar.classList.add('hidden')
    showToast('Article archivé', 'info')
    const idx = articles.findIndex(a => a.id === editingId)
    if (idx !== -1) { articles[idx].statut = 'archive'; renderArticles() }
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
})

btnRestore.addEventListener('click', async () => {
  if (!editingId) return
  try {
    await api(`/articles?id=${editingId}`, { method: 'PUT', body: JSON.stringify({ statut: 'brouillon' }) })
    editorStatus.textContent = 'brouillon'
    editorStatus.className = 'badge s-brouillon'
    updateEditorButtons('brouillon')
    updateStatusBar('brouillon')
    showToast('Article restauré en brouillon', 'info')
    const idx = articles.findIndex(a => a.id === editingId)
    if (idx !== -1) { articles[idx].statut = 'brouillon'; renderArticles() }
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
})

btnDelete.addEventListener('click', async () => {
  if (!editingId) return
  if (!confirm('Supprimer définitivement cet article ? Cette action est irréversible.')) return
  try {
    await api(`/articles?id=${editingId}`, { method: 'DELETE' })
    showToast('Article supprimé', 'info')
    editingId = null
    showMain()
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
})

// REGEN CHIPS
document.querySelectorAll('.regen-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    regenFeedback.value = chip.dataset.hint
  })
})

btnRegen.addEventListener('click', () => regenBox.classList.toggle('hidden'))

btnRegenGo.addEventListener('click', async () => {
  const news = currentNews || regenNews
  const customSubject = currentIaMeta?.custom_subject || null
  if (!news && !customSubject) { showToast('Aucune actualité source ou sujet disponible pour la régénération', 'warning'); return }
  const feedback = regenFeedback.value
  btnRegenGo.disabled = true
  btnRegenGo.textContent = 'Génération...'
  try {
    const data = await api('/generate', {
      method: 'POST',
      body: JSON.stringify({
        ...(news ? { news } : {}),
        ...(customSubject ? { customPrompt: customSubject } : {}),
        feedback,
        provider: aiProvider.value,
        model: getSelectedModel(),
      }),
    })
    currentIaMeta = data.ia
    currentIaMeta.image_options = data.article?.image_options || []
    const art = data.article
    editTitre.value = art.titre_interne || ''
    editAccrocheA.value = art.accroche_a || ''
    editAccrocheB.value = art.accroche_b || ''
    accrocheActive = 'a'
    accrocheRadios.forEach(r => r.checked = r.value === 'a')
    accrocheCards.forEach(c => c.classList.toggle('selected', c.dataset.value === 'a'))
    editCorps.value = (art.accroche_a || '') + '\n\n' + (art.corps || '')
    editHashtags.value = (art.hashtags || []).join(' ')
    setArticleImages(art.image_options || [], art.image_url)
    updateWords()
    updateCharCount()
    renderHashtagSuggestions()
    if (editingId) {
      const imageOptions = articleImages.length ? articleImages : null
      await api(`/articles?id=${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          titre_interne: art.titre_interne,
          accroche_a: art.accroche_a || null,
          accroche_b: art.accroche_b || null,
          corps: art.corps || '',
          hashtags: art.hashtags || [],
          image_url: articleImages[0]?.url || null,
          image_photographer: articleImages[0]?.photographer || null,
          image_photographer_url: articleImages[0]?.photographer_url || null,
          image_options: imageOptions,
          ia_provider: currentIaMeta.provider,
          ia_model: currentIaMeta.model,
          generation_type: currentIaMeta.generation_type,
          custom_subject: customSubject,
          statut: 'brouillon',
        }),
      })
      editorStatus.textContent = 'brouillon'
      editorStatus.className = 'badge s-brouillon'
      updateEditorButtons('brouillon')
      const idx = articles.findIndex(a => a.id === editingId)
    if (idx !== -1) { articles[idx].titre_interne = art.titre_interne; articles[idx].statut = 'brouillon'; renderArticles() }
    }
    regenBox.classList.add('hidden')
    regenFeedback.value = ''
    showToast('Article régénéré', 'success')
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
  finally { btnRegenGo.disabled = false; btnRegenGo.textContent = 'Confirmer la régénération' }
})

function extractTitle(body) {
  const firstLine = body.split('\n').find(l => l.trim().length > 0) ?? ''
  return firstLine.replace(/^#+\s*/, '').slice(0, 80)
}

// NEW ARTICLE
btnNew.addEventListener('click', async () => {
  newsModal.classList.remove('hidden')
  customPrompt.value = ''
  customPrompt.focus()
  $('news-list').innerHTML = '<div class="empty">Recherche des actualités en cours...</div>'
  currentNews = null
  try {
    const data = await api('/news')
    const items = data.news || []
    if (items.length === 0) { $('news-list').innerHTML = '<div class="empty">Aucune actualité trouvée</div>'; return }
    $('news-list').innerHTML = items.map((item, i) =>
      `<div class="news-item" data-idx="${i}">
        <h4>${esc(item.titre)}</h4>
        <div class="src">${esc(item.source)}</div>
        <div class="sum">${esc((item.resume || '').slice(0, 200))}</div>
      </div>`
    ).join('')
    $('news-list').querySelectorAll('.news-item').forEach(el => {
      el.addEventListener('click', () => {
        if (isGenerating) return
        $('news-list').querySelectorAll('.news-item').forEach(n => n.classList.remove('selected'))
        el.classList.add('selected')
        currentNews = items[parseInt(el.dataset.idx)]
        generateFromNews(currentNews)
      })
    })
  } catch (err) { $('news-list').innerHTML = '<div class="empty">Erreur: ' + esc(err.message) + '</div>' }
})

function setGenerating(loading) {
  isGenerating = loading
  const overlay = $('modal-loading')
  if (loading) {
    overlay.classList.remove('hidden')
    btnCustomGenerate.disabled = true
    btnCustomGenerate.textContent = 'Génération...'
    Object.assign(btnCustomGenerate.style, { minHeight: '44px' })
  } else {
    overlay.classList.add('hidden')
    btnCustomGenerate.disabled = false
    btnCustomGenerate.textContent = 'Générer'
  }
}

btnCustomGenerate.addEventListener('click', async () => {
  if (isGenerating) return
  const sujet = customPrompt.value.trim()
  if (!sujet || sujet.length < 3) { showToast('Indique un sujet (min. 3 caractères)', 'warning'); return }
  setGenerating(true)
  try {
    const data = await api('/generate', {
      method: 'POST',
      body: JSON.stringify({ customPrompt: sujet, feedback: '', provider: aiProvider.value, model: getSelectedModel() }),
    })
    currentIaMeta = data.ia
    currentIaMeta.image_options = data.article?.image_options || []
    const art = data.article
    showEditor(null)
    editTitre.value = art.titre_interne || sujet
    editAccrocheA.value = art.accroche_a || ''
    editAccrocheB.value = art.accroche_b || ''
    accrocheActive = 'a'
    accrocheRadios.forEach(r => r.checked = r.value === 'a')
    accrocheCards.forEach(c => c.classList.toggle('selected', c.dataset.value === 'a'))
    editCorps.value = (art.accroche_a || '') + '\n\n' + (art.corps || '')
    editHashtags.value = (art.hashtags || []).join(' ')
    setArticleImages(art.image_options || [], art.image_url)
    updateWords()
    updateCharCount()
    renderHashtagSuggestions()
    if (!art.titre_interne) {
      editTitre.value = extractTitle(editCorps.value) || sujet
    }
    currentNews = null
    customPrompt.value = ''
    newsModal.classList.add('hidden')
    showToast('Article généré !', 'success')
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
  finally { setGenerating(false) }
})

customPrompt.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnCustomGenerate.click()
})

btnAiPick.addEventListener('click', async () => {
  if (isGenerating) return
  try {
    const data = await api('/news')
    const items = data.news || []
    if (!items.length) { showToast('Aucune actualité', 'warning'); return }
    currentNews = items[Math.floor(Math.random() * items.length)]
    generateFromNews(currentNews)
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
})

modalClose.addEventListener('click', () => {
  if (isGenerating) return
  newsModal.classList.add('hidden')
})

async function generateFromNews(news) {
  if (isGenerating) return
  setGenerating(true)
  try {
    const data = await api('/generate', {
      method: 'POST',
      body: JSON.stringify({ news, feedback: '', provider: aiProvider.value, model: getSelectedModel() }),
    })
    currentIaMeta = data.ia
    currentIaMeta.image_options = data.article?.image_options || []
    const art = data.article
    showEditor(null)
    editTitre.value = art.titre_interne || ''
    editAccrocheA.value = art.accroche_a || ''
    editAccrocheB.value = art.accroche_b || ''
    accrocheActive = 'a'
    accrocheRadios.forEach(r => r.checked = r.value === 'a')
    accrocheCards.forEach(c => c.classList.toggle('selected', c.dataset.value === 'a'))
    editCorps.value = (art.accroche_a || '') + '\n\n' + (art.corps || '')
    editHashtags.value = (art.hashtags || []).join(' ')
    setArticleImages(art.image_options || [], art.image_url)
    updateWords()
    updateCharCount()
    renderHashtagSuggestions()
    if (!art.titre_interne) {
      editTitre.value = extractTitle(editCorps.value)
    }
    currentNews = news
    newsModal.classList.add('hidden')
    showToast('Article généré !', 'success')
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
  finally { setGenerating(false) }
}

// ─── DASHBOARD ──────────────────────────────────────────

let dashData = null

function showDashboard() {
  loginScreen.classList.add('hidden')
  mainScreen.classList.add('hidden')
  editorScreen.classList.add('hidden')
  dashboardScreen.classList.remove('hidden')
  appContainer.classList.remove('hidden')
  loadDashboard()
}

function showMainFromDashboard() {
  dashboardScreen.classList.add('hidden')
  appContainer.classList.remove('hidden')
  showMain()
}

btnDashboard.addEventListener('click', showDashboard)
btnDashBack.addEventListener('click', showMainFromDashboard)
btnDashRefresh.addEventListener('click', loadDashboard)

async function loadDashboard() {
  dashLoading.classList.remove('hidden')
  dashError.classList.add('hidden')
  btnDashRefresh.disabled = true
  dashUpdateInfo.textContent = '🔄 Chargement…'

  try {
    const data = await api('/dashboard')
    dashData = data
    window._lastSyncTime = Date.now()
    renderDashboard(data)
    dashUpdateInfo.textContent = `🔄 À l'instant`
    startSyncTimer()
  } catch (err) {
    dashError.classList.remove('hidden')
    dashErrorText.textContent = err.message || 'Erreur de chargement du tableau de bord'
    dashUpdateInfo.textContent = '⚠ Erreur'
  } finally {
    dashLoading.classList.add('hidden')
    btnDashRefresh.disabled = false
  }
}

btnDashSync.addEventListener('click', async () => {
  if (btnDashSync.classList.contains('syncing')) return
  btnDashSync.classList.add('syncing')
  btnDashSync.textContent = '☁ Sync…'
  try {
    const result = await api('/sync', { method: 'POST' })
    if (result.success && result.count > 0) {
      showToast(`${result.count} lignes synchronisées ✓`, 'success')
    } else {
      showToast(result.message || 'Aucune donnée disponible', 'warning')
    }
    await loadDashboard()
  } catch (err) {
    showToast('Erreur synchronisation: ' + err.message, 'error')
  } finally {
    btnDashSync.classList.remove('syncing')
    btnDashSync.textContent = '☁ Sync'
  }
})

function countUp(el, target, duration = 600) {
  const isInt = Number.isInteger(target)
  const start = performance.now()
  function step(now) {
    const progress = Math.min((now - start) / duration, 1)
    const current = isInt ? Math.round(progress * target) : parseFloat((progress * target).toFixed(1))
    const textNode = [...el.childNodes].find(n => n.nodeType === 3)
    if (textNode) textNode.textContent = current
    else el.textContent = current
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function startSyncTimer() {
  if (window._syncTimerInterval) clearInterval(window._syncTimerInterval)
  function tick() {
    const lastSync = window._lastSyncTime
    if (!lastSync) { dashUpdateInfo.textContent = ''; return }
    const elapsed = Math.floor((Date.now() - lastSync) / 1000)
    if (elapsed < 5) dashUpdateInfo.textContent = '🔄 À l\'instant'
    else if (elapsed < 60) dashUpdateInfo.textContent = '🔄 Synchronisé il y a ' + elapsed + 's'
    else if (elapsed < 3600) dashUpdateInfo.textContent = '🔄 Synchronisé il y a ' + Math.floor(elapsed / 60) + ' min'
    else dashUpdateInfo.textContent = '🔄 Synchronisé à ' + new Date(lastSync).toLocaleTimeString('fr-FR')
  }
  tick()
  window._syncTimerInterval = setInterval(tick, 30000)
}

function renderDashboard(data) {
  const { articles, sharepoint, synced } = data
  dashContent.innerHTML = ''

  // --- Source selection ---
  const hasSynced = synced && synced.headers && synced.items && synced.items.length > 0
  const hasSPData = sharepoint.connected && sharepoint.stats

  let displayHeaders, displayItems, displayStats
  if (hasSPData) {
    displayHeaders = sharepoint.headers
    displayItems = sharepoint.items
    displayStats = sharepoint.stats
  } else if (hasSynced) {
    displayHeaders = synced.headers
    displayItems = synced.items
    displayStats = computeClientStats(synced.headers, synced.items)
  }

  if (!displayStats) {
    dashContent.innerHTML = '<div class="dash-empty-state"><div class="dash-empty-icon">⏳</div><p>En attente de synchronisation SharePoint. Clique sur <strong>☁ Sync</strong> pour récupérer les données.</p></div>'
    return
  }

  const s = displayStats

  // ─── SECTION: KPI CARDS ─────────────────────────────────────
  const conf1Color = s.tauxConf1 >= 80 ? '#10B981' : s.tauxConf1 >= 60 ? '#F59E0B' : '#EF4444'
  const confDemColor = s.tauxConfDem >= 80 ? '#10B981' : s.tauxConfDem >= 60 ? '#F59E0B' : '#EF4444'
  const dureeColor = s.duree.zeroPct >= 90 ? '#10B981' : s.duree.zeroPct >= 70 ? '#F59E0B' : '#EF4444'
  const ecartColor = s.ecart.avg <= 0 ? '#10B981' : s.ecart.avg <= 3 ? '#F59E0B' : '#EF4444'

  const kpis = document.createElement('div')
  kpis.className = 'dash-kpi-grid'
  kpis.innerHTML = `
    <div class="dash-kpi-card" style="--accent:#0A66C2">
      <div class="dash-kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg></div>
      <div class="dash-kpi-body">
        <span class="dash-kpi-label">Total demandes</span>
        <span class="dash-kpi-value" data-target="${s.total}">${s.total}</span>
        <span class="dash-kpi-sub">dans le suivi 2026</span>
      </div>
    </div>
    <div class="dash-kpi-card" style="--accent:${conf1Color}">
      <div class="dash-kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
      <div class="dash-kpi-body">
        <span class="dash-kpi-label">Conformité 1ère diffusion</span>
        <span class="dash-kpi-value" data-target="${s.tauxConf1}">${s.tauxConf1}<span style="font-size:.6em;margin-left:1px">%</span></span>
        <span class="dash-kpi-sub">${s.tauxConf1 >= 80 ? '✓ Objectif atteint' : s.tauxConf1 >= 60 ? '⚠ Amélioration possible' : '✗ Non conforme'}</span>
      </div>
    </div>
    <div class="dash-kpi-card" style="--accent:${confDemColor}">
      <div class="dash-kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
      <div class="dash-kpi-body">
        <span class="dash-kpi-label">Conformité demande</span>
        <span class="dash-kpi-value" data-target="${s.tauxConfDem}">${s.tauxConfDem}<span style="font-size:.6em;margin-left:1px">%</span></span>
        <span class="dash-kpi-sub">${s.tauxConfDem >= 80 ? '✓ Conforme' : s.tauxConfDem >= 60 ? '⚠ Partiel' : '✗ Non conforme'}</span>
      </div>
    </div>
    <div class="dash-kpi-card" style="--accent:${dureeColor}">
      <div class="dash-kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div class="dash-kpi-body">
        <span class="dash-kpi-label">Délai de traitement</span>
        <span class="dash-kpi-value" data-target="${s.duree.zeroPct}">${s.duree.zeroPct}<span style="font-size:.6em;margin-left:1px">%</span></span>
        <span class="dash-kpi-sub">traités en J+0 · ${s.duree.gtZero} demandes &gt;1j</span>
      </div>
    </div>
    <div class="dash-kpi-card" style="--accent:${ecartColor}">
      <div class="dash-kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
      <div class="dash-kpi-body">
        <span class="dash-kpi-label">Avance / Retard</span>
        <span class="dash-kpi-value" data-target="${Math.abs(s.ecart.avg)}">${s.ecart.avg <= 0 ? '' : '+'}${Math.abs(s.ecart.avg)}<span style="font-size:.6em;margin-left:2px">j</span></span>
        <span class="dash-kpi-sub">${s.ecart.avg <= 0 ? '✓ Avance sur délai' : '⚠ Retard contractuel'}</span>
      </div>
    </div>
    <div class="dash-kpi-card" style="--accent:#8B5CF6">
      <div class="dash-kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
      <div class="dash-kpi-body">
        <span class="dash-kpi-label">Échéance contractuelle</span>
        <span class="dash-kpi-value" data-target="${s.echeance.avg}">${s.echeance.avg}<span style="font-size:.6em;margin-left:2px">j</span></span>
        <span class="dash-kpi-sub">délai moyen · max ${s.echeance.max}j</span>
      </div>
    </div>
  `
  dashContent.appendChild(kpis)

  // Animate KPI values with staggered count-up
  const kpiValues = kpis.querySelectorAll('.dash-kpi-value[data-target]')
  kpiValues.forEach((el, i) => {
    const target = parseFloat(el.dataset.target)
    if (isNaN(target)) return
    const textNode = [...el.childNodes].find(n => n.nodeType === 3)
    if (textNode) textNode.textContent = '0'
    else el.textContent = '0'
    setTimeout(() => countUp(el, target, 600), i * 100)
  })

  // ─── SECTION: CHARTS ROW 1 (État avancement + Type) ──────
  const chartsRow1 = document.createElement('div')
  chartsRow1.className = 'dashboard__charts-row'
  chartsRow1.appendChild(createBarChart('État d\'avancement', s.avancementDist, statusColors))
  chartsRow1.appendChild(createBarChart('Type de demande', s.typeDist.slice(0, 8), typeColors))
  dashContent.appendChild(chartsRow1)

  // ─── SECTION: CHARTS ROW 2 (Nature + Site) ──────────────
  if (s.natureDist.length > 0 || s.siteDist.length > 0) {
    const chartsRow2 = document.createElement('div')
    chartsRow2.className = 'dashboard__charts-row'
    if (s.natureDist.length > 0) {
      chartsRow2.appendChild(createBarChart('Nature de la demande', s.natureDist.slice(0, 8), natureColors))
    }
    if (s.siteDist.length > 0) {
      chartsRow2.appendChild(createBarChart('Par site', s.siteDist.slice(0, 8), siteColors))
    }
    dashContent.appendChild(chartsRow2)
  }

  // ─── SECTION: CONFORMITÉ ──────────────────────────────────
  const confRow = document.createElement('div')
  confRow.className = 'dashboard__charts-row'
  if (s.conf1Dist.length > 0) {
    confRow.appendChild(createBarChart('Conformité 1ère diffusion', s.conf1Dist, confColors))
  }
  if (s.confDemDist.length > 0) {
    confRow.appendChild(createBarChart('Conformité demande', s.confDemDist, confColors))
  }
  if (confRow.children.length > 0) dashContent.appendChild(confRow)

  // ─── SECTION: TOP DEMANDEURS ──────────────────────────────
  if (s.topDemandeurs.length > 0) {
    const demCard = document.createElement('div')
    demCard.className = 'dashboard__chart-card dashboard__chart-card--full'
    demCard.innerHTML = '<h3>🏢 Top 10 demandeurs</h3>'
    const list = document.createElement('div')
    list.className = 'dash-bar-list'
    const maxDem = Math.max(...s.topDemandeurs.map(d => d.count), 1)
    s.topDemandeurs.forEach(item => {
      const pct = (item.count / maxDem) * 100
      const bar = document.createElement('div')
      bar.className = 'dash-bar-item'
      bar.innerHTML = `
        <div class="dash-bar-header">
          <span class="dash-bar-label">${esc(item.label)}</span>
          <span class="dash-bar-count">${item.count}</span>
        </div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct}%;background:#0A66C2"></div></div>`
      list.appendChild(bar)
    })
    demCard.appendChild(list)
    dashContent.appendChild(demCard)
  }

  // ─── SECTION: DÉLAIS ──────────────────────────────────────
  if (s.duree.count > 0 || s.ecart.count > 0) {
    const dureePct = s.duree.zeroPct
    const gtZeroPct = 100 - dureePct
    const ecartAbs = Math.abs(s.ecart.avg).toFixed(1)
    const ecartSign = s.ecart.avg <= 0 ? 'avance' : 'retard'
    const ecartLabel = s.ecart.avg <= 0 ? `Avance ${ecartAbs}j` : `Retard ${ecartAbs}j`
    const ecartColor = s.ecart.avg <= 0 ? '#10B981' : '#EF4444'

    const delaisCard = document.createElement('div')
    delaisCard.className = 'dashboard__chart-card dashboard__chart-card--full'
    delaisCard.innerHTML = '<h3 style="margin-bottom:var(--space-3)">⏱ Délais de traitement</h3>'
    const delGrid = document.createElement('div')
    delGrid.className = 'dash-delais-grid'
    delGrid.innerHTML = `
      <div class="dash-delais-card">
        <div class="dash-delais-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span class="dash-delais-heading">Traitement</span>
        </div>
        <span class="dash-delais-bignum" style="color:#0A66C2">${dureePct}<span style="font-size:.45em;margin-left:1px">%</span></span>
        <span class="dash-delais-desc">traités en J+0</span>
        <div class="dash-delais-track"><div class="dash-delais-fill" style="width:${dureePct}%;background:#0A66C2"></div></div>
        <span class="dash-delais-note">${s.duree.gtZero} demandes >1j · max ${s.duree.max}j</span>
      </div>
      <div class="dash-delais-card">
        <div class="dash-delais-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span class="dash-delais-heading">Échéance</span>
        </div>
        <span class="dash-delais-bignum" style="color:#8B5CF6">${s.echeance.avg}<span style="font-size:.45em;margin-left:1px">j</span></span>
        <span class="dash-delais-desc">délai contractuel moyen</span>
        <div class="dash-delais-track"><div class="dash-delais-fill" style="width:${Math.min(100, s.echeance.avg * 25)}%;background:#8B5CF6"></div></div>
        <span class="dash-delais-note">min ${s.echeance.min}j · max ${s.echeance.max}j</span>
      </div>
      <div class="dash-delais-card">
        <div class="dash-delais-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${ecartColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span class="dash-delais-heading">Avance / Retard</span>
        </div>
        <span class="dash-delais-bignum" style="color:${ecartColor}">${ecartAbs}<span style="font-size:.45em;margin-left:1px">j</span></span>
        <span class="dash-delais-desc">${ecartLabel}</span>
        <div class="dash-delais-track"><div class="dash-delais-fill" style="width:${Math.min(100, (Math.abs(s.ecart.avg) / Math.max(Math.abs(s.ecart.max), 1)) * 100)}%;background:${ecartColor}"></div></div>
        <span class="dash-delais-note">min ${s.ecart.min}j · max ${s.ecart.max}j</span>
      </div>
    `
    delaisCard.appendChild(delGrid)
    dashContent.appendChild(delaisCard)
  }

  // ─── SECTION: ÉVOLUTION MENSUELLE ────────────────────────
  if (s.monthlyTrend && s.monthlyTrend.length > 0) {
    const monthlyCard = document.createElement('div')
    monthlyCard.className = 'dashboard__chart-card dashboard__chart-card--full'
    monthlyCard.innerHTML = '<h3>📈 Évolution mensuelle (date dépôt)</h3>'
    monthlyCard.appendChild(renderMonthlyChart(s.monthlyTrend))
    dashContent.appendChild(monthlyCard)
  }

  // ─── SECTION: TABLEAU ─────────────────────────────────────
  if (displayItems && displayItems.length > 0) {
    dashContent.appendChild(renderDataTable(displayHeaders, displayItems, s))
  }
}

function computeClientStats(headers, items) {
  const norm = x => x.toLowerCase().replace(/[\s\/]+/g, '_').replace(/[^a-z0-9_]/g, '')
  const h = name => {
    const n = norm(name)
    const match = headers.find(x => norm(x) === n || x === name)
    const header = match || headers.find(x => norm(x).includes(n.slice(0, 6))) || ''
    return header ? norm(header) : ''
  }

  const avancementField = h('Etat d\'avance de la demande')
  const typeField = h('Type de demande')
  const natureField = h('Nature de la demande')
  const siteField = h('Site')
  const demandeurField = h('Demandeurs')
  const dateDepotField = h('Date de dépôt du dossier sur docinfo')
  const conformite1Field = h('Conformité à la première diffusion')
  const conformiteDemField = h('Conformité de la demande')
  const dureeField = h('Durée de traitement (jours) 1')
  const echeanceField = h('Echéance contractuelle (jours) 1')
  const ecartField = h('Ecart de traitement (jour) 1')

  // Filter out empty rows
  const keyFields = [avancementField, typeField, natureField, siteField, demandeurField].filter(Boolean)
  const filteredItems = items.filter(item => keyFields.some(k => item[k] && item[k].trim().length > 0))
  items = filteredItems
  const total = items.length

  // --- Avancement ---
  const avancementGroups = {}
  items.forEach(item => {
    const v = (item[avancementField] || '').trim()
    if (v) avancementGroups[v] = (avancementGroups[v] || 0) + 1
  })
  const avancementDist = Object.entries(avancementGroups)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  // --- Type de demande ---
  const typeGroups = {}
  items.forEach(item => {
    const v = (item[typeField] || '').trim()
    if (v) typeGroups[v] = (typeGroups[v] || 0) + 1
  })
  const typeDist = Object.entries(typeGroups)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  // --- Nature de la demande ---
  const natureGroups = {}
  items.forEach(item => {
    const v = (item[natureField] || '').trim()
    if (v) natureGroups[v] = (natureGroups[v] || 0) + 1
  })
  const natureDist = Object.entries(natureGroups)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  // --- Site ---
  const siteGroups = {}
  items.forEach(item => {
    const v = (item[siteField] || '').trim()
    if (v) siteGroups[v] = (siteGroups[v] || 0) + 1
  })
  const siteDist = Object.entries(siteGroups)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  // --- Top demandeurs ---
  const demGroups = {}
  items.forEach(item => {
    const v = (item[demandeurField] || '').trim()
    if (v) demGroups[v] = (demGroups[v] || 0) + 1
  })
  const topDemandeurs = Object.entries(demGroups)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // --- Conformité 1ère diffusion ---
  const conf1Values = {}
  items.forEach(item => {
    const v = (item[conformite1Field] || '').trim().toLowerCase()
    if (v) conf1Values[v] = (conf1Values[v] || 0) + 1
  })
  const conf1Count = Object.values(conf1Values).reduce((a, b) => a + b, 0)
  const conf1Ok = (conf1Values['oui'] || 0) + (conf1Values['conforme'] || 0)
  const tauxConf1 = conf1Count > 0 ? Math.round((conf1Ok / conf1Count) * 100) : 0
  const conf1Dist = Object.entries(conf1Values)
    .map(([label, count]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), count }))
    .sort((a, b) => b.count - a.count)

  // --- Conformité de la demande ---
  const confDemValues = {}
  items.forEach(item => {
    const v = (item[conformiteDemField] || '').trim().toLowerCase()
    if (v) confDemValues[v] = (confDemValues[v] || 0) + 1
  })
  const confDemCount = Object.values(confDemValues).reduce((a, b) => a + b, 0)
  const confDemOk = (confDemValues['oui'] || 0) + (confDemValues['conforme'] || 0)
  const tauxConfDem = confDemCount > 0 ? Math.round((confDemOk / confDemCount) * 100) : 0
  const confDemDist = Object.entries(confDemValues)
    .map(([label, count]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), count }))
    .sort((a, b) => b.count - a.count)

  // --- Délais (robuste : outliers filtrés) ---
  function parseNum(val) {
    if (!val) return NaN
    const n = parseFloat(String(val).replace(',', '.').replace(/[^0-9.\-]/g, ''))
    return isNaN(n) ? NaN : n
  }
  const MAX_DAYS = 365
  const rawDurees = items.map(i => parseNum(i[dureeField])).filter(v => !isNaN(v))
  const durees = rawDurees.filter(v => v >= 0 && v <= MAX_DAYS)

  const rawEcheances = items.map(i => parseNum(i[echeanceField])).filter(v => !isNaN(v))
  const echeances = rawEcheances.filter(v => v >= 0 && v <= MAX_DAYS)

  const rawEcarts = items.map(i => parseNum(i[ecartField])).filter(v => !isNaN(v))
  const ecarts = rawEcarts.filter(v => Math.abs(v) <= MAX_DAYS)

  const delaiStats = (values) => {
    if (values.length === 0) return { min: 0, max: 0, avg: 0, median: 0, count: 0, zeroPct: 0, gtZero: 0 }
    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)
    const zeroCount = values.filter(v => v === 0).length
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round((sum / values.length) * 10) / 10,
      median: sorted[Math.floor(sorted.length / 2)],
      count: values.length,
      zeroPct: values.length > 0 ? Math.round((zeroCount / values.length) * 100) : 0,
      gtZero: values.length - zeroCount,
    }
  }

  // --- Monthly trend (date dépôt) ---
  const monthlyTrend = {}
  items.forEach(item => {
    const raw = item[dateDepotField] || ''
    if (!raw) return
    try {
      // Try DD/MM/YYYY or YYYY-MM-DD
      let d
      if (/\//.test(raw)) {
        const parts = raw.split('/')
        if (parts.length === 3) d = new Date(parts[2], parts[1] - 1, parts[0])
      } else {
        d = new Date(raw)
      }
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyTrend[key] = (monthlyTrend[key] || 0) + 1
    } catch {}
  })

  return {
    total,
    avancementDist,
    typeDist,
    natureDist,
    siteDist,
    topDemandeurs,
    tauxConf1,
    conf1Dist,
    tauxConfDem,
    confDemDist,
    duree: delaiStats(durees),
    echeance: delaiStats(echeances),
    ecart: delaiStats(ecarts),
    monthlyTrend: Object.entries(monthlyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count })),
  }
}

const statusColors = {
  'Nouvelle': '#0A66C2', 'Nouveau': '#0A66C2',
  'En cours': '#B45309', 'Encours': '#B45309',
  'En attente': '#64748B', 'Enattente': '#64748B',
  'Terminée': '#15803D', 'Terminé': '#15803D', 'Termine': '#15803D',
  'Annulée': '#DC2626', 'Annulé': '#DC2626', 'Annule': '#DC2626',
  'A traiter': '#F59E0B', 'Atraiter': '#F59E0B',
  'Clôturée': '#16A34A', 'Cloturee': '#16A34A', 'Clôturé': '#16A34A',
}

const natureColors = {
  'AMDEC': '#0A66C2', 'AMDEC ': '#0A66C2',
  'MQT': '#7C3AED',
  'Sécurité': '#DC2626', 'Securite': '#DC2626',
  'Maintenance': '#D4A017',
  'Qualité': '#16A34A', 'Qualite': '#16A34A',
  'Fiabilité': '#0D9488', 'Fiabilite': '#0D9488',
  'GMAO': '#6366F1',
}

const siteColors = ['#0A66C2', '#7C3AED', '#D4A017', '#16A34A', '#DC2626', '#0D9488', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6']

const typeColors = ['#0A66C2', '#7C3AED', '#D4A017', '#16A34A', '#DC2626', '#0D9488', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6']

const confColors = { 'Oui': '#16A34A', 'Non': '#DC2626', 'Conforme': '#16A34A', 'Non conforme': '#DC2626' }

function createBarChart(title, data, colorMap) {
  const card = document.createElement('div')
  card.className = 'dashboard__chart-card'
  card.innerHTML = `<h3>${title}</h3>`
  if (!data || data.length === 0) {
    card.innerHTML += '<div style="color:var(--clr-text-muted);font-size:var(--text-sm);padding:20px 0;text-align:center">Aucune donnée</div>'
    return card
  }
  const maxCount = Math.max(...data.map(d => d.count))
  const list = document.createElement('div')
  list.className = 'dash-bar-list'
  data.forEach(item => {
    const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0
    const color = typeof colorMap === 'function' ? colorMap(item.label) : (colorMap[item.label] || '#0A66C2')
    const bar = document.createElement('div')
    bar.className = 'dash-bar-item'
    bar.innerHTML = `
      <div class="dash-bar-header">
        <span class="dash-bar-label">${esc(item.label)}</span>
        <span class="dash-bar-count">${item.count}</span>
      </div>
      <div class="dash-bar-track">
        <div class="dash-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    `
    list.appendChild(bar)
  })
  card.appendChild(list)
  return card
}

function renderMonthlyChart(monthlyData) {
  const container = document.createElement('div')
  container.className = 'dash-monthly'
  if (!monthlyData || monthlyData.length === 0) {
    container.innerHTML = '<div style="color:var(--clr-text-muted);font-size:var(--text-sm);text-align:center;width:100%">Aucune donnée mensuelle</div>'
    return container
  }
  const maxCount = Math.max(...monthlyData.map(d => d.count), 1)
  monthlyData.forEach(item => {
    const pct = (item.count / maxCount) * 100
    const col = document.createElement('div')
    col.className = 'dash-monthly-col'
    col.innerHTML = `
      <div class="dash-monthly-bar" style="height:${Math.max(pct, 4)}%">
        <span class="dash-tooltip">${item.count} demande${item.count > 1 ? 's' : ''}</span>
      </div>
      <span class="dash-monthly-label">${item.month.slice(5)}</span>
    `
    container.appendChild(col)
  })
  return container
}

function renderDataTable(headers, items, stats) {
  const norm = x => x.toLowerCase().replace(/[\s\/]+/g, '_').replace(/[^a-z0-9_]/g, '')
  const h = name => {
    const n = norm(name)
    const match = headers.find(x => norm(x) === n || x === name)
    return match ? norm(match) : ''
  }
  const statusField = h("Etat d'avance de la demande")
  const typeField = h('Type de demande')
  const natureField = h('Nature de la demande')
  const siteField = h('Site')
  const demandeurField = h('Demandeurs')
  const dateField = h('Date de dépôt du dossier sur docinfo')
  const dateTraitField = h('Date de traitement IMMEIT')
  const numField = h("N°(BE / GERICO / APEX)")
  const bancField = h('Nom du banc\nNom entreprise')
  const periodiciteField = h('Périodicité')
  const conformiteField = h('Conformité à la première diffusion')

  const displayFields = [
    { key: dateField, label: 'Dépôt' },
    { key: siteField, label: 'Site' },
    { key: demandeurField, label: 'Demandeur' },
    { key: typeField, label: 'Type' },
    { key: natureField, label: 'Nature' },
    { key: statusField, label: 'Avancement' },
    { key: dateTraitField, label: 'Traitement' },
  ].filter(f => f.key)

  const headerHtml = displayFields.map(f => `<th>${esc(f.label)}</th>`).join('')

  function getCellValue(item, key) {
    return item[key] !== undefined ? item[key] : ''
  }

  const ROWS = 100
  const rowsHtml = items.slice(0, ROWS).map(item => {
    const status = (getCellValue(item, statusField) || '').toLowerCase().replace(/[\s\-]+/g, '-')
    const cells = displayFields.map(f => {
      const val = getCellValue(item, f.key)
      const displayVal = val.length > 60 ? val.slice(0, 60) + '…' : val
      if (f.key === statusField) {
        const cls = status ? `dash-badge dash-st-${status}` : ''
        return `<td><span class="${cls}">${esc(displayVal || '—')}</span></td>`
      }
      if (f.key === dateField || f.key === dateTraitField) {
        return `<td style="white-space:nowrap">${esc(formatDateCell(displayVal) || '—')}</td>`
      }
      return `<td>${esc(displayVal || '—')}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  const statusFilter = document.createElement('select')
  statusFilter.id = 'dash-filter-status'
  const uniqueStatuses = [...new Set(items.map(i => i[statusField || ''] || '').filter(Boolean))]
  statusFilter.innerHTML = '<option value="">Tous les statuts</option>' +
    uniqueStatuses.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')

  const searchInput = document.createElement('input')
  searchInput.type = 'text'
  searchInput.id = 'dash-filter-search'
  searchInput.placeholder = 'Rechercher…'

  const showing = Math.min(items.length, ROWS)
  const card = document.createElement('div')
  card.className = 'dashboard__table-card'
  card.id = 'dash-table-card'
  card.innerHTML = `
    <div class="dashboard__table-header">
      <h3>Demandes <span style="font-weight:400;color:var(--clr-text-muted);font-size:var(--text-xs)">${showing}/${items.length} affichées</span></h3>
    </div>
    <div class="dashboard__table-wrap">
      <table>
        <thead><tr>${headerHtml}</tr></thead>
        <tbody id="dash-tbody">${rowsHtml}</tbody>
      </table>
    </div>
  `

  const headerDiv = card.querySelector('.dashboard__table-header')
  const filtersDiv = document.createElement('div')
  filtersDiv.className = 'dashboard__table-filters'
  filtersDiv.appendChild(statusFilter)
  filtersDiv.appendChild(searchInput)
  headerDiv.appendChild(filtersDiv)

  function applyFilters() {
    const stVal = statusFilter.value.toLowerCase()
    const searchVal = searchInput.value.toLowerCase()
    const tbody = card.querySelector('#dash-tbody')
    const filtered = items.filter(item => {
      const st = (getCellValue(item, statusField) || '').toLowerCase()
      if (stVal && st !== stVal) return false
      if (searchVal) {
        const allText = Object.values(item).join(' ').toLowerCase()
        if (!allText.includes(searchVal)) return false
      }
      return true
    }).slice(0, ROWS)

    const hdr = card.querySelector('.dashboard__table-header h3')
    if (hdr) hdr.innerHTML = `Demandes <span style="font-weight:400;color:var(--clr-text-muted);font-size:var(--text-xs)">${Math.min(filtered.length, ROWS)}/${items.length} affichées</span>`

    tbody.innerHTML = filtered.map(item => {
      const st = (getCellValue(item, statusField) || '').toLowerCase().replace(/[\s\-]+/g, '-')
      const cells = displayFields.map(f => {
        const val = getCellValue(item, f.key)
        const displayVal = val.length > 60 ? val.slice(0, 60) + '…' : val
        if (f.key === statusField) {
          return `<td><span class="dash-badge dash-st-${st || 'nouvelle'}">${esc(displayVal || '—')}</span></td>`
        }
        if (f.key === dateField || f.key === dateTraitField) {
          return `<td style="white-space:nowrap">${esc(formatDateCell(displayVal) || '—')}</td>`
        }
        return `<td>${esc(displayVal || '—')}</td>`
      }).join('')
      return `<tr>${cells}</tr>`
    }).join('')
  }

  statusFilter.addEventListener('change', applyFilters)
  searchInput.addEventListener('input', applyFilters)

  return card
}

function formatDateCell(val) {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val).slice(0, 10)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(val).slice(0, 10)
  }
}

// INIT
async function init() {
  if (hasSession()) {
    await loadAvailableModels()
    showMain()
  } else showLogin()
}

init()
