module.exports = {
  name: 'ppt',
  adminOnly: false,
  async execute({ sock, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Use: #ppt pedra | papel | tesoura');
    }

    const jogador = args[0].toLowerCase();
    const opcoes = ['pedra', 'papel', 'tesoura'];
    const emojis = { pedra: '🪨', papel: '📄', tesoura: '✂️' };

    if (!opcoes.includes(jogador)) {
      return reply('⚠️ Opções válidas: pedra, papel ou tesoura');
    }

    const bot = opcoes[Math.floor(Math.random() * 3)];

    let resultado;
    if (jogador === bot) resultado = 'Empate!';
    else if (
      (jogador === 'pedra' && bot === 'tesoura') ||
      (jogador === 'papel' && bot === 'pedra') ||
      (jogador === 'tesoura' && bot === 'papel')
    ) resultado = 'Você ganhou! 🎉';
    else resultado = 'Você perdeu! 😢';

    await reply(
      `🎮 *Pedra Papel Tesoura*\n\n` +
      `👤 Você: ${emojis[jogador]} ${jogador}\n` +
      `🤖 Bot: ${emojis[bot]} ${bot}\n\n` +
      `Resultado: ${resultado}`
    );
  }
};