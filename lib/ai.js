/**
 * Sistema de IA Integrada
 * 
 * - Chat com memória (conversas contextuais)
 * - Auto-responder (bot responde mensagens automaticamente)
 * - Análise de grupo (insights via Gemini)
 */

const axios = require('axios');

// Memória de conversas por usuário
const conversationMemory = new Map();
const MAX_MEMORY = 20; // máximo de mensagens na memória

// Configuração
const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  MODEL: 'gemini-3.6-flash',
  
  // Personalidade do bot
  PERSONALIDADE: `Você é um assistente de grupo de WhatsApp chamado "Bot Administrador". 
Seja amigável, prestativo e divertido. Use emojis moderadamente.
Responda em português brasileiro (pt-BR).
Seja conciso - respostas curtas e diretas.
Se não souber algo, seja honesto.`,
  
  // Comandos que ativam o chat
  COMANDOS_CHAT: ['ia', 'bot', 'assistente', 'chat'],
  
  // Auto-responder
  AUTO_RESPONDER: {
    enabled: true,
    // Palavras que ativam resposta automática (apenas bot)
    gatilhos: ['bot']
  }
};

/**
 * Adiciona mensagem à memória do usuário
 */
function addToMemory(userId, role, content) {
  if (!conversationMemory.has(userId)) {
    conversationMemory.set(userId, []);
  }
  
  const memory = conversationMemory.get(userId);
  memory.push({
    role,
    content,
    timestamp: Date.now()
  });
  
  // Limitar memória
  if (memory.length > MAX_MEMORY) {
    conversationMemory.set(userId, memory.slice(-MAX_MEMORY));
  }
}

/**
 * Obtém memória formatada para a API
 */
function getMemory(userId) {
  const memory = conversationMemory.get(userId) || [];
  return memory.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
}

/**
 * Limpa memória do usuário
 */
function clearMemory(userId) {
  conversationMemory.delete(userId);
}

/**
 * Chamada à Gemini API
 */
async function callGemini(messages, systemPrompt = '') {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    
    const contents = [];
    
    // Adicionar system prompt se fornecido
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Entendido! Estou pronto para ajudar.' }]
      });
    }
    
    // Adicionar mensagens
    contents.push(...messages);
    
    const res = await axios.post(url, {
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    }, { timeout: 30000 });
    
    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error('[IA] Erro Gemini:', e.message);
    return null;
  }
}

/**
 * Chat com memória
 */
async function chatWithMemory(userId, userName, message) {
  // Adicionar mensagem do usuário à memória
  addToMemory(userId, 'user', `Usuário ${userName}: ${message}`);
  
  // Obter contexto completo
  const context = getMemory(userId);
  
  // Chamada à IA
  const resposta = await callGemini(context, CONFIG.PERSONALIDADE);
  
  if (resposta) {
    // Adicionar resposta à memória
    addToMemory(userId, 'assistant', resposta);
  }
  
  return resposta;
}

/**
 * Verifica se mensagem é um gatilho para auto-responder
 * Só ativa se contiver "bot" ou "ia" no texto
 */
function isAutoResponderTrigger(text) {
  const lower = text.toLowerCase().trim();
  return /\bbot\b/.test(lower);
}

/**
 * Gera resposta automática
 */
async function autoResponder(userName, message, groupContext = '') {
  const prompt = `${CONFIG.PERSONALIDADE}

${groupContext ? `Contexto do grupo: ${groupContext}` : ''}

O usuário ${userName} disse: "${message}"

Responda de forma útil e amigável. Se for uma saudação, responda a saudação. Se for uma pergunta, responda. Se não precisar de resposta, responda "SKIP".`;
  
  const messages = [{
    role: 'user',
    parts: [{ text: prompt }]
  }];
  
  const resposta = await callGemini(messages);
  return resposta;
}

/**
 * Análise de grupo com IA
 */
async function analisarGrupo(mensagens, participantes) {
  const prompt = `Você é um analista de grupos de WhatsApp. Analise as seguintes informações e dê insights:

Participantes: ${participantes.length}
Mensagens recentes: ${mensagens.length}

${mensagens.slice(-20).map((m, i) => `${i + 1}. ${m.autor}: ${m.texto}`).join('\n')}

Forneça:
1. Resumo da atividade
2. Tópicos mais discutidos
3. Sugestões de engajamento
4. Membros mais ativos

Responda em pt-BR, de forma concisa.`;
  
  const messages = [{
    role: 'user',
    parts: [{ text: prompt }]
  }];
  
  return await callGemini(messages);
}

/**
 * Limpa memórias antigas periodicamente
 */
function cleanupMemory() {
  const agora = Date.now();
  const maxAge = 3600000; // 1 hora
  
  for (const [userId, memory] of conversationMemory.entries()) {
    const lastMessage = memory[memory.length - 1];
    if (lastMessage && agora - lastMessage.timestamp > maxAge) {
      conversationMemory.delete(userId);
    }
  }
}

// Limpeza a cada 30 minutos
setInterval(cleanupMemory, 1800000);

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
