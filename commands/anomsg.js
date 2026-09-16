const { getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'anomsg',
  aliases: ['anon', 'caixa'],
  adminOnly: false,

  async execute({ sock, groupId, args, msg, reply, getGroupConfig, setGroupConfig }) {
    const config = getGroupConfig(groupId);
    
    if (!config.caixaAnonima?.ativo) {
      return reply('📬 A caixa anônima está desativada neste grupo.\n\nUse #caixaanon para ativar.');
    }

    if (args.length === 0) {
      return reply('📬 Use: #anomsg <sua mensagem>\nExemplo: #anomsg Olá, isso é um teste!');
    }

    const mensagemAnonima = args.join(' ');

    // Tenta apagar a mensagem original (requer bot como admin)
    try {
      await sock.sendMessage(groupId, { delete: msg.key });
    } catch (err) {
      console.log('[anomsg] Não foi possível apagar mensagem original:', err.message);
    }

    // Salva no histórico para admins verem
    const historico = [...(config.caixaAnonima?.historico || [])];
    historico.push({
      timestamp: Date.now(),
      remetente: msg.pushName || 'Anônimo',
      mensagem: mensagemAnonima
    });
    setGroupConfig(groupId, 'caixaAnonima.historico', historico);

    // Envia a mensagem anônima sem identificação do remetente
    const textoAnonimo = `📬 *Mensagem Anônima:*\n\n${mensagemAnonima}`;
    
    try {
      await sock.sendMessage(groupId, { text: textoAnonimo });
    } catch (err) {
      await reply('⚠️ Erro ao enviar mensagem anônima. Verifique se o bot tem permissões.');
    }
  }
};
