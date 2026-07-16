import { useEffect, useState } from 'react';
import { modelsApi } from '../../lib/api';
import type { ModelsResponse } from '../../types';

export function Topbar({ title }: { title: string }) {
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [provider, setProvider] = useState(() => localStorage.getItem('immeit_ai_provider') || '');

  useEffect(() => {
    modelsApi.list().then(setModels).catch(() => {});
  }, []);

  const current = provider ? models?.models?.[provider] : null;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <h1 className="text-lg font-semibold text-gray-800 max-md:hidden">{title}</h1>
      <div className="flex items-center gap-3 ml-auto">
        {models && (
          <div className="flex items-center gap-2 text-sm max-md:hidden">
            <select
              value={provider}
              onChange={e => { setProvider(e.target.value); localStorage.setItem('immeit_ai_provider', e.target.value); }}
              className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
            >
              <option value="">Provider</option>
              {Object.entries(models.models || {}).filter(([, v]) => v.enabled).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            {current && (
              <select
                value={localStorage.getItem(`immeit_ai_model_${provider}`) || ''}
                onChange={e => { localStorage.setItem(`immeit_ai_model_${provider}`, e.target.value); }}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
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
