module.exports = {
  name: 'ping',
  adminOnly: false,
  async execute({ reply }) {
    const inicio = Date.now();
    await reply('🏓 Pong!');
    const fim = Date.now();
    await reply(`⏱️ Latência: ${fim - inicio}ms`);
  }
};