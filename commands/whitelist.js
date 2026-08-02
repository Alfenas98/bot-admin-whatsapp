const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'whitelist',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const acao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (acao === 'add' && args[1]) {
      const numero = args[1].replace(/\D/g, '');
      const lista = new Set(config.whitelistLinks);
      lista.add(numero);
      setGroupConfig(groupId, 'whitelistLinks', [...lista]);
      return reply(`➕ Número ${numero} pode mandar link mesmo com anti-link ativado.`);
    }

    if (acao === 'remover' && args[1]) {
      const numero = args[1].replace(/\D/g, '');
      const lista = config.whitelistLinks.filter(n => n !== numero);
      setGroupConfig(groupId, 'whitelistLinks', lista);
      return reply(`➖ Número ${numero} removido da whitelist.`);
    }

    return reply(
      `Uso: #whitelist add <numero> | #whitelist remover <numero>\n` +
      `Números na whitelist (com DDI, sem +): ${config.whitelistLinks.join(', ') || '(nenhum)'}\n\n` +
      `Útil pra deixar seu bot de afiliados postar links mesmo com anti-link ligado.`
    );
  }
};
