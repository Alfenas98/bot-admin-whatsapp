const axios = require('axios');
const { getGroupConfig } = require('../lib/database');

// Cache de últimas mensagens para tradução rápida
const messageCache = new Map();

// Função para limpar mensagens antigas do cache (5 min)
setInterval(() => {
  const agora = Date.now();
  for (const [key, val] of messageCache.entries()) {
    if (agora - val.timestamp > 300000) messageCache.delete(key);
  }
}, 60000);

module.exports = {
  name: 'traduzir',
  aliases: ['traduz', 'translate', 'trad'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply }) {
    const config = getGroupConfig(groupId);
    
    // Verificar se é uma resposta a outra mensagem
    const mensagemRespondida = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mensagemRespondidaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    
    let textoParaTraduzir = '';
    
    if (mensagemRespondida) {
      // Extrair texto da mensagem respondida
      if (mensagemRespondida.conversation) {
        textoParaTraduzir = mensagemRespondida.conversation;
      } else if (mensagemRespondida.extendedTextMessage?.text) {
        textoParaTraduzir = mensagemRespondida.extendedTextMessage.text;
      } else {
        return reply('⚠️ A mensagem respondida não contém texto para traduzir.');
      }
    } else {
      // Verificar cache de mensagens recentes
      const cached = messageCache.get(groupId);
      if (cached && cached.text) {
        textoParaTraduzir = cached.text;
      } else {
        return reply('⚠️ Responda a uma mensagem com #traduzir para traduzir o texto.\n\nOu envie o texto após o comando: #traduzir <texto>');
      }
    }

    if (!textoParaTraduzir.trim()) {
      return reply('⚠️ Nenhum texto encontrado para traduzir.');
    }

    // Limitar tamanho
    if (textoParaTraduzir.length > 500) {
      textoParaTraduzir = textoParaTraduzir.substring(0, 500) + '...';
    }

    try {
      // Detectar idioma usando API gratuita
      const detectarIdioma = async (texto) => {
        try {
          const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto.substring(0, 100))}&langpair=en|pt-BR`);
          const matches = res.data?.matches || [];
          if (matches.length > 0) {
            return matches[0].sourceLanguage || 'unknown';
          }
        } catch (e) {}
        return 'auto';
      };

      const idiomaDetectado = await detectarIdioma(textoParaTraduzir);
      
      // Traduzir para pt-BR
      const urlTraducao = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textoParaTraduzir)}&langpair=${idiomaDetectado}|pt-BR`;
      
      const res = await axios.get(urlTraducao, { timeout: 10000 });
      
      if (res.data?.responseStatus === 200 || res.data?.translatedText) {
        const traducao = res.data.translatedText;
        const idiomaNome = idiomaDetectado === 'en' ? 'Inglês' : 
                          idiomaDetectado === 'es' ? 'Espanhol' :
                          idiomaDetectado === 'fr' ? 'Francês' :
                          idiomaDetectado === 'de' ? 'Alemão' :
                          idiomaDetectado === 'it' ? 'Italiano' :
                          idiomaDetectado === 'ja' ? 'Japonês' :
                          idiomaDetectado === 'ko' ? 'Coreano' :
                          idiomaDetectado === 'zh' ? 'Chinês' :
                          idiomaDetectado === 'auto' ? 'Desconhecido' :
                          idiomaDetectado;
        
        const textoTraduzido = `🇧🇷 *Tradução para Português-BR:*

_${traducao}_

🌐 Idioma detectado: ${idiomaNome}`;

        return reply(textoTraduzido);
      } else {
        return reply('⚠️ Não foi possível traduzir a mensagem. Tente novamente.');
      }
    } catch (err) {
      console.error('[traduzir] Erro:', err.message);
      return reply('⚠️ Erro ao traduzir. Verifique se o texto não é muito longo.');
    }
  }
};
