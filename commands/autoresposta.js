const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'autoresposta',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const acao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (acao === 'on' || acao === 'off') {
      setGroupConfig(groupId, 'autoresposta.ativo', acao === 'on');
      return reply(`💬 Auto-resposta ${acao === 'on' ? 'ATIVADA ✅' : 'DESATIVADA ❌'}`);
    }

    if (acao === 'add') {
      const gatilho = (args[1] || '').toLowerCase();
      const resposta = args.slice(2).join(' ');
      if (!gatilho || !resposta) return reply('Uso: #autoresposta add <gatilho> <resposta>');
      setGroupConfig(groupId, `autoresposta.gatilhos.${gatilho}`, resposta);
      return reply(`➕ Quando alguém mandar "${gatilho}", o bot vai responder: "${resposta}"`);
    }

    if (acao === 'remover') {
      const gatilho = (args[1] || '').toLowerCase();
      const gatilhos = { ...config.autoresposta.gatilhos };
      delete gatilhos[gatilho];
      setGroupConfig(groupId, 'autoresposta.gatilhos', gatilhos);
      return reply(`➖ Gatilho "${gatilho}" removido.`);
    }

    if (acao === 'lista') {
      const entradas = Object.entries(config.autoresposta.gatilhos);
      if (entradas.length === 0) return reply('Nenhum gatilho cadastrado ainda.');
      return reply(entradas.map(([g, r]) => `• ${g} → ${r}`).join('\n'));
    }

    return reply('Uso: #autoresposta on|off\n#autoresposta add <gatilho> <resposta>\n#autoresposta remover <gatilho>\n#autoresposta lista');
  }
};
