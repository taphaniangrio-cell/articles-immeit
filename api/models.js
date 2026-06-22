const PROVIDERS_CONFIG = {
  groq: {
    label: 'Groq (gratuit)',
    needsKey: 'GROQ_API_KEY',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', free: true },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', free: true },
      { id: 'llama-3.2-3b-preview', label: 'Llama 3.2 3B', free: true },
    ],
    default: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    label: 'OpenRouter (gratuit)',
    needsKey: 'OPENROUTER_API_KEY',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', free: true },
      { id: 'anthropic/claude-3-haiku-20240307', label: 'Claude 3 Haiku', free: true },
      { id: 'mistralai/mistral-small-3.1-24b-instruct', label: 'Mistral Small 3.1', free: true },
      { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', free: true },
      { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', free: true },
    ],
    default: 'meta-llama/llama-3.3-70b-instruct',
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
