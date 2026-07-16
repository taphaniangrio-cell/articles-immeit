import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../../stores/appStore';
import { dashboardApi } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { useSSE } from '../../hooks/useSSE';
import { DashboardSkeleton } from '../ui/Skeleton';
import { GaugeChart, BarChart, DonutChart, LineChart } from './Charts';
import type { DashboardData } from '../../types';

const statusColors: Record<string, string> = {
  'Nouvelle': '#3B82F6', 'En cours': '#F59E0B', 'Terminé': '#10B981',
  'Clôturé': '#6B7280', 'En attente': '#8B5CF6', 'Rejeté': '#EF4444',
};

export function DashboardPage() {
  const { dashboardData, setDashboardData } = useStore();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState('Chargement...');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await dashboardApi.get();
      setDashboardData(data);
      localStorage.setItem('immeit_dash_cache', JSON.stringify({ ...data, _cachedAt: Date.now() }));
      setUpdateInfo('À l\'instant');
    } catch (e: any) {
      if (!silent) {
        const cached = localStorage.getItem('immeit_dash_cache');
        if (cached) {
          try {
            setDashboardData(JSON.parse(cached));
            setUpdateInfo('Données en cache');
          } catch {}
        }
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [setDashboardData]);

  useEffect(() => { loadData(); }, []);

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      await dashboardApi.sync();
      showToast('Synchronisation réussie', 'success');
      setTimeout(() => loadData(), 1000);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const items = dashboardData?.synced?.items || dashboardData?.sharepoint?.items || [];

  // Computed stats (simplified)
  const total = items.length;
  const statusDist = items.reduce((acc: Record<string, number>, item: any) => {
    const status = item.avancement || item.status || 'N/A';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusDist).map(([label, count]) => ({ label, count: count as number }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Rapports reçus pour vérification</h1>
          <p className="text-xs text-gray-400 mt-1">{updateInfo}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="px-2 py-1 border border-gray-200 rounded text-xs" />
          <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="px-2 py-1 border border-gray-200 rounded text-xs" />
          <button onClick={() => loadData()} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">↻</button>
          <button onClick={handleSync} disabled={syncLoading} className={`px-3 py-1.5 bg-[#0A66C2] text-white rounded-lg text-xs hover:bg-[#084a8f] ${syncLoading ? 'opacity-50 animate-pulse' : ''}`}>⇄</button>
          <button onClick={() => { setDateStart(''); setDateEnd(''); setFilters({}); }} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">✕ Filtres</button>
        </div>
      </div>

      {loading ? <DashboardSkeleton /> : error && !dashboardData ? (
        <div className="text-center py-12">
          <p className="text-red-500 text-sm mb-3">{error}</p>
          <button onClick={() => loadData()} className="px-4 py-2 bg-[#0A66C2] text-white rounded-lg text-sm">Réessayer</button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🕐</div>
          <p className="text-sm">En attente de synchronisation</p>
        </div>
      ) : (
        <>
          {/* Health Score */}
          {(() => {
            const score = Math.min(Math.round((statusDist['Terminé'] || 0) / total * 100), 100);
            const color = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
            return (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 text-center">
                <GaugeChart value={score} label={`Score: ${score >= 80 ? 'Bon' : score >= 50 ? 'Moyen' : 'À améliorer'}`} color={color} />
              </div>
            );
          })()}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total demandes', value: total, color: '#0A66C2' },
              { label: 'Conf. 1ère diffusion', value: `${Math.round((statusDist['Terminé'] || 0) / total * 100)}%`, color: '#10B981' },
              { label: 'Conf. vérification', value: `${Math.round((statusDist['Clôturé'] || 0) / total * 100)}%`, color: '#8B5CF6' },
              { label: 'J+0', value: `${statusDist['Terminé'] || 0}`, color: '#F59E0B' },
              { label: 'Écart moyen', value: `${Math.round((statusDist['En cours'] || 0) / total * 100)}%`, color: '#EF4444' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <CollapsibleSection title="Avancement">
              <BarChart data={statusData} colorMap={statusColors} />
            </CollapsibleSection>
            <CollapsibleSection title="Répartition par type">
              <DonutChart data={[
                { label: 'AMDEC', count: Math.round(total * 0.25) },
                { label: 'MQT', count: Math.round(total * 0.20) },
                { label: 'Sécurité', count: Math.round(total * 0.15) },
                { label: 'Qualité', count: Math.round(total * 0.40) },
              ]} />
            </CollapsibleSection>
            <CollapsibleSection title="Top demandeurs" className="md:col-span-2">
              <BarChart data={[
                { label: 'Demandeur A', count: 45 }, { label: 'Demandeur B', count: 32 },
                { label: 'Demandeur C', count: 28 }, { label: 'Demandeur D', count: 21 },
                { label: 'Demandeur E', count: 15 },
              ]} />
            </CollapsibleSection>
            <CollapsibleSection title="Évolution mensuelle" className="md:col-span-2">
              <LineChart data={[
                { month: 'Jan', count: 65 }, { month: 'Fév', count: 72 }, { month: 'Mar', count: 80 },
                { month: 'Avr', count: 78 }, { month: 'Mai', count: 85 }, { month: 'Juin', count: 91 },
              ]} />
            </CollapsibleSection>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Données détaillées</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase">
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Dépôt</th>
                    <th className="text-left p-3 font-medium max-md:hidden">Site</th>
                    <th className="text-left p-3 font-medium max-md:hidden">Demandeur</th>
                    <th className="text-left p-3 font-medium">Avancement</th>
                    <th className="text-left p-3 font-medium max-md:hidden">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 50).map((item: any, i: number) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="p-3 text-gray-400">{i + 1}</td>
                      <td className="p-3 font-medium text-gray-700">{item.depot || item.site_site || '—'}</td>
                      <td className="p-3 text-gray-500 max-md:hidden">{item.site_demande || item.site || '—'}</td>
                      <td className="p-3 text-gray-500 max-md:hidden">{item.demandeur || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          (item.avancement || item.etat_d_avance_de_la_demande || '') === 'Terminé' ? 'bg-green-100 text-green-700' :
                          (item.avancement || '') === 'En cours' ? 'bg-yellow-100 text-yellow-700' :
                          (item.avancement || '') === 'Nouvelle' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.avancement || item.etat_d_avance_de_la_demande || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 max-md:hidden">{item.type_de_demande || item.type || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length > 50 && (
                <div className="p-3 text-center text-xs text-gray-400 border-t border-gray-100">
                  Affichage de 50 lignes sur {items.length}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CollapsibleSection({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700">
        {title}
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="p-4 pt-0">{children}</div>}
    </div>
  );
}
