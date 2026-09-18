/**
 * Sistema de Rate Limiting e Fila de Comandos
 * 
 * Limita requisições por usuário e por comando para evitar spam.
 * 
 * Configuração:
 * - Cooldown global: tempo mínimo entre comandos
 * - Limite por janela: máximo de comandos em X segundos
 * - Fila de comandos pendentes
 * - Bloqueio temporário para quem exceder
 */

const userCooldowns = new Map(); // userId -> { lastCommand, count, blocked }
const commandQueues = new Map(); // userId -> Array de comandos pendentes

const CONFIG = {
  // Cooldown global (mínimo entre comandos)
  globalCooldown: 1000, // 1 segundo
  
  // Limite de comandos por janela de tempo
  maxCommandsPerWindow: 5,
  windowMs: 10000, // 10 segundos
  
  // Bloqueio temporário ao excedir limite
  blockDuration: 60000, // 1 minuto
  
  // Cooldown específico por comando (mais pesado = mais tempo)
  commandCooldowns: {
    'musica': 30000,      // 30s para música
    'video': 30000,       // 30s para vídeo
    'download': 30000,    // 30s para downloads
    'pergunta': 5000,     // 5s para perguntas (Gemini)
    'rankia': 15000,      // 15s para rankia (Gemini)
    'placar': 10000,      // 10s para placar
    'clima': 10000,       // 10s para clima
    'cotacao': 10000,     // 10s para cotação
    'noticias': 15000,    // 15s para notícias
    'pesquisa': 10000,    // 10s para pesquisa
    'default': 2000       // 2s para comandos normais
  },
  
  // Mensagens
  messages: {
    cooldown: '⏳ Aguarde *{seconds}s* para o próximo comando.',
    limit: '🚫 Você está fazendo muitos comandos! Aguarde *{blockTime}s*.',
    queue: '📋 Comando adicionado à fila. Posição: *{position}*.'
  }
};

/**
 * Verifica se um usuário pode executar um comando
 * @param {string} userId - ID do usuário
 * @param {string} commandName - Nome do comando
 * @returns {{ allowed: boolean, message?: string, position?: number }}
 */
function checkRateLimit(userId, commandName) {
  const agora = Date.now();
  const userData = userCooldowns.get(userId) || {
    lastCommand: 0,
    count: 0,
    windowStart: agora,
    blocked: false,
    blockExpires: 0,
    commandHistory: []
  };
  
  // Se está bloqueado
  if (userData.blocked) {
    if (agora < userData.blockExpires) {
      const remaining = Math.ceil((userData.blockExpires - agora) / 1000);
      return {
        allowed: false,
        message: CONFIG.messages.limit.replace('{blockTime}', remaining)
      };
    } else {
      // Desbloquear
      userData.blocked = false;
      userData.count = 0;
      userData.windowStart = agora;
    }
  }
  
  // Verificar cooldown específico do comando
  const commandCooldown = CONFIG.commandCooldowns[commandName] || CONFIG.commandCooldowns.default;
  const timeSinceLastCommand = agora - userData.lastCommand;
  
  if (timeSinceLastCommand < commandCooldown && userData.lastCommand > 0) {
    const remaining = Math.ceil((commandCooldown - timeSinceLastCommand) / 1000);
    return {
      allowed: false,
      message: CONFIG.messages.cooldown.replace('{seconds}', remaining)
    };
  }
  
  // Resetar janela se passou tempo suficiente
  if (agora - userData.windowStart > CONFIG.windowMs) {
    userData.count = 0;
    userData.windowStart = agora;
  }
  
  // Verificar limite por janela
  if (userData.count >= CONFIG.maxCommandsPerWindow) {
    userData.blocked = true;
    userData.blockExpires = agora + CONFIG.blockDuration;
    userCooldowns.set(userId, userData);
    
    const blockTime = Math.ceil(CONFIG.blockDuration / 1000);
    return {
      allowed: false,
      message: CONFIG.messages.limit.replace('{blockTime}', blockTime)
    };
  }
  
  // Permitir e atualizar
  userData.lastCommand = agora;
  userData.count++;
  userData.commandHistory.push({
    command: commandName,
    timestamp: agora
  });
  
  // Manter apenas últimos 100 comandos no histórico
  if (userData.commandHistory.length > 100) {
    userData.commandHistory = userData.commandHistory.slice(-50);
  }
  
  userCooldowns.set(userId, userData);
  
  return { allowed: true };
}

/**
 * Adiciona comando à fila e retorna posição
 */
function addToQueue(userId, commandData) {
  if (!commandQueues.has(userId)) {
    commandQueues.set(userId, []);
  }
  
  const queue = commandQueues.get(userId);
  queue.push({
    ...commandData,
    queuedAt: Date.now()
  });
  
  return queue.length;
}

/**
 * Remove comando da fila
 */
function removeFromQueue(userId) {
  const queue = commandQueues.get(userId);
  if (queue && queue.length > 0) {
    queue.shift();
  }
}

/**
 * Obtém fila de um usuário
 */
function getUserQueue(userId) {
  return commandQueues.get(userId) || [];
}

/**
 * Obtém estatísticas do rate limit
 */
function getStats() {
  return {
    usersTracked: userCooldowns.size,
    activeQueues: commandQueues.size,
    blockedUsers: Array.from(userCooldowns.entries())
      .filter(([_, data]) => data.blocked && data.blockExpires > Date.now())
      .length
  };
}

/**
 * Limpa dados antigos periodicamente
 */
function cleanup() {
  const agora = Date.now();
  const maxAge = 3600000; // 1 hora
  
  for (const [userId, data] of userCooldowns.entries()) {
    if (agora - data.lastCommand > maxAge && !data.blocked) {
      userCooldowns.delete(userId);
    }
  }
  
  for (const [userId, queue] of commandQueues.entries()) {
    if (queue.length === 0) {
      commandQueues.delete(userId);
    }
  }
}

// Limpeza a cada 10 minutos
setInterval(cleanup, 600000);

module.exports = {
  checkRateLimit,
  addToQueue,
  removeFromQueue,
  getUserQueue,
  getStats,
  cleanup,
  CONFIG
};
