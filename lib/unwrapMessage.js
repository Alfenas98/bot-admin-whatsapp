/**
 * O WhatsApp embrulha o conteúdo real da mensagem quando ela é temporária
 * (mensagens que somem) ou de visualização única. Sem desembrulhar isso,
 * o bot não reconhece imagem/vídeo/link/etc corretamente e a moderação
 * deixa passar sem querer.
 */
function desembrulharMensagem(message) {
  if (!message) return message;

  if (message.ephemeralMessage) {
    return desembrulharMensagem(message.ephemeralMessage.message);
  }
  if (message.viewOnceMessage) {
    return desembrulharMensagem(message.viewOnceMessage.message);
  }
  if (message.viewOnceMessageV2) {
    return desembrulharMensagem(message.viewOnceMessageV2.message);
  }
  if (message.viewOnceMessageV2Extension) {
    return desembrulharMensagem(message.viewOnceMessageV2Extension.message);
  }
  if (message.documentWithCaptionMessage) {
    return desembrulharMensagem(message.documentWithCaptionMessage.message);
  }

  return message;
}

module.exports = { desembrulharMensagem };
