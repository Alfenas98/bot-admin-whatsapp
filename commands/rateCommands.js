const { getUserQueue, getStats, CONFIG } = require('../lib/rateLimiter');

module.exports = {
  name: 'ratestats',
  aliases: ['ratelimit'],
  adminOnly: true,

  async execute({ reply }) {
    const stats = getStats();
    const msg = `📊 *Rate Limit - Estatísticas*

👥 Usuários rastreados: *${stats.usersTracked}*
📋 Filas ativas: *${stats.activeQueues}*
🚫 Usuários bloqueados: *${stats.blockedUsers}*

⚙️ *Configuração:*
• Cooldown padrão: *${CONFIG.commandCooldowns.default / 1000}s*
• Limite por janela: *${CONFIG.maxCommandsPerWindow} cmds / ${CONFIG.windowMs / 1000}s*
• Bloqueio: *${CONFIG.blockDuration / 1000}s*

🎵 *Cooldowns específicos:*
• #musica: *${CONFIG.commandCooldowns.musica / 1000}s*
• #pergunta: *${CONFIG.commandCooldowns.pergunta / 1000}s*
• #placar: *${CONFIG.commandCooldowns.placar / 1000}s*`;
    
    return reply(msg);
  }
};

module.exports = {
  name: 'minhafila',
  aliases: ['fila'],
  adminOnly: false,

  async execute({ senderId, reply }) {
    const fila = getUserQueue(senderId);
    
    if (fila.length === 0) {
      return reply('✅ Sua fila está vazia!');
    }
    
    let msg = '📋 *Sua fila de comandos:*\n\n';
    fila.forEach((cmd, i) => {
      const tempo = Math.round((Date.now() - cmd.queuedAt) / 1000);
      msg += `${i + 1}. *${cmd.commandName}* (${tempo}s)\n`;
    });
    
    return reply(msg);
  }
};
