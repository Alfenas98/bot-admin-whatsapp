const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { limparTimeout } = require('../lib/timeoutMute');

module.exports = {
  name: 'desmutar',
  aliases: ['desmute', 'unmute'],
  adminOnly: true,

  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Uso: #desmutar @pessoa ou #desmutar número');
    }

    // Verificar se há menção na mensagem
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let alvo = '';
    let nomeUsuario = '';

    if (mencionados.length > 0) {
      // Usar menção real
      alvo = mencionados[0];
      nomeUsuario = alvo.split('@')[0];
      
      // Tentar obter nome do participante
      try {
        const metadata = await sock.groupMetadata(groupId);
        const participante = metadata.participants?.find(p => p.id === alvo);
        if (participante?.pushName) {
          nomeUsuario = participante.pushName;
        }
      } catch (err) {}
    } else {
      // Fallback: extrair número do texto
      const numero = args[0].replace(/[^0-9]/g, '');
      
      if (!numero) {
        return reply('⚠️ Não foi possível identificar o usuário. Use: #desmutar @pessoa ou #desmutar 5511999998888');
      }
      
      alvo = numero + '@s.whatsapp.net';
      nomeUsuario = numero;
      
      // Tentar obter nome via groupMetadata
      try {
        const metadata = await sock.groupMetadata(groupId);
        const participante = metadata.participants?.find(p => p.id === alvo);
        if (participante?.pushName) {
          nomeUsuario = participante.pushName;
        }
      } catch (err) {}
    }

    const config = getGroupConfig(groupId);
    const muted = config.muted || [];

    // Verificar se está mutado (comparar números)
    const numeroAlvo = alvo.replace(/[^0-9]/g, '');
    const mutedList = muted.map(id => id.replace(/[^0-9]/g, ''));
    const jaMutado = mutedList.includes(numeroAlvo);

    if (!jaMutado) {
      return reply('⚠️ Essa pessoa não está mutada.');
    }

    // Encontrar ID completo no banco
    const idCompleto = muted.find(id => id.replace(/[^0-9]/g, '') === numeroAlvo) || alvo;
    
    limparTimeout(groupId, idCompleto);
    const novo = muted.filter(id => id.replace(/[^0-9]/g, '') !== numeroAlvo);
    setGroupConfig(groupId, 'muted', novo);

    await sock.sendMessage(groupId, {
      text: `🔊 ${nomeUsuario} foi desmutado e pode enviar mensagens novamente.`,
      mentions: [alvo]
    }, { quoted: msg });
  }
};
