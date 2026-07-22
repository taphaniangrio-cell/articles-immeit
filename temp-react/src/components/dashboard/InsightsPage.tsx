import { useMemo } from 'react';
import { useStore } from '../../stores/appStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowLeft } from 'lucide-react';
import { excelAllDates, findHeader, fmtDDMMYYYY, norm } from './DashboardPage';

export function InsightsPage({ setView }: { setView: (v: 'articles' | 'dashboard' | 'insights') => void }) {
  const { dashboardData } = useStore();

  const synced = dashboardData?.synced;
  const headers = synced?.headers || dashboardData?.sharepoint?.headers || [];
  const items: Record<string, string>[] = synced?.items || dashboardData?.sharepoint?.items || [];

  const dateField = useMemo(() => headers.length > 0 ? findHeader(headers, "Date de dépôt du dossier sur docinfo") : '', [headers]);
  const bancField = useMemo(() => headers.length > 0 ? findHeader(headers, 'N°(BE / GERICO / APEX)') : '', [headers]);
  const natureField = useMemo(() => headers.length > 0 ? findHeader(headers, 'Nature de la demande') : '', [headers]);
  const otField = useMemo(() => headers.length > 0 ? findHeader(headers, 'N°OT') : '', [headers]);
  const siteField = useMemo(() => headers.length > 0 ? findHeader(headers, 'Site') : '', [headers]);
  const statusField = useMemo(() => headers.length > 0 ? findHeader(headers, "Etat d'avance de la demande") : '', [headers]);

  const multiEntries = useMemo(() => {
    if (!dateField) return [];
    return items
      .map((it, ri) => {
        const raw = it[dateField] || '';
        const dates = excelAllDates(raw);
        if (dates.length <= 1) return null;
        const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
        const num = bancField ? (it[bancField] || '—') : '—';
        const nature = natureField ? (it[natureField] || '').replace(/\n/g, ' ').trim() : '';
        const ot = otField ? (it[otField] || '').trim() : '';
        const site = siteField ? (it[siteField] || '') : '';
        const status = statusField ? (it[statusField] || '') : '';
        return { row: ri, num, dates: sorted, nature, ot, site, status };
      })
      .filter(Boolean) as { row: number; num: string; dates: Date[]; nature: string; ot: string; site: string; status: string }[];
  }, [items, dateField, bancField, natureField, otField, siteField, statusField]);

  const totalRapports = items.length;
  const totalTraitements = useMemo(() => {
    if (!dateField) return 0;
    let c = 0;
    for (const item of items) { if (item[dateField]) c += excelAllDates(item[dateField]).length; }
    return c;
  }, [items, dateField]);

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-lg font-bold text-text-primary">Détail des rapports reçus plusieurs fois</h1>
        <Button variant="secondary" onClick={() => setView('dashboard')} className="self-start" size="sm">
          <ArrowLeft size={14} />
          Retour au tableau de bord
        </Button>
      </div>

      {/* Summary */}
      <Card className="p-5 mb-6">
        <p className="text-sm text-text-secondary leading-relaxed">
          <strong className="text-text-primary">{totalRapports.toLocaleString()}</strong> rapports uniques au total.
          Parmi eux, <strong className="text-text-primary">{multiEntries.length}</strong> rapport{multiEntries.length > 1 ? 's' : ''} ont été
          déposés <strong className="text-text-primary">plusieurs fois</strong> (2 dates ou plus dans la cellule "Date de dépôt").
        </p>
        <p className="text-sm text-text-secondary leading-relaxed mt-1">
          Cela représente <strong className="text-text-primary">{totalTraitements.toLocaleString()}</strong> traitements individuels au total,
          soit <strong className="text-text-primary">{totalTraitements - totalRapports}</strong> dépôts supplémentaires par rapport au nombre de rapports uniques.
        </p>
        <p className="text-xs text-text-muted mt-2">
          Chaque ligne ci-dessous est un rapport qui a été soumis à plusieurs dates différentes.
          Le nombre de dates est indiqué entre parenthèses.
        </p>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">{multiEntries.length} rapport{multiEntries.length > 1 ? 's' : ''} concerné{multiEntries.length > 1 ? 's' : ''}</h2>
          <span className="text-xs text-text-muted">Trié par nombre de dates décroissant</span>
        </div>
        <div className="divide-y divide-border-light">
          {multiEntries.sort((a, b) => b.dates.length - a.dates.length || a.num.localeCompare(b.num, 'fr')).map((e, i) => (
            <div key={i} className="p-4 hover:bg-surface-hover transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-sm font-semibold text-text-primary">{e.num}</span>
                  <span className="text-xs text-text-muted ml-2">({e.dates.length} date{e.dates.length > 1 ? 's' : ''})</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {e.dates.map((d, di) => (
                      <span key={di} className="inline-block px-2 py-0.5 bg-primary-50 text-primary rounded text-[10px] font-medium border border-primary-200">
                        {fmt(d)}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-text-muted">
                    {e.nature && <span>{e.nature}</span>}
                    {e.site && <span>• {e.site}</span>}
                    {e.status && <span>• {e.status}</span>}
                  </div>
                  {e.ot && e.ot !== '-' && (
                    <div className="mt-0.5 text-[10px] text-text-muted">OT: {e.ot}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {multiEntries.length === 0 && (
          <div className="p-8 text-center text-text-muted text-sm">Aucun rapport reçu plusieurs fois.</div>
        )}
      </Card>
    </div>
  );
}
