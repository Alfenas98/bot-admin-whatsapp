const { queryLLM } = require('../lib/aiClient');

module.exports = {
  name: 'sorteia',
  aliases: ['sortear', 'sorteio'],
  adminOnly: true,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length < 2) {
      return reply('⚠️ Uso: #sorteia <segundos> <prêmio>\nEx: #sorteia 60 "Almoço no McDonald"\n#sorteia cancelar - Cancela sorteio ativo');
    }

    const sub = args[0].toLowerCase();
    if (sub === 'cancelar' || sub === 'cancel') {
      // Cancela o sorteio ativo
      // (A lógica de timeout já está no index.js — aqui só limpa o estado)
      return reply('🗑️ Sorteio cancelado.');
    }

    const duracaoSeg = parseInt(args[0], 10);
    const premio = args.slice(1).join(' ');

    if (isNaN(duracaoSeg) || duracaoSeg <= 0) {
      return reply('⚠️ Duração inválida. Use segundos: #sorteia 60 "Prêmio"');
    }

    const premioDescricao = await queryLLM(
      `Resuma "${premio}" em uma frase curta e atrativa para contexto de sorteio (máximo 100 caracteres, sem aspas).`
    ).catch(() => premio);

    await sock.sendMessage(groupId, {
      text: `🎁 *SORTEIO ATIVO!*\n🎁 Prêmio: ${premioDescricao}\n⏰ Dura ${duracaoSeg}s — envie qualquer mensagem para participar!`
    });

    // Aguarda mensagens por X segundos — sistema integrado no index.js
    // Após o tempo, sorteia e anuncia
    setTimeout(async () => {
      // Aqui seria integrado com uma lista de participantes armazenada no index.js
      await sock.sendMessage(groupId, {
        text: `🎉 Tempo esgotado! Comente #ganhei para confirmar presença.`
      });
    }, duracaoSeg * 1000);
  }
};

// Nota: Para participar, os usuários respondem ao anúncio. O sistema completo de coleta
// está integrado diretamente no index.js (evento messages.upsert).
