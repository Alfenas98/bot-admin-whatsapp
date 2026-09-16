const { getGroupConfig } = require('../lib/database');
const { getAdminIdsCached } = require('../lib/groupCache');

const MAX_HISTORICO = 50;
const COOLDOWN_MS = 30000; // 30 segundos
const MAX_CARACTERES = 500;

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

    // Sanitização de texto (remove markdown que pode quebrar formatação)
    const mensagemAnonima = args.join(' ').replace(/[*_~`]/g, '');

    // Limite de caracteres
    if (mensagemAnonima.length > MAX_CARACTERES) {
      return reply(`📬 Mensagem muito longa. Limite: ${MAX_CARACTERES} caracteres.`);
    }

    // Cooldown anti-spam
    const historicoAtual = config.caixaAnonima?.historico || [];
    const ultimaMsg = historicoAtual.filter(h => h.remetente === (msg.pushName || 'Anônimo')).pop();
    if (ultimaMsg && Date.now() - ultimaMsg.timestamp < COOLDOWN_MS) {
      const restante = Math.ceil((COOLDOWN_MS - (Date.now() - ultimaMsg.timestamp)) / 1000);
      return reply(`⏳ Aguarde ${restante} segundos antes de enviar outra mensagem anônima.`);
    }

    // Tenta apagar a mensagem original (requer bot como admin)
    try {
      await sock.sendMessage(groupId, { delete: msg.key });
    } catch (err) {
      console.log('[anomsg] Não foi possível apagar mensagem original:', err.message);
    }

    // Salva no histórico para admins verem (com limite)
    const historico = [...historicoAtual];
    historico.push({
      timestamp: Date.now(),
      remetente: msg.pushName || 'Anônimo',
      mensagem: mensagemAnonima
    });
    // Remove o mais antigo se passar do limite
    if (historico.length > MAX_HISTORICO) historico.shift();
    setGroupConfig(groupId, 'caixaAnonima.historico', historico);

    const contador = historico.length;
    
    // Envia a mensagem anônima sem identificação do remetente
    const textoAnonimo = `📬 *Mensagem Anônimo #${contador}:*\n\n${mensagemAnonima}`;
    
    try {
      await sock.sendMessage(groupId, { text: textoAnonimo });
    } catch (err) {
      await reply('⚠️ Erro ao enviar mensagem anônima. Verifique se o bot tem permissões.');
    }

    // Notifica admins sobre nova mensagem anônima
    try {
      const admins = await getAdminIdsCached(sock, groupId);
      const preview = mensagemAnonima.substring(0, 100) + (mensagemAnonima.length > 100 ? '...' : '');
      for (const admin of admins) {
        try {
          await sock.sendMessage(admin, {
            text: `📬 *Nova mensagem anônima:*\n\n"${preview}"`
          });
        } catch (e) {}
      }
    } catch (e) {}
  }
};
