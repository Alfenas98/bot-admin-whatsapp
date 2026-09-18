/**
 * Sistema de Rate Limiting com Fila Automática
 * 
 * Quando um usuário faz requisição e está em cooldown:
 * 1. O bot menciona que ele está na fila
 * 2. Automaticamente executa o comando quando o tempo liberar
 */

const userCooldowns = new Map();
const userQueues = new Map();
const pendingTimers = new Map();

const CONFIG = {
  globalCooldown: 5000, // 5 segundos entre comandos
  maxCommandsPerWindow: 3,
  windowMs: 15000,
  blockDuration: 120000,
  
  // Cooldown específico por comando
  commandCooldowns: {
    'musica': 45000,
    'video': 45000,
    'download': 45000,
    'pergunta': 8000,
    'rankia': 20000,
    'placar': 15000,
    'clima': 15000,
    'cotacao': 15000,
    'noticias': 20000,
    'pesquisa': 15000,
    'default': 5000
  }
};

function getCommandCooldown(commandName) {
  return CONFIG.commandCooldowns[commandName] || CONFIG.commandCooldowns.default;
}

/**
 * Verifica rate limit e retorna status
 */
function checkRateLimit(userId, commandName) {
  const agora = Date.now();
  const userData = userCooldowns.get(userId) || {
    lastCommand: 0,
    count: 0,
    windowStart: agora,
    blocked: false,
    blockExpires: 0
  };
  
  // Se está bloqueado
  if (userData.blocked) {
    if (agora < userData.blockExpires) {
      return {
        allowed: false,
        blocked: true,
        remaining: Math.ceil((userData.blockExpires - agora) / 1000),
        reason: 'block'
      };
    }
    userData.blocked = false;
    userData.count = 0;
    userData.windowStart = agora;
  }
  
  // Verificar cooldown do comando
  const cooldown = getCommandCooldown(commandName);
  const tempoDesdeUltimo = agora - userData.lastCommand;
  
  if (tempoDesdeUltimo < cooldown && userData.lastCommand > 0) {
    const waitTime = cooldown - tempoDesdeUltimo;
    return {
      allowed: false,
      blocked: false,
      remaining: Math.ceil(waitTime / 1000),
      reason: 'cooldown',
      afterMs: waitTime
    };
  }
  
  // Verificar limite por janela
  if (agora - userData.windowStart > CONFIG.windowMs) {
    userData.count = 0;
    userData.windowStart = agora;
  }
  
  if (userData.count >= CONFIG.maxCommandsPerWindow) {
    userData.blocked = true;
    userData.blockExpires = agora + CONFIG.blockDuration;
    userCooldowns.set(userId, userData);
    return {
      allowed: false,
      blocked: true,
      remaining: Math.ceil(CONFIG.blockDuration / 1000),
      reason: 'window'
    };
  }
  
  // Permitir
  userData.lastCommand = agora;
  userData.count++;
  userCooldowns.set(userId, userData);
  
  return { allowed: true };
}

/**
 * Adiciona comando à fila do usuário
 */
function enqueue(userId, commandData) {
  if (!userQueues.has(userId)) {
    userQueues.set(userId, []);
  }
  userQueues.get(userId).push({
    ...commandData,
    queuedAt: Date.now()
  });
}

/**
 * Obtém próximo comando da fila
 */
function dequeue(userId) {
  const queue = userQueues.get(userId);
  if (queue && queue.length > 0) {
    return queue.shift();
  }
  return null;
}

/**
 * Agenda execução automática de um comando enfileirado
 */
function scheduleExecution(userId, commandData, sock, reply) {
  const cooldown = getCommandCooldown(commandData.commandName);
  const tempoDesdeUltimo = Date.now() - (userCooldowns.get(userId)?.lastCommand || 0);
  const waitTime = Math.max(0, cooldown - tempoDesdeUltimo);
  
  // Limpar timer anterior se existir
  if (pendingTimers.has(userId)) {
    clearTimeout(pendingTimers.get(userId));
  }
  
  const timer = setTimeout(async () => {
    try {
      const result = checkRateLimit(userId, commandData.commandName);
      if (!result.allowed) {
        // Ainda em cooldown, reagendar
        scheduleExecution(userId, commandData, sock, reply);
        return;
      }
      
      // Executar comando
      const command = commandData.command;
      if (command && command.execute) {
        // Remover da fila
        dequeue(userId);
        
        // Mensagem de execução automática
        try {
          await sock.sendMessage(commandData.groupId, {
            text: `🎵 Executando comando enfileirado automaticamente...`,
            mentions: [commandData.senderId]
          });
        } catch (e) {}
        
        await command.execute({
          sock,
          msg: commandData.msg,
          groupId: commandData.groupId,
          senderId: commandData.senderId,
          args: commandData.args,
          reply: async (text) => {
            return sock.sendMessage(commandData.groupId, {
              text: typeof text === 'string' ? text : text?.text || '⚠️ Erro.',
              mentions: [commandData.senderId]
            });
          },
          getGroupConfig: commandData.getGroupConfig,
          setGroupConfig: commandData.setGroupConfig,
          textContent: commandData.textContent
        });
      }
    } catch (err) {
      console.error('[queue] Erro na execução automática:', err.message);
    } finally {
      // Limpar timer
      pendingTimers.delete(userId);
      
      // Verificar se tem mais na fila
      const next = dequeue(userId);
      if (next) {
        scheduleExecution(userId, next, sock, reply);
      }
    }
  }, waitTime);
  
  pendingTimers.set(userId, timer);
}

/**
 * Obtém estatísticas
 */
function getStats() {
  return {
    usersTracked: userCooldowns.size,
    activeQueues: userQueues.size,
    blockedUsers: Array.from(userCooldowns.entries())
      .filter(([_, data]) => data.blocked && data.blockExpires > Date.now()).length,
    pendingExecutions: pendingTimers.size
  };
}

/**
 * Obtém fila do usuário
 */
function getQueue(userId) {
  return userQueues.get(userId) || [];
}

// Limpeza periódica
setInterval(() => {
  const agora = Date.now();
  for (const [userId, data] of userCooldowns.entries()) {
    if (agora - data.lastCommand > 3600000 && !data.blocked) {
      userCooldowns.delete(userId);
    }
  }
  for (const [userId, queue] of userQueues.entries()) {
    if (queue.length === 0) {
      userQueues.delete(userId);
    }
  }
}, 600000);

module.exports = {
  checkRateLimit,
  enqueue,
  dequeue,
  scheduleExecution,
  getStats,
  getQueue,
  CONFIG
};
