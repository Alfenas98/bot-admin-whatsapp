const axios = require('axios');

module.exports = {
  name: 'pergunta',
  aliases: ['ia', 'perguntar', 'chat', 'gemini'],
  adminOnly: false,

  async execute({ groupId, msg, reply, args }) {
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
        textoPergunta = args.join(' ') + (textoRespondido ? `\n\nContexto da mensagem respondida: "${textoRespondido}"` : '');
      } else if (textoRespondido) {
        textoPergunta = textoRespondido;
      } else {
        return reply('⚠️ Responda a uma mensagem ou envie uma pergunta após o comando.');
      }
    } else {
      if (args.length === 0) {
        return reply('⚠️ Use: #pergunta <sua pergunta>\n\nExemplo: #pergunta Como programar em JavaScript?\n\nOu responda a uma mensagem com #pergunta');
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
      // Chamar API do Gemini
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: textoPergunta }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu responder. Tente novamente.');
      }

      // Limitar tamanho da resposta do WhatsApp
      const respostaLimitada = resposta.substring(0, 4000);
      
      return reply(`🤖 *Resposta da IA:*\n\n${respostaLimitada}`);
    } catch (err) {
      console.error('[pergunta] Erro:', err.message);
      if (err.response?.status === 429) {
        return reply('⚠️ Muitas requisições para a IA. Aguarde um momento.');
      }
      return reply('⚠️ Erro ao processar pergunta. Tente novamente mais tarde.');
    }
  }
};
