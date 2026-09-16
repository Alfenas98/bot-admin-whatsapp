const axios = require('axios');
const MAX_TOKENS = 512;

// Lista de modelos gratuitos da sua seleção
const FALLBACK_MODELS = [
  'poolside/laguna-s-2.1:free',
  'poolside/laguna-xs-2.1:free',
  'inclusionai/ling-3.0-flash:free',
  'stepfun/step-3.7-flash:free'
];

/**
 * Envia um prompt para a API de LLM configurada.
 * Tenta automaticamente modelos alternativos em caso de falha.
 *
 * @param {string} prompt - O texto para a IA
 * @param {Array} [contexto=[]] - Mensagens de contexto
 * @returns {Promise<string>} - Resposta da IA
 */
async function queryLLM(prompt, contexto = []) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY não configurada.');

  const provider = process.env.LLM_PROVIDER || 'openrouter';
  const model = process.env.LLM_MODEL;

  const messages = [
    ...contexto,
    { role: 'user', content: prompt }
  ];

  // Usa modelo personalizado se definido, senão usa a lista de fallback
  const modelos = model ? [model, ...FALLBACK_MODELS] : FALLBACK_MODELS;

  let ultimoErro = null;

  for (let i = 0; i < modelos.length; i++) {
    const currentModel = modelos[i];
    const isPrimary = i === 0;

    // Pula modelos duplicados da lista de fallback
    if (model && i > 0 && currentModel === model) continue;

    console.log(`[aiClient] Tentando modelo: ${currentModel}${isPrimary ? '' : ` (fallback #${i})`}`);

    let url, headers, data;

    if (provider === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
    } else {
      // OpenRouter (padrão)
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Alfenas98/bot-admin-whatsapp',
        'X-Title': 'BotAdmin WhatsApp'
      };
    }

    data = {
      model: currentModel,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.7
    };

    try {
      const resposta = await axios.post(url, data, {
        headers,
        timeout: 15000 // Timeout mais curto para fallback rápido
      });

      const choice = resposta.data.choices?.[0];
      if (!choice) {
        throw new Error('API retornou resposta vazia.');
      }

      const result = choice.message?.content || choice.text || '';

      if (result.trim()) {
        console.log(`[aiClient] Sucesso com modelo: ${currentModel}`);
        return result;
      }

      throw new Error('Resposta vazia.');
    } catch (err) {
      const detalhe = err.response?.data?.error?.message || err.message;
      console.warn(`[aiClient] Falha com ${currentModel}: ${detalhe}`);
      ultimoErro = new Error(`Falha na LLM: ${detalhe}`);

      // Continua para o próximo modelo
    }
  }

  // Se chegou aqui, todos os modelos falharam
  throw new Error(`Todos os modelos falharam. Último erro: ${ultimoErro?.message}`
);
}

module.exports = {
  queryLLM,
  FALLBACK_MODELS
};
