/**
 * Sistema de IA Integrada com Pesquisa em Tempo Real
 */

const axios = require('axios');

// Memória de conversas
const conversationMemory = new Map();
const MAX_MEMORY = 20;

const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  MODEL: 'gemini-3.6-flash',
  
  PERSONALIDADE: `Você é um assistente de grupo de WhatsApp chamado "Bot Administrador". 
Seja amigável, prestitativo e divertido. Use emojis moderadamente.
Responda em português brasileiro (pt-BR) de forma concisa.
Se precisar buscar informações atuais, use a ferramenta de pesquisa.`,
  
  AUTO_RESPONDER: {
    enabled: true,
    gatilhos: ['bot']
  }
};

// Histórico de pesquisas recentes (cache)
const searchCache = new Map();
const CACHE_DURATION = 300000; // 5 minutos

function addToMemory(userId, role, content) {
  if (!conversationMemory.has(userId)) conversationMemory.set(userId, []);
  const memory = conversationMemory.get(userId);
  memory.push({ role, content, timestamp: Date.now() });
  if (memory.length > MAX_MEMORY) {
    conversationMemory.set(userId, memory.slice(-MAX_MEMORY));
  }
}

function getMemory(userId) {
  const memory = conversationMemory.get(userId) || [];
  return memory.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
}

function clearMemory(userId) {
  conversationMemory.delete(userId);
}

/**
 * Pesquisa no DuckDuckGo Instant Answer (gratuito, sem API key)
 */
async function webSearch(query) {
  // Verificar cache
  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('[search] Cache hit:', query);
    return cached.data;
  }
  
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await axios.get(url, { timeout: 10000 });
    
    let result = '';
    
    // Abstract (resumo)
    if (res.data?.Abstract) {
      result += res.data.Abstract;
    }
    
    // Resposta direta
    if (res.data?.Answer) {
      result += '\n' + res.data.Answer;
    }
    
    // Tópicos relacionados
    if (res.data?.RelatedTopics?.length > 0) {
      result += '\n\nRelacionados:';
      for (const topic of res.data.RelatedTopics.slice(0, 3)) {
        if (topic.Text) result += `\n• ${topic.Text}`;
      }
    }
    
    const finalResult = result || null;
    
    // Salvar no cache
    if (finalResult) {
      searchCache.set(cacheKey, { data: finalResult, timestamp: Date.now() });
    }
    
    console.log('[search] Pesquisa:', query, '- Encontrado:', finalResult ? 'Sim' : 'Não');
    return finalResult;
  } catch (e) {
    console.error('[search] Erro:', e.message);
    return null;
  }
}

/**
 * Pesquisa no Bing via API (se disponível)
 */
async function webSearchBing(query) {
  const BING_KEY = process.env.BING_SEARCH_KEY || '';
  if (!BING_KEY) return null;
  
  try {
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=3`;
    const res = await axios.get(url, {
      timeout: 10000,
      headers: { 'Ocp-Apim-Subscription-Key': BING_KEY }
    });
    
    if (res.data?.webPages?.value?.length > 0) {
      return res.data.webPages.value
        .slice(0, 3)
        .map(p => `${p.name}: ${p.snippet}`)
        .join('\n\n');
    }
  } catch (e) {}
  
  return null;
}

/**
 * Pesquisa em fontes múltiplas
 */
async function pesquisar(query) {
  // Tentar DuckDuckGo primeiro (gratuito)
  let resultado = await webSearch(query);
  if (resultado) return resultado;
  
  // Fallback: Bing API
  resultado = await webSearchBing(query);
  if (resultado) return resultado;
  
  return null;
}

/**
 * Chamada à Gemini API com contexto de pesquisa
 */
async function callGemini(messages, systemPrompt = '') {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    
    const contents = [];
    
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Entendido! Posso pesquisar na internet quando necessário.' }]
      });
    }
    
    contents.push(...messages);
    
    const res = await axios.post(url, {
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048
      }
    }, { timeout: 30000 });
    
    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error('[IA] Erro Gemini:', e.message);
    return null;
  }
}

/**
 * Chat com memória e pesquisa
 */
async function chatWithMemory(userId, userName, message) {
  // Verificar se a mensagem parece uma pergunta que precisa de pesquisa
  const palavrasPesquisa = [
    'qual', 'quando', 'onde', 'quanto', 'quem', 'como',
    'pesquisa', 'busca', 'procurar', 'notícia', 'noticia',
    'resultado', 'tabela', 'jogo', 'placar', 'preço', 'cotação',
    'clima', 'tempo', 'horas', 'dia', 'data', 'notícia', 'noticia',
    'acontece', 'aconteceu', 'última', 'atual', 'agora', 'hoje',
    'população', 'área', 'km', 'habitantes', 'capital', 'país'
  ];
  
  const precisaPesquisa = palavrasPesquisa.some(p => 
    message.toLowerCase().includes(p)
  );
  
  // Adicionar mensagem à memória
  addToMemory(userId, 'user', `Usuário ${userName}: ${message}`);
  
  // Obter contexto
  const context = getMemory(userId);
  
  // Se parece uma pergunta factual, pesquisar
  let pesquisaResult = null;
  if (precisaPesquisa) {
    console.log('[IA] Pesquisando:', message);
    pesquisaResult = await pesquisar(message);
    
    if (pesquisaResult) {
      // Adicionar resultado da pesquisa ao contexto
      context.push({
        role: 'user',
        parts: [{ text: `[Resultado da pesquisa na internet]: ${pesquisaResult}` }]
      });
      context.push({
        role: 'model',
        parts: [{ text: 'Obrigado pela informação!' }]
      });
    }
  }
  
  // Chamada à IA
  const resposta = await callGemini(context, CONFIG.PERSONALIDADE);
  
  if (resposta) {
    addToMemory(userId, 'assistant', resposta);
  }
  
  return resposta;
}

/**
 * Gera resposta automática
 */
async function autoResponder(userName, message, groupContext = '') {
  const pesquisa = await pesquisar(message);
  
  let contextoExtra = '';
  if (pesquisa) {
    contextoExtra = `\n\nInformações atualizadas da internet:\n${pesquisa}`;
  }
  
  const prompt = `${CONFIG.PERSONALIDADE}

${groupContext ? `Contexto do grupo: ${groupContext}` : ''}
${contextoExtra}

O usuário ${userName} disse: "${message}"

Responda de forma útil e amigável. Use as informações atualizadas disponíveis. Se for uma saudação, responda a saudação. Se não precisar de resposta, responda "SKIP".`;
  
  const messages = [{
    role: 'user',
    parts: [{ text: prompt }]
  }];
  
  return await callGemini(messages);
}

/**
 * Análise de grupo
 */
async function analisarGrupo(mensagens, participantes) {
  const prompt = `Você é um analista de grupos de WhatsApp. Analise:

Participantes: ${participantes.length}

${mensagens.slice(-20).map((m, i) => `${i + 1}. ${m.autor}: ${m.texto}`).join('\n')}

Forneça: resumo, tópicos, sugestões, membros ativos. Seja conciso em pt-BR.`;
  
  return await callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
}

// Limpeza periódica
setInterval(() => {
  const agora = Date.now();
  for (const [userId, memory] of conversationMemory.entries()) {
    const last = memory[memory.length - 1];
    if (last && agora - last.timestamp > 3600000) {
      conversationMemory.delete(userId);
    }
  }
  // Limpar cache antigo
  for (const [key, val] of searchCache.entries()) {
    if (agora - val.timestamp > CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
}, 1800000);

module.exports = {
  chatWithMemory,
  autoResponder,
  analisarGrupo,
  isAutoResponderTrigger: (text, mentions = []) => {
    if (/\bbot\b/.test(text.toLowerCase())) return true;
    if (mentions && mentions.length > 0) return true;
    return false;
  },
  clearMemory,
  pesquisar,
  addToMemory,
  getMemory,
  CONFIG
};
