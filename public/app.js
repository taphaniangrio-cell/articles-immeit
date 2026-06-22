const API_BASE = '/api'

let articles = []
let filter = ''
let editingId = null
let currentNews = null
let regenNews = null
let availableModels = null

const $ = id => document.getElementById(id)

const loginScreen = $('login-screen'), mainScreen = $('main-screen'), editorScreen = $('editor-screen')
const loginForm = $('login-form'), loginPassword = $('login-password'), loginError = $('login-error')
const editTitre = $('edit-titre'), editCorps = $('edit-corps'), editHashtags = $('edit-hashtags')
const editSource = $('edit-source'), editDates = $('edit-dates')
const btnBack = $('btn-back'), btnSave = $('btn-save'), btnValidate = $('btn-validate')
const btnCopy = $('btn-copy'), btnDelete = $('btn-delete'), btnRegen = $('btn-regen'), btnRegenGo = $('btn-regen-go')
const btnNew = $('btn-new'), btnLogout = $('btn-logout')
const newsModal = $('news-modal'), modalClose = $('modal-close'), btnAiPick = $('btn-ai-pick')
const regenBox = $('regen-box'), regenFeedback = $('regen-feedback')
const wordCount = $('word-count'), editorStatus = $('editor-status'), editorTitle = $('editor-title')
const articleList = $('article-list')
const aiProvider = $('ai-provider'), aiModel = $('ai-model'), aiKeyStatus = $('ai-key-status')

function toast(msg) {
  const t = $('toast')
  t.textContent = msg
  t.classList.remove('hidden')
  setTimeout(() => t.classList.add('hidden'), 2600)
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
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

function hasSession() {
  return document.cookie.includes('session=') || localStorage.getItem('immeit_token')
}

// SETTINGS IA
function loadAiSettings(forceProvider) {
  const provider = forceProvider || localStorage.getItem('immeit_ai_provider') || 'groq'
  return {
    provider,
    model: localStorage.getItem(`immeit_ai_model_${provider}`) || '',
  }
}

function saveAiSettings(provider, model) {
  localStorage.setItem('immeit_ai_provider', provider)
  if (model) localStorage.setItem(`immeit_ai_model_${provider}`, model)
}

async function loadAvailableModels() {
  try {
    const data = await api('/models')
    availableModels = data.models
    populateAiSelector()
  } catch {}
}

function populateAiSelector() {
  if (!availableModels) return
  const settings = loadAiSettings()

  aiProvider.innerHTML = Object.entries(availableModels)
    .map(([key, val]) => `<option value="${key}"${key === settings.provider ? ' selected' : ''}>${val.label}${!val.enabled ? ' (non configuré)' : ''}</option>`)
    .join('')

  updateModelList()
}

function updateModelList() {
  const prov = aiProvider.value
  const provData = availableModels?.[prov]
  if (!provData) return
  const settings = loadAiSettings(prov)

  let found = false
  aiModel.innerHTML = provData.models.map(m => {
    const selected = m.id === settings.model || (!settings.model && m.id === provData.default)
    if (selected) found = true
    const suffix = m.free ? ' ★ gratuit' : ''
    return `<option value="${m.id}"${selected ? ' selected' : ''}>${m.label}${suffix}</option>`
  }).join('')

  // Fallback au premier modèle si le saved n'existe plus
  if (!found && aiModel.options.length > 0) {
    aiModel.value = aiModel.options[0].value
  }

  if (provData.enabled) {
    aiKeyStatus.textContent = '✓ Clé configurée'
    aiKeyStatus.className = 'key-ok'
  } else {
    aiKeyStatus.textContent = `⚠ Clé ${provData.needsKey || 'manquante'}`
    aiKeyStatus.className = 'key-missing'
  }

  saveAiSettings(prov, aiModel.value)
}

aiProvider.addEventListener('change', () => {
  updateModelList()
})

aiModel.addEventListener('change', () => {
  saveAiSettings(aiProvider.value, aiModel.value)
})

function getSelectedModel() {
  return aiModel.value || ''
}

// LOGIN
loginForm.addEventListener('submit', async e => {
  e.preventDefault()
  loginError.classList.add('hidden')
  const password = loginPassword.value.trim()
  try {
    const data = await api('/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    if (data.token) localStorage.setItem('immeit_token', data.token)
    showMain()
  } catch (err) {
    loginError.textContent = err.message
    loginError.classList.remove('hidden')
  }
})

btnLogout.addEventListener('click', () => {
  localStorage.removeItem('immeit_token')
  document.cookie = 'session=; Path=/; Max-Age=0'
  showLogin()
})

// NAVIGATION
function showLogin() {
  loginScreen.classList.remove('hidden')
  mainScreen.classList.add('hidden')
  editorScreen.classList.add('hidden')
  loginPassword.value = ''
  loginPassword.focus()
}

function showMain() {
  loginScreen.classList.add('hidden')
  editorScreen.classList.add('hidden')
  mainScreen.classList.remove('hidden')
  loadArticles()
}

function showEditor(article) {
  mainScreen.classList.add('hidden')
  editorScreen.classList.remove('hidden')
  editingId = article ? article.id : null
  regenNews = null

  if (article) {
    editorTitle.textContent = 'Modifier l\'article'
    editTitre.value = article.titre_interne || ''
    editCorps.value = article.corps || ''
    const h = article.hashtags || []
    editHashtags.value = Array.isArray(h) ? h.join(' ') : String(h)
    editorStatus.textContent = article.statut
    editorStatus.className = 'badge ' + statusClass(article.statut)
    btnValidate.textContent = (article.statut === 'valide' || article.statut === 'publie') ? 'Déjà ' + article.statut : 'Valider'
    btnValidate.disabled = article.statut === 'valide' || article.statut === 'publie'
    editSource.textContent = article.source_news_titre ? esc(article.source_news_titre) : '—'
    editDates.textContent = [
      article.date_creation ? 'Créé: ' + fmtDate(article.date_creation) : '',
      article.date_validation ? 'Validé: ' + fmtDate(article.date_validation) : '',
      article.date_publication ? 'Publié: ' + fmtDate(article.date_publication) : '',
    ].filter(Boolean).join('\n') || '—'
    if (article.source_news_titre) {
      regenNews = { titre: article.source_news_titre, url: article.source_news_url || '', resume: (article.corps || '').slice(0, 200), source: article.source_news_source || '' }
    }
  } else {
    editorTitle.textContent = 'Nouvel article'
    editTitre.value = ''
    editCorps.value = ''
    editHashtags.value = ''
    editSource.textContent = currentNews ? esc(currentNews.titre) : '—'
    editDates.textContent = '—'
    editorStatus.textContent = 'brouillon'
    editorStatus.className = 'badge s-brouillon'
    btnValidate.textContent = 'Valider'
    btnValidate.disabled = true
  }
  updateWords()
  regenBox.classList.add('hidden')
}

btnBack.addEventListener('click', () => showMain())

// LOAD ARTICLES
async function loadArticles() {
  try {
    const params = filter ? `?statut=${filter}` : ''
    const data = await api(`/articles${params}`)
    articles = data.articles || []
    renderArticles()
  } catch {
    articleList.innerHTML = '<div class="empty">Erreur de chargement</div>'
  }
}

// RENDER
function renderArticles() {
  if (articles.length === 0) {
    articleList.innerHTML = '<div class="empty">Aucun article trouvé</div>'
    return
  }
  articleList.innerHTML = articles.map(a => `
    <div class="article-card" data-id="${a.id}">
      <div class="article-card-top">
        <h3>${esc(a.titre_interne || '(sans titre)')}</h3>
        <span class="status ${statusClass(a.statut)}">${a.statut}</span>
      </div>
      <div class="meta">
        <span>${fmtDate(a.date_creation)}</span>
        ${a.source_news_titre ? `<span>${esc(a.source_news_titre.slice(0, 50))}</span>` : ''}
      </div>
    </div>`).join('')

  articleList.querySelectorAll('.article-card').forEach(c => {
    c.addEventListener('click', () => {
      const a = articles.find(x => x.id === parseInt(c.dataset.id))
      if (a) showEditor(a)
    })
  })
}

// FILTERS
document.querySelectorAll('.filter-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
    filter = b.dataset.filter
    loadArticles()
  })
})

// WORD COUNT
editCorps.addEventListener('input', updateWords)
function updateWords() {
  const w = editCorps.value.trim() ? editCorps.value.trim().split(/\s+/).length : 0
  wordCount.textContent = w + ' mots'
}

// SAVE
btnSave.addEventListener('click', async () => {
  const data = {
    titre_interne: editTitre.value,
    corps: editCorps.value,
    hashtags: editHashtags.value.split(/\s+/).filter(h => h),
  }

  try {
    if (editingId) {
      await api(`/articles?id=${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      toast('Article enregistré')
    } else {
      const articleData = {
        ...data,
        source_news_titre: currentNews?.titre || null,
        source_news_url: currentNews?.url || null,
        source_news_source: currentNews?.source || null,
      }
      const result = await api('/articles', {
        method: 'POST',
        body: JSON.stringify(articleData),
      })
      editingId = result.article.id
      editorStatus.textContent = 'brouillon'
      editorStatus.className = 'badge s-brouillon'
      btnValidate.disabled = false
      toast('Article créé')
    }
    await loadArticles()
  } catch (err) {
    toast('Erreur: ' + err.message)
  }
})

// VALIDATE
btnValidate.addEventListener('click', async () => {
  if (!editingId) return
  try {
    await api(`/articles?id=${editingId}`, {
      method: 'PUT',
      body: JSON.stringify({ statut: 'valide', date_validation: new Date().toISOString() }),
    })
    editorStatus.textContent = 'valide'
    editorStatus.className = 'badge s-valide'
    btnValidate.textContent = 'Déjà validé'
    btnValidate.disabled = true
    toast('Article validé')
    await loadArticles()
  } catch (err) {
    toast('Erreur: ' + err.message)
  }
})

// COPY
btnCopy.addEventListener('click', async () => {
  let text = editCorps.value
  const h = editHashtags.value.split(/\s+/).filter(h => h)
  if (h.length) text += '\n\n' + h.join(' ')
  try {
    await navigator.clipboard.writeText(text)
    if (editingId) {
      await api(`/articles?id=${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({ statut: 'publie', date_publication: new Date().toISOString() }),
      })
      editorStatus.textContent = 'publie'
      editorStatus.className = 'badge s-publie'
      btnValidate.disabled = true
      await loadArticles()
    }
    toast('Copié dans le presse-papiers !')
  } catch {
    toast('Erreur de copie')
  }
})

// DELETE
btnDelete.addEventListener('click', async () => {
  if (!editingId) return
  if (!confirm('Supprimer cet article ?')) return
  try {
    await api(`/articles?id=${editingId}`, { method: 'DELETE' })
    toast('Article supprimé')
    editingId = null
    showMain()
  } catch (err) {
    toast('Erreur: ' + err.message)
  }
})

// REGENERATE
btnRegen.addEventListener('click', () => regenBox.classList.toggle('hidden'))

btnRegenGo.addEventListener('click', async () => {
  const news = currentNews || regenNews
  if (!news) {
    toast('Aucune actualité source. Regénère depuis "Nouvel article".')
    return
  }
  const feedback = regenFeedback.value
  btnRegenGo.disabled = true
  btnRegenGo.textContent = 'Génération...'
  try {
    const data = await api('/generate', {
      method: 'POST',
      body: JSON.stringify({
        news,
        feedback,
        provider: aiProvider.value,
        model: getSelectedModel(),
      }),
    })
    const art = data.article
    editTitre.value = art.titre_interne || ''
    const corps = `Accroche A :\n${art.accroche_a || ''}\n\nAccroche B :\n${art.accroche_b || ''}\n\n${art.corps || ''}`
    editCorps.value = corps
    editHashtags.value = (art.hashtags || []).join(' ')
    updateWords()
    if (editingId) {
      await api(`/articles?id=${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          titre_interne: art.titre_interne,
          corps,
          hashtags: art.hashtags || [],
          statut: 'brouillon',
        }),
      })
      editorStatus.textContent = 'brouillon'
      editorStatus.className = 'badge s-brouillon'
      btnValidate.textContent = 'Valider'
      btnValidate.disabled = false
      await loadArticles()
    }
    regenBox.classList.add('hidden')
    regenFeedback.value = ''
    toast('Article régénéré')
  } catch (err) {
    toast('Erreur: ' + err.message)
  } finally {
    btnRegenGo.disabled = false
    btnRegenGo.textContent = 'Confirmer la régénération'
  }
})

// NEW ARTICLE
btnNew.addEventListener('click', async () => {
  newsModal.classList.remove('hidden')
  $('news-list').innerHTML = '<div class="empty">Recherche des actualités en cours...</div>'
  currentNews = null
  try {
    const data = await api('/news')
    const items = data.news || []
    if (items.length === 0) {
      $('news-list').innerHTML = '<div class="empty">Aucune actualité trouvée</div>'
      return
    }
    $('news-list').innerHTML = items.map((item, i) =>
      `<div class="news-item" data-idx="${i}">
        <h4>${esc(item.titre)}</h4>
        <div class="src">${esc(item.source)}</div>
        <div class="sum">${esc((item.resume || '').slice(0, 200))}</div>
      </div>`
    ).join('')
    $('news-list').querySelectorAll('.news-item').forEach(el => {
      el.addEventListener('click', () => {
        $('news-list').querySelectorAll('.news-item').forEach(n => n.classList.remove('selected'))
        el.classList.add('selected')
        currentNews = items[parseInt(el.dataset.idx)]
        generateFromNews(currentNews)
      })
    })
  } catch (err) {
    $('news-list').innerHTML = '<div class="empty">Erreur: ' + esc(err.message) + '</div>'
  }
})

btnAiPick.addEventListener('click', async () => {
  try {
    const data = await api('/news')
    const items = data.news || []
    if (!items.length) {
      toast('Aucune actualité')
      return
    }
    currentNews = items[Math.floor(Math.random() * items.length)]
    generateFromNews(currentNews)
  } catch (err) {
    toast('Erreur: ' + err.message)
  }
})

modalClose.addEventListener('click', () => newsModal.classList.add('hidden'))

async function generateFromNews(news) {
  $('news-list').innerHTML = '<div class="empty">Génération de l\'article...</div>'
  try {
    const data = await api('/generate', {
      method: 'POST',
      body: JSON.stringify({
        news,
        feedback: '',
        provider: aiProvider.value,
        model: getSelectedModel(),
      }),
    })
    const art = data.article
    showEditor(null)
    editTitre.value = art.titre_interne || ''
    const corps = `Accroche A :\n${art.accroche_a || ''}\n\nAccroche B :\n${art.accroche_b || ''}\n\n${art.corps || ''}`
    editCorps.value = corps
    editHashtags.value = (art.hashtags || []).join(' ')
    updateWords()
    currentNews = news
    newsModal.classList.add('hidden')
    toast('Article généré !')
  } catch (err) {
    $('news-list').innerHTML = '<div class="empty">Erreur: ' + esc(err.message) + '</div>'
  }
}

// INIT
async function init() {
  if (hasSession()) {
    await loadAvailableModels()
    showMain()
  } else {
    showLogin()
  }
}

init()
