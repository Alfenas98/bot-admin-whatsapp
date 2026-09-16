const axios = require('axios');
const MAX_TOKENS = 512;

/**
 * Envia um prompt para a API de LLM configurada.
 * Suporta OpenRouter e OpenAI.
 *
 * @param {string} prompt - O texto para a IA
 * @param {Array} [contexto=[]] - Mensagens de contexto (array de objetos {role, content})
 * @returns {Promise<string>} - Resposta da IA
 */
async function queryLLM(prompt, contexto = []) {
  const provider = process.env.LLM_PROVIDER || 'openrouter';
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'nousresearch/hermes-70b';

  if (!apiKey) {
    throw new Error('LLM_API_KEY não configurada.');
  }

  const messages = [
    ...contexto,
    { role: 'user', content: prompt }
  ];

  let url, headers, data;

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    data = {
      model,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.7
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
    data = {
      model,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.7
    };
  }

  try {
    const resposta = await axios.post(url, data, {
      headers,
      timeout: 30000
    });

    const choice = resposta.data.choices?.[0];
    if (!choice) {
      throw new Error('API retornou resposta vazia.');
    }

    return choice.message?.content || choice.text || '';
  } catch (err) {
    const detalhe = err.response?.data?.error?.message || err.message;
    throw new Error(`Falha na chamada LLM (${provider}): ${detalhe}`);
  }
}

module.exports = {
  queryLLM
};
