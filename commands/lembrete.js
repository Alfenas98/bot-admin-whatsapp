const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { queryLLM } = require('../lib/aiClient');

module.exports = {
  name: 'lembrete',
  aliases: ['lembrete', 'lembrar', 'reminder'],
  adminOnly: true,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Uso:\n#lembrete add <HH:MM|10m|2h|1d> <mensagem>\n#lembrete list\n#lembrete rm <número>');
    }

    const sub = args[0].toLowerCase();

    // Listar lembretes
    if (sub === 'list' || sub === 'lista') {
      const lembretes = getGroupConfig(groupId).lembretes || [];
      if (lembretes.length === 0) {
        return reply('📋 Nenhum lembrete agendado.');
      }
      const lista = lembretes.map((l, i) => `${i + 1}. [${l.horario}] ${l.mensagem}`);
      return reply(`📋 *Lembretes agendados:*\n${lista.join('\n')}`);
    }

    // Remover lembrete
    if (sub === 'rm' || sub === 'remover') {
      const idx = parseInt(args[1], 10) - 1;
      const lembretes = getGroupConfig(groupId).lembretes || [];
      if (isNaN(idx) || idx < 0 || idx >= lembretes.length) {
        return reply('⚠️ Índice inválido. Use #lembrete list para ver os números.');
      }

      const removido = lembretes.splice(idx, 1)[0];
      setGroupConfig(groupId, 'lembretes', lembretes);
      
      // Limpa timeout se existir
      if (global.lembreteTimeouts?.[groupId]?.[removido.id]) {
        clearTimeout(global.lembreteTimeouts[groupId][removido.id]);
        delete global.lembreteTimeouts[groupId][removido.id];
      }

      return reply(`✅ Lembrete #${idx + 1} removido.`);
    }

    // Adicionar lembrete
    if (sub === 'add' || sub === 'agendar') {
      const horarioStr = args[1];
      const mensagemUsuario = args.slice(2).join(' ');

      if (!horarioStr || !mensagemUsuario) {
        return reply('⚠️ Uso: #lembrete add <HH:MM|10m|2h|1d> <mensagem>');
      }

      // Tenta parsear a duração
      let duracaoMs = null;
      let horarioFormatado = horarioStr;
      let mensagem = mensagemUsuario;

      // Se for formato HH:MM
      if (/^\d{1,2}:\d{2}$/.test(horarioStr)) {
        const [h, m] = horarioStr.split(':').map(x => parseInt(x, 10));
        const agora = new Date();
        const alvo = new Date(agora);
        alvo.setHours(h, m, 0, 0);
        if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);
        duracaoMs = alvo.getTime() - agora.getTime();
      } else if (/^\d+(s|m|h|d)$/.test(horarioStr)) {
        const valor = parseInt(horarioStr.match(/\d+/)[0], 10);
        const unidade = horarioStr.match(/[smhd]/)[0];
        const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        duracaoMs = valor * mult[unidade];
      } else {
        return reply('⚠️ Formato inválido. Use HH:MM (20:30), 10m (10 min) ou 2h (2 horas)');
      }

      if (!duracaoMs || duracaoMs <= 0) {
        return reply('⚠️ Duração inválida.');
      }

      // Gera um título curto usando IA (opcional)
      let titulo = mensagem;

      const lembretes = getGroupConfig(groupId).lembretes || [];
      const novoId = lembretes.length > 0 ? Math.max(...lembretes.map(l => l.id)) + 1 : 0;
      
      const entrada = {
        id: novoId,
        horario: horarioStr,
        mensagem: titulo
      };
      lembretes.push(entrada);
      setGroupConfig(groupId, 'lembretes', lembretes);

      // Agenda
      if (!global.lembreteTimeouts) global.lembreteTimeouts = {};
      if (!global.lembreteTimeouts[groupId]) global.lembreteTimeouts[groupId] = {};
      global.lembreteTimeouts[groupId][novoId] = setTimeout(async () => {
        await sock.sendMessage(groupId, {
          text: `🔔 *Lembrete:* ${titulo}`
        });
        const atual = getGroupConfig(groupId).lembretes || [];
        const filtrado = atual.filter(l => l.id !== novoId);
        setGroupConfig(groupId, 'lembretes', filtrado);
        delete global.lembreteTimeouts[groupId][novoId];
      }, duracaoMs);

      return reply(`✅ Lembrete agendado para ${horarioStr}: "${titulo}"`);
    }

    return reply('⚠️ Subcomando desconhecido. Use: add, list, rm');
  }
};
