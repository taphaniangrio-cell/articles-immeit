import { useEffect, useState } from 'react';
import { useStore } from '../../stores/appStore';
import { modelsApi } from '../../lib/api';
import { PanelLeftOpen, Cpu } from 'lucide-react';

export function Topbar({ title, onToggleSidebar }: { title: string; onToggleSidebar: () => void }) {
  const { models, setModels } = useStore();
  const [provider, setProvider] = useState(() => localStorage.getItem('immeit_ai_provider') || '');
  const [modelId, setModelId] = useState(() => localStorage.getItem(`immeit_ai_model_${localStorage.getItem('immeit_ai_provider')}`) || '');

  useEffect(() => {
    if (models) return;
    modelsApi.list().then(setModels).catch(() => {});
  }, [models, setModels]);

  const current = provider ? models?.models?.[provider] : null;

  return (
    <header className="h-14 bg-surface-elevated border-b border-border flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer md:hidden"
        >
          <PanelLeftOpen size={18} />
        </button>
        <h1 className="text-base font-semibold text-text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {models && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Cpu size={14} />
              <span>IA</span>
            </div>
            <select
              value={provider}
              onChange={e => {
                const v = e.target.value;
                setProvider(v);
                localStorage.setItem('immeit_ai_provider', v);
                const defaultModel = models?.models?.[v]?.models?.[0]?.id || '';
                setModelId(defaultModel);
                localStorage.setItem(`immeit_ai_model_${v}`, defaultModel);
              }}
              className="h-8 px-2.5 text-xs border border-border rounded-lg bg-white text-text-secondary hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">Provider</option>
              {Object.entries(models.models || {}).filter(([, v]) => v.enabled).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            {current && (
              <select
                value={modelId}
                onChange={e => {
                  setModelId(e.target.value);
                  localStorage.setItem(`immeit_ai_model_${provider}`, e.target.value);
                }}
                className="h-8 px-2.5 text-xs border border-border rounded-lg bg-white text-text-secondary hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">Modèle</option>
                {current.models.map(m => (
                  <option key={m.id} value={m.id}>{m.label}{m.free ? ' (free)' : ''}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
