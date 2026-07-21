import React from 'react';
import { useStore } from '../../stores/appStore';
import { articleApi } from '../../lib/api';
import { StatusBadge } from '../ui/Badge';
import { SkeletonCard } from '../ui/Skeleton';
import { PAGE_SIZE, fmtDate } from '../../lib/utils';
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
    <div className="w-80 shrink-0 border-r border-gray-200 bg-gray-50/50 flex flex-col max-md:w-full max-md:border-r-0">
      <div className="p-3 border-b border-gray-100 bg-white">
        <button
          onClick={() => onSelect(null)}
          className="w-full py-2.5 bg-[#0A66C2] text-white rounded-xl text-sm font-semibold hover:bg-[#084a8f] active:scale-[0.98] transition-all shadow-sm shadow-[#0A66C2]/20"
        >
          + Nouvel article
        </button>
      </div>

      <div className="flex gap-1 p-2 overflow-x-auto border-b border-gray-100 bg-white">
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
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filter === tab.key ? 'bg-[#0A66C2] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
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
        <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-white text-sm">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-30 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            ← Précédent
          </button>
          <span className="text-xs text-gray-500 font-medium">Page {currentPage} / {totalPages} ({totalArticles})</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-30 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Suivant →
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
      className={`group w-full text-left rounded-xl transition-all duration-200 outline-none ${
        active
          ? 'bg-gradient-to-r from-[#0A66C2]/8 to-blue-50 border-l-4 border-l-[#0A66C2] border border-[#0A66C2]/30 shadow-md shadow-[#0A66C2]/10 pl-4 pr-3 py-3'
          : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm hover:bg-gray-50/50 pl-4 pr-3 py-3'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-sm font-semibold leading-snug truncate transition-colors ${
          active ? 'text-[#0A66C2]' : 'text-gray-800 group-hover:text-gray-900'
        }`}>
          {article.titre_interne || 'Sans titre'}
        </h3>
        {active && <span className="shrink-0 w-2 h-2 rounded-full bg-[#0A66C2] animate-pulse mt-1.5" />}
      </div>
      {excerpt && (
        <p className={`text-xs mt-1.5 line-clamp-1 transition-colors ${
          active ? 'text-[#0A66C2]/60' : 'text-gray-400'
        }`}>
          {excerpt}…
        </p>
      )}
      <div className="flex items-center justify-between mt-2.5">
        <StatusBadge status={article.statut} />
        <span className={`text-[10px] transition-colors ${
          active ? 'text-[#0A66C2]/50' : 'text-gray-300'
        }`}>
          {fmtDate(article.date_creation)}
        </span>
      </div>
    </button>
  );
}
