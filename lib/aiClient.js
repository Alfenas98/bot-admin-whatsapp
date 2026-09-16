const axios = require('axios');
const MAX_TOKENS = 512;

// Lista de modelos gratuitos (fallback)
const FALLBACK_MODELS = [
  'poolside/laguna-s-2.1:free',
  'poolside/laguna-xs-2.1:free',
  'inclusionai/ling-3.0-flash:free',
  'stepfun/step-3.7-flash:free'
];

// Chaves de API (primária + backup)
const API_KEYS = [
  process.env.LLM_API_KEY,        // Primary: OpenRouter
  process.env.LLM_API_KEY_BACKUP, // Backup: Nous
].filter(k => k); // Remove undefined/null

if (API_KEYS.length === 0) {
  console.error('[aiClient] ATENÇÃO: Nenhuma LLM_API_KEY configurada!');
}

/**
 * Tenta uma chamada HTTP com retry automático entre chaves
 */
async function callLLM(url, data, headersBase) {
  let lastError = null;

  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i];
    const headers = { ...headersBase, 'Authorization': `Bearer ${key}` };
    const tag = i === 0 ? 'primária' : 'backup';

    try {
      const res = await axios.post(url, data, { headers, timeout: 15000 });
      const choice = res.data.choices?.[0];
      if (choice) return choice.message?.content || '';
      throw new Error('Resposta inválida');
    } catch (err) {
      const detalhe = err.response?.data?.error?.message || err.message;
      console.warn(`[aiClient] Falha com key ${tag}: ${detalhe}`);
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Envia prompt para LLM com fallback entre modelos E chaves
 * @param {string} prompt
 * @param {Array} [contexto=[]]
 * @returns {Promise<string>}
 */
async function queryLLM(prompt, contexto = []) {
  if (!API_KEYS.length) throw new Error('LLM_API_KEY não configurada.');

  const provider = process.env.LLM_PROVIDER || 'openrouter';
  const model = process.env.LLM_MODEL; // Pode estar vazio → usa fallback list

  const messages = [...contexto, { role: 'user', content: prompt }];
  const url = provider === 'openai'
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';

  const headersBase = provider === 'openai'
    ? { 'Content-Type': 'application/json' }
    : {
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Alfenas98/bot-admin-whatsapp',
        'X-Title': 'BotAdmin WhatsApp'
      };

  const modelos = model ? [model, ...FALLBACK_MODELS.filter(m => m !== model)] : FALLBACK_MODELS;
  let lastError = null;

  for (const currentModel of modelos) {
    console.log(`[aiClient] Modelo: ${currentModel}`);
    try {
      const data = { model: currentModel, messages, max_tokens: MAX_TOKENS, temperature: 0.7 };
      const resposta = await callLLM(url, data, headersBase);
      if (resposta.trim()) {
        console.log(`[aiClient] ✅ Sucesso com ${currentModel}`);
        return resposta;
      }
    } catch (err) {
      const detalhe = err.response?.data?.error?.message || err.message;
      console.warn(`[aiClient] ❌ ${currentModel}: ${detalhe}`);
      lastError = err;
    }
  }

  throw new Error(`Falha em todos os modelos. Último erro: ${lastError?.message}`);
}

module.exports = {
  queryLLM,
  FALLBACK_MODELS,
  API_KEYS_COUNT: API_KEYS.length
};
