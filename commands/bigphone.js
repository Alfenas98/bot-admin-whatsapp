const { iniciarBigphone, pararBigphone } = require('../lib/bigphone');

module.exports = {
  name: 'bigphone',
  aliases: ['telefone', 'phone', 'bigfone'],
  adminOnly: true,

  async execute({ sock, groupId, reply, args }) {
    if (!args[0]) {
      return reply('📞 Uso: #bigphone on/off');
    }
    
    const acao = args[0].toLowerCase();
    
    if (acao === 'on' || acao === 'ativar') {
      iniciarBigphone(sock, groupId);
      return reply('📞 Jogo Bigphone ativado!\n\nO bot vai ligar em horários aleatórios. Seja o primeiro a atender para ganhar coins! (ou receber um castigo 😱)');
    } else if (acao === 'off' || acao === 'desativar') {
      pararBigphone();
      return reply('📞 Jogo Bigphone desativado.');
    }
    
    return reply('⚠️ Use: #bigphone on/off');
  }
};
