const axios = require('axios');

module.exports = {
  name: 'traduzir',
  aliases: ['traduz', 'translate', 'trad'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply, args }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    let textoParaTraduzir = '';
    
    // Verificar se é uma resposta a outra mensagem
    const mensagemRespondida = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (mensagemRespondida) {
      if (mensagemRespondida.conversation) {
        textoParaTraduzir = mensagemRespondida.conversation;
      } else if (mensagemRespondida.extendedTextMessage?.text) {
        textoParaTraduzir = mensagemRespondida.extendedTextMessage.text;
      } else {
        return reply('⚠️ A mensagem respondida não contém texto para traduzir.');
      }
    } else if (args.length > 0) {
      textoParaTraduzir = args.join(' ');
    } else {
      return reply('⚠️ Responda a uma mensagem com #traduzir ou envie o texto após o comando.');
    }

    if (!textoParaTraduzir.trim()) {
      return reply('⚠️ Nenhum texto encontrado para traduzir.');
    }

    if (textoParaTraduzir.length > 500) {
      textoParaTraduzir = textoParaTraduzir.substring(0, 500) + '...';
    }

    try {
      const prompt = `Traduza o texto abaixo para Português-BR. Detecte o idioma automaticamente.

"${textoParaTraduzir}"

Retorne APENAS a tradução, sem explicações ou aspas adicionais.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ Não foi possível traduzir. Tente novamente.');
      }

      return reply(`🇧🇷 *Tradução para Português-BR:*\n\n_${resposta}_`);
    } catch (err) {
      console.error('[traduzir] Erro:', err.message);
      return reply('⚠️ Erro ao traduzir. Tente novamente mais tarde.');
    }
  }
};
