import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../../stores/appStore';
import { generateApi, newsApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import { ArticlesList } from './ArticlesList';
import { Editor } from './Editor';
import { Sparkles, Dice5 } from 'lucide-react';
import type { Article, NewsItem } from '../../types';

export function ArticlesPage() {
  const { articles, editingId, setEditingId, isDirty, loadArticles } = useStore();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Article | null>(null);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (!autoSelectedRef.current && !selected && articles.length > 0) {
      autoSelectedRef.current = true;
      setSelected(articles[0]);
    }
  }, [articles, selected]);
  const [newsModal, setNewsModal] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleSelect = (article: Article | null) => {
    if (article && article.id) {
      setSelected(article);
    } else {
      setNewsModal(true);
      newsApi.list().then(res => setNews(res.news || [])).catch(() => {});
    }
  };

  const handleGenerate = useCallback(async (payload: any) => {
    setGenerating(true);
    try {
      const res = await generateApi.create(payload);
      if (res.article) {
        setSelected(res.article);
        await loadArticles();
        showToast('Article généré', 'success');
        setNewsModal(false);
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setGenerating(false);
    }
  }, [loadArticles, showToast]);

  const handleCustomGenerate = () => {
    if (!customPrompt.trim()) return;
    handleGenerate({
      customPrompt: customPrompt.trim(),
      provider: localStorage.getItem('immeit_ai_provider') || undefined,
      model: localStorage.getItem(`immeit_ai_model_${localStorage.getItem('immeit_ai_provider')}`) || undefined,
    });
  };

  const handleNewsGenerate = (newsItem: NewsItem) => {
    handleGenerate({
      news: newsItem,
      provider: localStorage.getItem('immeit_ai_provider') || undefined,
      model: localStorage.getItem(`immeit_ai_model_${localStorage.getItem('immeit_ai_provider')}`) || undefined,
    });
  };

  const handleAiPick = () => {
    if (news.length === 0) return;
    const random = news[Math.floor(Math.random() * news.length)];
    handleNewsGenerate(random);
  };

  const handleBack = () => {
    if (isDirty && !window.confirm('Tu as des modifications non sauvegardées. Quitter quand même ?')) return;
    setSelected(null);
    setEditingId(null);
    autoSelectedRef.current = false;
  };

  return (
    <>
      <div className="flex h-full max-md:flex-col">
        <ArticlesList onSelect={handleSelect} />
        <Editor article={selected} onBack={handleBack} />
      </div>

      <Modal open={newsModal} onClose={() => setNewsModal(false)} title="Nouvel article" size="lg">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="Sujet libre..."
              className="flex-1 h-9 px-3 text-sm border border-border rounded-lg bg-white placeholder:text-text-muted hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleCustomGenerate()}
            />
            <Button onClick={handleCustomGenerate} disabled={generating || !customPrompt.trim()} loading={generating}>
              <Sparkles size={14} />
              Générer
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex-1 border-t border-border-light" />
            ou choisis une actualité
            <span className="flex-1 border-t border-border-light" />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {news.map((n, i) => (
              <button
                key={i}
                onClick={() => handleNewsGenerate(n)}
                className="w-full text-left p-3 rounded-xl border border-border hover:border-primary hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="text-sm font-medium text-text-primary">{n.titre}</div>
                <div className="text-xs text-text-muted mt-1">{n.source}</div>
                {n.resume && <div className="text-xs text-text-secondary mt-1 line-clamp-2">{n.resume}</div>}
              </button>
            ))}
          </div>

          <Button variant="secondary" onClick={handleAiPick} disabled={generating || news.length === 0} className="w-full">
            <Dice5 size={14} />
            Laisser l'IA choisir
          </Button>

          {generating && (
            <div className="text-center py-4">
              <Skeleton className="h-8 w-8 rounded-full mx-auto mb-2" />
              <p className="text-sm text-text-muted">Génération en cours...</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
