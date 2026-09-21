const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { CARGOS } = require('../lib/cargos');

module.exports = {
  name: 'cargos',
  aliases: ['sistemacargos'],
  adminOnly: true,

  async execute({ groupId, reply, args }) {
    const config = getGroupConfig(groupId);
    
    if (!args[0]) {
      const status = config.cargos?.ativo ? '✅ Ativado' : '❌ Desativado';
      let msg = `🎖️ *Sistema de Cargos*\n\n`;
      msg += `Status: *${status}*\n\n`;
      msg += `📋 *Cargos Disponíveis:*\n`;
      for (const c of CARGOS) {
        msg += `• Nv ${c.nivel}: ${c.emoji} ${c.nome}\n`;
      }
      msg += `\n💡 Use #cargos on para ativar`;
      return reply(msg);
    }
    
    const acao = args[0].toLowerCase();
    
    if (acao === 'on' || acao === 'ativar') {
      setGroupConfig(groupId, 'cargos.ativo', true);
      return reply('✅ Sistema de cargos ativado!');
    } else if (acao === 'off' || acao === 'desativar') {
      setGroupConfig(groupId, 'cargos.ativo', false);
      return reply('❌ Sistema de cargos desativado.');
    }
    
    return reply('⚠️ Use: #cargos on/off');
  }
};
