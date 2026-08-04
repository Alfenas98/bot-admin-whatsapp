const { getRelacionamento, formatarDuracao } = require('../lib/relationships');

module.exports = {
  name: 'casal',
  aliases: ['relacionamento', 'namorando'],
  adminOnly: false,
  async execute({ sock, groupId, msg, senderId, reply }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvoId = mencionados[0] || senderId;

    const rel = getRelacionamento(groupId, alvoId);
    if (!rel) {
      return reply(
        alvoId === senderId
          ? 'Você não está namorando ninguém nesse grupo ainda. Use #namorar @alguém pra propor!'
          : 'Essa pessoa não está namorando ninguém nesse grupo.'
      );
    }

    const duracaoNamoro = formatarDuracao(rel.desde);
    const dataInicioNamoro = new Date(rel.desde).toLocaleString('pt-BR');

    let texto =
      `${rel.casado ? '💍' : '💖'} @${alvoId.split('@')[0]}\n` +
      `${rel.casado ? '👰🤵 Está casado(a) com' : '💍 Está namorando(a) com'} @${rel.parceiroId.split('@')[0]}\n\n` +
      `⏳ Namorando há ${duracaoNamoro}\n` +
      `⌛ Namorando desde: ${dataInicioNamoro}`;

    if (rel.casado) {
      const duracaoCasamento = formatarDuracao(rel.casadoDesde);
      const dataInicioCasamento = new Date(rel.casadoDesde).toLocaleString('pt-BR');
      texto += `\n\n💒 Casados há ${duracaoCasamento}\n📜 Casamento desde: ${dataInicioCasamento}`;
    }

    return sock.sendMessage(groupId, {
      text: texto,
      mentions: [alvoId, rel.parceiroId]
    });
  }
};
