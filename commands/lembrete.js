const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { parseDuracao, formatarDuracao } = require('../lib/timeoutMute');

module.exports = {
  name: 'lembrete',
  aliases: ['lembrete', 'reminder'],
  adminOnly: true,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Uso:\n#lembrete add <HH:MM|HHhMMm|10m> <mensagem>\n#lembrete list\n#lembrete rm <número>\n#lembrete clear\n\nEx: #lembrete add 20:00 Reunião de amanhã\n#lembrete add 10m Hora do almoço\n#lembrete add 1d Aviso importante');
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

    // Limpar lembretes
    if (sub === 'clear' || sub === 'limpar') {
      setGroupConfig(groupId, 'lembretes', []);
      // Limpa timeouts
      const lembretes = getGroupConfig(groupId).lembretes || [];
      if (global.lembreteTimeouts && global.lembreteTimeouts[groupId]) {
        Object.values(global.lembreteTimeouts[groupId]).forEach(t => clearTimeout(t));
        delete global.lembreteTimeouts[groupId];
      }
      return reply('🗑️ Todos os lembretes foram limpos.');
    }

    // Remover lembrete específico
    if (sub === 'rm' || sub === 'remover') {
      const idx = parseInt(args[1], 10) - 1;
      const lembretes = getGroupConfig(groupId).lembretes || [];
      
      if (isNaN(idx) || idx < 0 || idx >= lembretes.length) {
        return reply('⚠️ Índice inválido. Use #lembrete list para ver os números.');
      }

      if (!global.lembreteTimeouts || !global.lembreteTimeouts[groupId] || !global.lembreteTimeouts[groupId][idx]) {
        return reply('⚠️ Não foi possível localizar o timer do lembrete.');
      }

      clearTimeout(global.lembreteTimeouts[groupId][idx]);
      lembretes.splice(idx, 1);
      setGroupConfig(groupId, 'lembretes', lembretes);
      delete global.lembreteTimeouts[groupId][idx];
      
      return reply(`✅ Lembrete #${idx + 1} removido.`);
    }

    // Adicionar lembrete
    if (sub === 'add' || sub === 'agendar') {
      const horarioStr = args[1];
      const mensagem = args.slice(2).join(' ');

      if (!horarioStr || !mensagem) {
        return reply('⚠️ Uso: #lembrete add <HH:MM|HHhMMm|10m|1h|1d> <mensagem>\nEx: #lembrete add 20:00 Reunião de amanhã');
      }

      let duracaoMs = null;
      let horarioFormatado = horarioStr;

      // Tenta formatos de duração: 10m, 2h, 1d
      try {
        duracaoMs = parseDuracao(horarioStr);
        horarioFormatado = formatarDuracao(duracaoMs);
      } catch (e) {
        // Tenta HH:MM
        if (/^\d{1,2}:\d{2}$/.test(horarioStr)) {
          const [h, m] = horarioStr.split(':').map(x => parseInt(x, 10));
          const agora = new Date();
          const alvo = new Date(agora);
          alvo.setHours(h, m, 0, 0);
          
          // Se o horário já passou hoje, agenda para amanhã
          if (alvo <= agora) {
            alvo.setDate(alvo.getDate() + 1);
          }
          
          duracaoMs = alvo.getTime() - agora.getTime();
          horarioFormatado = horarioStr;
        } else if (/^\d{1,2}h\d{2}m$/.test(horarioStr)) {
          const match = horarioStr.match(/^(\d+)h(\d+)m$/);
          const horas = parseInt(match[1], 10);
          const minutos = parseInt(match[2], 10);
          duracaoMs = (horas * 3600 + minutos * 60) * 1000;
          horarioFormatado = `${horas}h${minutos}m`;
        } else {
          return reply('⚠️ Formato inválido. Use HH:MM (20:30), 10m (10 minutos), 2h (2 horas) ou 1d (1 dia)');
        }
      }

      if (duracaoMs === null || duracaoMs <= 0) {
        return reply('⚠️ Duração inválida.');
      }

      const lembretes = getGroupConfig(groupId).lembretes || [];
      const novoId = lembretes.length;
      
      lembretes.push({
        id: novoId,
        horario: horarioFormatado,
        mensagem,
        criadoEm: new Date().toISOString()
      });

      setGroupConfig(groupId, 'lembretes', lembretes);

      // Agenda o timeout
      if (!global.lembreteTimeouts) global.lembreteTimeouts = {};
      if (!global.lembreteTimeouts[groupId]) global.lembreteTimeouts[groupId] = {};
      
      const timeout = setTimeout(async () => {
        try {
          await sock.sendMessage(groupId, {
            text: `🔔 *Lembrete:* ${mensagem}`
          });
          // Remove da lista após disparar
          const atual = getGroupConfig(groupId).lembretes || [];
          const filtrado = atual.filter(l => l.id !== novoId);
          setGroupConfig(groupId, 'lembretes', filtrado);
          delete global.lembreteTimeouts[groupId][novoId];
        } catch (err) {
          console.error('[lembrete] Falha ao enviar:', err.message);
        }
      }, duracaoMs);

      global.lembreteTimeouts[groupId][novoId] = timeout;

      return reply(`✅ Lembrete agendado para ${horarioFormatado}: "${mensagem}"`);
    }

    return reply('⚠️ Subcomando desconhecido. Use: add, list, rm, clear');
  }
};
