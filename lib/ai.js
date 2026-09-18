/**
 * Sistema de IA - Resposta Rápida e Robusta
 */

const axios = require('axios');

const conversationMemory = new Map();
const MAX_MEMORY = 10;

const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  MODEL: 'gemini-3.6-flash',
  
  PERSONALIDADE: `Você é um assistente de WhatsApp chamado Bot.
Seja amigável, conciso e use emojis moderadamente.
Responda em pt-BR. Máximo 2 parágrafos.`,
  
  AUTO_RESPONDER: {
    enabled: true,
    gatilhos: ['bot']
  }
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
        maxOutputTokens: 256
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

setInterval(() => {
  const agora = Date.now();
  for (const [userId, memory] of conversationMemory.entries()) {
    const last = memory[memory.length - 1];
    if (last && agora - last.timestamp > 3600000) {
      conversationMemory.delete(userId);
    }
  }
}, 1800000);

module.exports = {
  chatWithMemory,
  autoResponder,
  analisarGrupo,
  isAutoResponderTrigger,
  clearMemory,
  addToMemory,
  getMemory,
  CONFIG
};
