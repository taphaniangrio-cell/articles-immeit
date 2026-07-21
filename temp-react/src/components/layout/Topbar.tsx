import { useEffect, useState } from 'react';
import { useStore } from '../../stores/appStore';
import { modelsApi } from '../../lib/api';

export function Topbar({ title }: { title: string }) {
  const { models, setModels } = useStore();
  const [provider, setProvider] = useState(() => localStorage.getItem('immeit_ai_provider') || '');
  const [modelId, setModelId] = useState(() => localStorage.getItem(`immeit_ai_model_${localStorage.getItem('immeit_ai_provider')}`) || '');

  useEffect(() => {
    if (models) return;
    modelsApi.list().then(setModels).catch(() => {});
  }, [models, setModels]);

  const current = provider ? models?.models?.[provider] : null;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <h1 className="text-lg font-semibold text-gray-800 truncate">{title}</h1>
      <div className="flex items-center gap-3 ml-auto">
        {models && (
          <div className="flex items-center gap-2 text-sm">
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
              className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
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
