module.exports = {
  name: 'sorteio',
  adminOnly: true,
  async execute({ sock, groupId, args, reply }) {
    const segundos = parseInt(args[0], 10);
    const premio = args.slice(1).join(' ');

    if (!segundos || segundos < 5 || !premio) {
      return reply('Uso: #sorteio <segundos> <prêmio>\nEx: #sorteio 60 Cupom de 10%');
    }

    const participantes = new Set();

    const coletor = ({ messages, type }) => {
      if (type !== 'notify') return;
      const msg = messages[0];
      if (!msg.message || msg.key.fromMe) return;
      if (msg.key.remoteJid !== groupId) return;
      const senderId = msg.key.participant || msg.key.remoteJid;
      participantes.add(senderId);
    };

    sock.ev.on('messages.upsert', coletor);

    await sock.sendMessage(groupId, {
      text: `🎁 *SORTEIO ABERTO!*\nPrêmio: ${premio}\nMande qualquer mensagem nos próximos ${segundos}s pra participar!`
    });

    setTimeout(async () => {
      sock.ev.off('messages.upsert', coletor);

      const lista = [...participantes];
      if (lista.length === 0) {
        return sock.sendMessage(groupId, { text: '😕 Ninguém participou do sorteio a tempo.' });
      }

      const vencedor = lista[Math.floor(Math.random() * lista.length)];
      await sock.sendMessage(groupId, {
        text: `🎉 O vencedor do sorteio de "${premio}" é: @${vencedor.split('@')[0]}!\n(${lista.length} participante(s) no total)`,
        mentions: [vencedor]
      });
    }, segundos * 1000);
  }
};
