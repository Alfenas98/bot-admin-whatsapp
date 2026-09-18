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
    
    // Verificar se é uma resposta a outra mensagem
    const mensagemRespondida = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (mensagemRespondida) {
      let textoRespondido = '';
      if (mensagemRespondida.conversation) {
        textoRespondido = mensagemRespondida.conversation;
      } else if (mensagemRespondida.extendedTextMessage?.text) {
        textoRespondido = mensagemRespondida.extendedTextMessage.text;
      }
      
      if (args.length > 0) {
        textoPergunta = args.join(' ') + (textoRespondido ? `\n\nContexto: "${textoRespondido}"` : '');
      } else if (textoRespondido) {
        textoPergunta = textoRespondido;
      } else {
        return reply('⚠️ Responda a uma mensagem ou envie uma pergunta após o comando.');
      }
    } else {
      if (args.length === 0) {
        return reply('⚠️ Use: #pergunta <sua pergunta>\n\nExemplo: #pergunta Qual a capital do Brasil?');
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
      await reply('🤔 Pesquisando e pensando...');
      
      const userName = msg.pushName || 'Usuário';
      const resposta = await chatWithMemory(senderId, userName, textoPergunta);
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu responder. Tente novamente.');
      }

      const respostaLimitada = resposta.substring(0, 4000);
      return reply(`🤖 *Resposta:*\n\n${respostaLimitada}`);
    } catch (err) {
      console.error('[pergunta] Erro:', err.message);
      return reply('⚠️ Erro ao processar pergunta.');
    }
  }
};
