import React from 'react';
import { useStore } from '../../stores/appStore';
import { articleApi } from '../../lib/api';
import { StatusBadge } from '../ui/Badge';
import { SkeletonCard } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { PAGE_SIZE, fmtDate, cn } from '../../lib/utils';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Article } from '../../types';

export function ArticlesList({ onSelect }: { onSelect: (article: Article | null) => void }) {
  const { articles, filter, currentPage, totalArticles, editingId, loadArticles } = useStore();
  const setFilter = useStore(s => s.setFilter);
  const setCurrentPage = useStore(s => s.setCurrentPage);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    loadArticles().finally(() => setLoading(false));
  }, [filter, currentPage, loadArticles]);

  const totalPages = Math.ceil(totalArticles / PAGE_SIZE);

  return (
    <div className="w-80 shrink-0 border-r border-border bg-surface flex flex-col max-md:w-full max-md:border-r-0">
      {/* Header */}
      <div className="p-3 border-b border-border-light bg-surface-elevated">
        <Button onClick={() => onSelect(null)} className="w-full" size="md">
          <Plus size={16} />
          Nouvel article
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-2 overflow-x-auto border-b border-border-light bg-surface-elevated">
        {[
          { key: '', label: 'Tous' },
          { key: 'brouillon', label: 'Brouillon' },
          { key: 'en_revision', label: 'En révision' },
          { key: 'valide', label: 'Validé' },
          { key: 'publie', label: 'Publié' },
          { key: 'archive', label: 'Archivé' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer",
              filter === tab.key
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-hover text-text-secondary hover:bg-surface-active hover:text-text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Article list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : articles.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-8">Aucun article trouvé</p>
        ) : (
          articles.map(a => (
            <ArticleCard key={a.id} article={a} active={editingId === a.id} onClick={() => onSelect(a)} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t border-border-light bg-surface-elevated text-sm">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-text-muted font-medium">Page {currentPage} / {totalPages} ({totalArticles})</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article, active, onClick }: { article: Article; active: boolean; onClick: () => void }) {
  const excerpt = article.corps?.replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').slice(0, 80) || '';
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full text-left rounded-xl transition-all duration-150 outline-none",
        active
          ? 'bg-primary-50 border-l-4 border-l-primary border border-primary-200 shadow-xs pl-4 pr-3 py-3'
          : 'bg-surface-elevated border border-border hover:border-gray-300 hover:shadow-xs pl-4 pr-3 py-3'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={cn(
          "text-sm font-semibold leading-snug truncate transition-colors",
          active ? 'text-primary' : 'text-text-primary group-hover:text-primary'
        )}>
          {article.titre_interne || 'Sans titre'}
        </h3>
        {active && <span className="shrink-0 w-2 h-2 rounded-full bg-primary animate-pulse mt-1.5" />}
      </div>
      {excerpt && (
        <p className={cn(
          "text-xs mt-1.5 line-clamp-1 transition-colors",
          active ? 'text-primary/60' : 'text-text-muted'
        )}>
          {excerpt}…
        </p>
      )}
      <div className="flex items-center justify-between mt-2.5">
        <StatusBadge status={article.statut} />
        <span className={cn(
          "text-[10px] transition-colors",
          active ? 'text-primary/50' : 'text-text-muted'
        )}>
          {fmtDate(article.date_creation)}
        </span>
      </div>
    </button>
  );
}
