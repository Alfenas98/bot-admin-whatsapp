module.exports = {
  name: 'dados',
  adminOnly: false,
  async execute({ sock, groupId, reply }) {
    const resultado = Math.floor(Math.random() * 6) + 1;

    const dados = {
      1: '⚀',
      2: '⚁',
      3: '⚂',
      4: '⚃',
      5: '⚄',
      6: '⚅'
    };

    await reply(`🎲 Você tirou: ${dados[resultado]} (${resultado})`);
  }
};