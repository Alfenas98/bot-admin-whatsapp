module.exports = {
  name: 'enquete',
  aliases: ['poll'],
  adminOnly: false,
  async execute({ sock, groupId, args, reply }) {
    const texto = args.join(' ');
    const partes = texto.split('|').map(p => p.trim()).filter(Boolean);

    if (partes.length < 3) {
      return reply('Uso: #enquete Pergunta | Opção 1 | Opção 2 | Opção 3 (até 12 opções)');
    }

    const [pergunta, ...opcoes] = partes;

    try {
      await sock.sendMessage(groupId, {
        poll: {
          name: pergunta,
          values: opcoes.slice(0, 12),
          selectableCount: 1
        }
      });
    } catch (err) {
      return reply('⚠️ Não consegui criar a enquete.');
    }
  }
};
