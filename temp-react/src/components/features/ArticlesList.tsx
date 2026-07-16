import React from 'react';
import { useStore } from '../../stores/appStore';
import { articleApi } from '../../lib/api';
import { StatusBadge } from '../ui/Badge';
import { SkeletonCard } from '../ui/Skeleton';
import { PAGE_SIZE, fmtDate } from '../../lib/utils';
import type { Article } from '../../types';

export function ArticlesList({ onSelect }: { onSelect: (article: Article) => void }) {
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
    <div className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col max-md:w-full max-md:border-r-0">
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={() => onSelect(null as any)}
          className="w-full py-2 bg-[#0A66C2] text-white rounded-lg text-sm font-medium hover:bg-[#084a8f] transition-colors"
        >
          + Nouvel article
        </button>
      </div>

      <div className="flex gap-1 p-2 overflow-x-auto border-b border-gray-100">
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
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === tab.key ? 'bg-[#0A66C2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : articles.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Aucun article trouvé</p>
        ) : (
          articles.map(a => (
            <ArticleCard key={a.id} article={a} active={editingId === a.id} onClick={() => onSelect(a)} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t border-gray-100 text-sm">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-3 py-1 text-xs rounded disabled:opacity-30 bg-gray-100 hover:bg-gray-200"
          >
            ← Précédent
          </button>
          <span className="text-xs text-gray-500">Page {currentPage} / {totalPages} ({totalArticles})</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-3 py-1 text-xs rounded disabled:opacity-30 bg-gray-100 hover:bg-gray-200"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article, active, onClick }: { article: Article; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        active ? 'border-[#0A66C2] bg-blue-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
      }`}
    >
      <h3 className="text-sm font-medium text-gray-800 truncate">{article.titre_interne || 'Sans titre'}</h3>
      <p className="text-xs text-gray-400 mt-1">{fmtDate(article.date_creation)}</p>
      <div className="mt-2"><StatusBadge status={article.statut} /></div>
    </button>
  );
}
