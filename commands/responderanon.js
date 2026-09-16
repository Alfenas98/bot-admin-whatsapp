const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'responderanon',
  aliases: ['respanon', 'replyanon'],
  adminOnly: true,

  async execute({ sock, groupId, args, reply, getGroupConfig }) {
    const config = getGroupConfig(groupId);
    const historico = config.caixaAnonima?.historico || [];

    if (historico.length === 0) {
      return reply('📭 Histórico anônimo está vazio.');
    }

    if (args.length < 2) {
      return reply('📬 Use: #responderanon <número> <resposta>\n\nVeja os números com #histanon');
    }

    const indice = parseInt(args[0]) - 1;
    const resposta = args.slice(1).join(' ');

    if (indice < 0 || indice >= historico.length) {
      return reply(`📬 Número inválido. Use entre 1 e ${historico.length}.`);
    }

    const mensagemOriginal = historico[indice];
    const textoResposta = `📬 *Resposta Anônima:*\n\n${resposta}`;

    try {
      await sock.sendMessage(groupId, { text: textoResposta });
      return reply(`✅ Resposta enviada para a mensagem #${indice + 1}.`);
    } catch (err) {
      await reply('⚠️ Erro ao enviar resposta.');
    }
  }
};
