const store = {
  state: {
    articles: [],
    filter: '',
    editingId: null,
    currentNews: null,
    regenNews: null,
    currentIaMeta: null,
    availableModels: null,
    currentPage: 1,
    isDirty: false,
    autoSaveTimer: null,
    isGenerating: false,
    articleImages: [],
    selectedImageIndex: -1,
  },
  listeners: {},
  get(key) {
    return this.state[key]
  },
  set(key, value) {
    const prev = this.state[key]
    this.state[key] = value
    this._emit(key, value, prev)
  },
  on(key, fn) {
    if (!this.listeners[key]) this.listeners[key] = []
    this.listeners[key].push(fn)
    return () => { this.listeners[key] = this.listeners[key].filter(f => f !== fn) }
  },
  _emit(key, value, prev) {
    ;(this.listeners[key] || []).forEach(fn => fn(value, prev))
  },
  reset() {
    Object.keys(this.state).forEach(k => { this.state[k] = undefined })
    this.state.articles = []
    this.state.currentPage = 1
    this.state.articleImages = []
    this.state.selectedImageIndex = -1
    this.state.isGenerating = false
    this.state.isDirty = false
  },
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { store }
}
