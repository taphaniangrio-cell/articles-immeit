const PROVIDERS_CONFIG = {
  groq: {
    label: 'Groq (gratuit)',
    needsKey: 'GROQ_API_KEY',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', free: true },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', free: true },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', free: true },
      { id: 'gemma2-9b-it', label: 'Gemma 2 9B', free: true },
    ],
    default: 'llama-3.3-70b-versatile',
  },
  gemini: {
    label: 'Google Gemini (gratuit)',
    needsKey: 'GEMINI_API_KEY',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', free: true },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', free: true },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', free: true },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', free: true },
    ],
    default: 'gemini-2.0-flash',
  },
  openrouter: {
    label: 'OpenRouter (gratuit)',
    needsKey: 'OPENROUTER_API_KEY',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', free: true },
      { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', free: true },
      { id: 'mistralai/mistral-small-3.1-24b-instruct', label: 'Mistral Small 3.1', free: true },
      { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', free: true },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', free: false },
    ],
    default: 'meta-llama/llama-3.3-70b-instruct',
  },
  anthropic: {
    label: 'Anthropic Claude (payant)',
    needsKey: 'ANTHROPIC_API_KEY',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', free: false },
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', free: false },
      { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', free: false },
    ],
    default: 'claude-sonnet-4-20250514',
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const models = {};
    for (const [key, config] of Object.entries(PROVIDERS_CONFIG)) {
      const keyValue = process.env[config.needsKey];
      models[key] = {
        label: config.label,
        enabled: !!keyValue,
        models: config.models,
        default: config.default,
      };
    }

    return res.status(200).json({ models });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
