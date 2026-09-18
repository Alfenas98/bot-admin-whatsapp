const { chatWithMemory, clearMemory } = require('../lib/ai');

module.exports = {
  name: 'ia',
  aliases: ['bot', 'chat', 'assistente'],
  adminOnly: false,

  async execute({ sock, msg, groupId, senderId, args, reply }) {
    if (args.length === 0) {
      return reply('🤖 *IA do Bot*\n\nUse: #ia <mensagem>\nExemplo: #ia Qual a capital do Brasil?\n\n💡 Dicas:\n• #ia oi → Cumprimentar\n• #ia piada → Contar piada\n• #ia dica → Dica aleatória\n• #limpaia → Limpar memória');
    }

    const message = args.join(' ');
    const userName = msg.pushName || 'Usuário';
    
    try {
      await sock.sendMessage(groupId, { text: '🤔 Pensando...' }, { quoted: msg });
      
      const resposta = await chatWithMemory(senderId, userName, message);
      
      if (resposta) {
        await sock.sendMessage(groupId, { text: `🤖 ${resposta}` }, { quoted: msg });
      } else {
        await reply('⚠️ A IA não conseguiu responder. Tente novamente.');
      }
    } catch (err) {
      console.error('[ia] Erro:', err.message);
      await reply('⚠️ Erro ao processar. Tente novamente.');
    }
  }
};
