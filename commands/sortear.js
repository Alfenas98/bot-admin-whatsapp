const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'sortear',
  aliases: ['sorteia', 'sortear', 'sorteio'],
  adminOnly: true,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Uso:\n#sorteia <segundos> <prêmio>\nEx: #sorteia 60 "Almoço no McDonald"\n#sorteia cancelar - Cancela sorteio ativo');
    }

    const sub = args[0].toLowerCase();
    
    if (sub === 'cancelar' || sub === 'cancel') {
      const config = getGroupConfig(groupId);
      if (!config.sorteioAtivo || !config.sorteioTempo) {
        return reply('⚠️ Nenhum sorteio ativo.');
      }

      // Limpa o timeout
      if (config.sorteioTimeout) {
        clearTimeout(config.sorteioTimeout);
      }
      
      setGroupConfig(groupId, 'sorteioAtivo', false);
      setGroupConfig(groupId, 'sorteioTempo', null);
      setGroupConfig(groupId, 'sorteioPremio', null);
      setGroupConfig(groupId, 'sorteioParticipantes', []);
      setGroupConfig(groupId, 'sorteioTimeout', null);
      
      return reply('🗑️ Sorteio cancelado.');
    }

    const duracaoSeg = parseInt(args[0], 10);
    const premio = args.slice(1).join(' ');

    if (isNaN(duracaoSeg) || duracaoSeg <= 0) {
      return reply('⚠️ Duração inválida. Use: #sorteia <segundos> <prêmio>');
    }

    const config = getGroupConfig(groupId);
    
    if (config.sorteioAtivo) {
      return reply('⚠️ Já existe um sorteio ativo. Use #sorteia cancelar primeiro.');
    }

    if (!premio) {
      return reply('⚠️ Use: #sorteia <segundos> <prêmio>');
    }

    setGroupConfig(groupId, 'sorteioAtivo', true);
    setGroupConfig(groupId, 'sorteioTempo', duracaoSeg);
    setGroupConfig(groupId, 'sorteioPremio', premio);
    setGroupConfig(groupId, 'sorteioParticipantes', []);

    const timeout = setTimeout(async () => {
      const cfg = getGroupConfig(groupId);
      if (!cfg.sorteioAtivo) return;

      const participantes = cfg.sorteioParticipantes || [];
      
      if (participantes.length === 0) {
        await sock.sendMessage(groupId, {
          text: '😕 Ninguém participou do sorteio.'
        });
      } else {
        const vencedor = participantes[Math.floor(Math.random() * participantes.length)];
        const numero = vencedor.split('@')[0];
        
        await sock.sendMessage(groupId, {
          text: `🎉 *Vencedor(a) do sorteio de "${premio}":*\n@${numero} parabéns!`,
          mentions: [vencedor]
        });
      }

      setGroupConfig(groupId, 'sorteioAtivo', false);
      setGroupConfig(groupId, 'sorteioTempo', null);
      setGroupConfig(groupId, 'sorteioPremio', null);
      setGroupConfig(groupId, 'sorteioParticipantes', []);
      setGroupConfig(groupId, 'sorteioTimeout', null);
    }, duracaoSeg * 1000);

    setGroupConfig(groupId, 'sorteioTimeout', timeout);

    await sock.sendMessage(groupId, {
      text: `🎁 *SORTEIO ATIVO!* \n🎁 Prêmio: ${premio}\n⏰ Dura ${duracaoSeg}s — envie qualquer mensagem para participar!`
    });
  }
};
