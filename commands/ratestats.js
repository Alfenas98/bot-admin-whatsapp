const { getStats, CONFIG } = require('../lib/rateLimiter');

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
⏳ Execuções pendentes: *${stats.pendingExecutions}*

⚙️ *Configuração:*
• Cooldown padrão: *${CONFIG.commandCooldowns.default / 1000}s*
• Limite por janela: *${CONFIG.maxCommandsPerWindow} cmds / ${CONFIG.windowMs / 1000}s*
• Bloqueio: *${CONFIG.blockDuration / 1000}s*

🎵 *Cooldowns específicos:*
• #musica: *${CONFIG.commandCooldowns.musica / 1000}s*
• #pergunta: *${CONFIG.commandCooldowns.pergunta / 1000}s*
• #placar: *${CONFIG.commandCooldowns.placar / 1000}s*
• #clima: *${CONFIG.commandCooldowns.clima / 1000}s*
• #cotacao: *${CONFIG.commandCooldowns.cotacao / 1000}s*
• #noticias: *${CONFIG.commandCooldowns.noticias / 1000}s*`;
    
    return reply(msg);
  }
};
