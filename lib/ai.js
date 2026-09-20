/**
 * Sistema de IA - Respostas Natural
 */

const axios = require('axios');

const conversationMemory = new Map();
const MAX_MEMORY = 10;

const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  MODEL: 'gemini-3.6-flash',
  
  PERSONALIDADE: `Você é um assistente de WhatsApp chamado Bot.
Seja amigável, conciso e use emojis moderadamente.
Responda em pt-BR. Máximo 2 parágrafos.
NUNCA mencione IDs numéricos de usuário.
Quando precisar mencionar alguém, use o nome entre @ (ex: @João).`,
  
  AUTO_RESPONDER: {
    enabled: true,
    gatilhos: ['bot']
  },
  
  RETRY: {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 10000
  },
  
  MAX_RESPONSE_LENGTH: 3500
};

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

async function pesquisar(query) {
  try {
    const cacheKey = query.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }
    
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const res = await axios.get(url, { timeout: 3000 });
    
    let result = '';
    if (res.data?.Abstract) result += res.data.Abstract;
    if (res.data?.Answer) result += ' ' + res.data.Answer;
    
    if (result) {
      searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }
    
    return result || null;
  } catch (e) {
    return null;
  }
}

async function callGemini(messages, systemPrompt = '') {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    
    const contents = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Ok!' }] });
    }
    contents.push(...messages);
    
    const res = await axios.post(url, {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    }, { timeout: 15000 });
    
    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error('[IA] Gemini erro:', e.message);
    return null;
  }
}

async function chatWithMemory(userId, userName, message) {
  addToMemory(userId, 'user', `${userName}: ${message}`);
  
  const context = getMemory(userId);
  const resposta = await callGemini(context, CONFIG.PERSONALIDADE);
  
  if (resposta) {
    addToMemory(userId, 'assistant', resposta);
  }
  
  return resposta;
}

async function autoResponder(userName, message) {
  const prompt = `${CONFIG.PERSONALIDADE}

O usuário ${userName} disse: "${message}"
Responda em pt-BR. Se não precisar responder, diga SKIP.`;
  
  return await callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
}

async function analisarGrupo(mensagens, participantes) {
  const prompt = `Analise este grupo:
Participantes: ${participantes.length}
${mensagens.slice(-10).map((m, i) => `${i+1}. ${m.autor}: ${m.texto}`).join('\n')}

Resuma em 3 tópicos.`;
  return await callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
}

function isAutoResponderTrigger(text, mentions = []) {
  if (/\bbot\b/.test(text.toLowerCase())) return true;
  if (mentions && mentions.length > 0) return true;
  return false;
}

async function enviarMensagemLonga(sock, groupId, texto, quoted) {
  const LIMITE = 3500;
  
  if (texto.length <= LIMITE) {
    await sock.sendMessage(groupId, { text: texto }, { quoted });
    return;
  }
  
  const partes = [];
  let resto = texto;
  
  while (resto.length > 0) {
    if (resto.length <= LIMITE) {
      partes.push(resto);
      break;
    }
    
    let corte = resto.lastIndexOf('\n\n', LIMITE);
    if (corte === -1) corte = resto.lastIndexOf('. ', LIMITE);
    if (corte === -1) corte = LIMITE;
    
    partes.push(resto.substring(0, corte + 1));
    resto = resto.substring(corte + 1).trim();
  }
  
  for (let i = 0; i < partes.length; i++) {
    const textoFinal = partes.length > 1 
      ? `${partes[i]}\n\n[${i + 1}/${partes.length}]`
      : partes[i];
    await sock.sendMessage(groupId, { text: textoFinal }, { quoted });
  }
}

const searchCache = new Map();

setInterval(() => {
  const agora = Date.now();
  for (const [userId, memory] of conversationMemory.entries()) {
    const last = memory[memory.length - 1];
    if (last && agora - last.timestamp > 3600000) {
      conversationMemory.delete(userId);
    }
  }
  for (const [key, val] of searchCache.entries()) {
    if (agora - val.timestamp > 300000) {
      searchCache.delete(key);
    }
  }
}, 1800000);

module.exports = {
  chatWithMemory,
  autoResponder,
  analisarGrupo,
  isAutoResponderTrigger,
  enviarMensagemLonga,
  clearMemory,
  pesquisar,
  addToMemory,
  getMemory,
  CONFIG
};
