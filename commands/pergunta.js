const { chatWithMemory } = require('../lib/ai');

module.exports = {
  name: 'pergunta',
  aliases: ['ia', 'perguntar', 'chat', 'gemini'],
  adminOnly: false,

  async execute({ groupId, msg, reply, args, senderId }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    let textoPergunta = '';
    
    const mensagemRespondida = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (mensagemRespondida) {
      let textoRespondido = '';
      if (mensagemRespondida.conversation) {
        textoRespondido = mensagemRespondida.conversation;
      } else if (mensagemRespondida.extendedTextMessage?.text) {
        textoRespondido = mensagemRespondida.extendedTextMessage.text;
      }
      
      if (args.length > 0) {
        textoPergunta = args.join(' ') + (textoRespondido ? `\nContexto: "${textoRespondido}"` : '');
      } else if (textoRespondido) {
        textoPergunta = textoRespondido;
      } else {
        return reply('⚠️ Responda a uma mensagem ou envie uma pergunta após o comando.');
      }
    } else {
      if (args.length === 0) {
        return reply('⚠️ Use: #pergunta <sua pergunta>');
      }
      textoPergunta = args.join(' ');
    }

    if (!textoPergunta.trim()) {
      return reply('⚠️ Nenhuma pergunta encontrada.');
    }

    if (textoPergunta.length > 1000) {
      return reply('⚠️ Pergunta muito longa. Limite: 1000 caracteres.');
    }

    try {
      await reply('🤔 Pensando...');
      
      const userName = msg.pushName || 'Usuário';
      const resposta = await chatWithMemory(senderId, userName, textoPergunta);
      
      if (resposta) {
        await reply(`🤖 ${resposta}`);
      } else {
        await reply('⚠️ A IA não conseguiu responder. Tente novamente.');
      }
    } catch (err) {
      console.error('[pergunta] Erro:', err.message);
      await reply('⚠️ Erro ao processar pergunta.');
    }
  }
};
