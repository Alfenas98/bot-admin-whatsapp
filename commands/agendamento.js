const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { DIAS_SEMANA, nomeDia } = require('../lib/scheduler');

function parseDias(texto) {
  if (!texto || texto.toLowerCase() === 'todos') return [];
  return texto
    .toLowerCase()
    .split(',')
    .map(d => DIAS_SEMANA[d.trim()])
    .filter(n => n !== undefined);
}

function validarHorario(horario) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(horario || '');
}

function descreverItem(item, indice) {
  const dias = item.diasSemana && item.diasSemana.length > 0
    ? item.diasSemana.map(nomeDia).join(',')
    : 'todos os dias';

  if (item.tipo === 'lembrete') {
    return `${indice + 1}. [lembrete] ${item.data} às ${item.horario} — "${item.texto}"`;
  }
  if (item.tipo === 'mensagem') {
    return `${indice + 1}. [mensagem] ${item.horario} (${dias}) — "${item.texto}"`;
  }
  if (item.tipo === 'sorteio') {
    return `${indice + 1}. [sorteio] ${item.horario} (${dias}) — prêmio: "${item.premio}", ${item.duracaoSegundos}s`;
  }
  return `${indice + 1}. [${item.tipo}] ${item.horario} (${dias})`;
}

module.exports = {
  name: 'agendamento',
  aliases: ['agendamentos'],
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const acao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    const lista = config.agendamentos || [];

    if (acao === 'listar') {
      if (lista.length === 0) return reply('Nenhum agendamento configurado nesse grupo ainda.');
      return reply(lista.map(descreverItem).join('\n'));
    }

    if (acao === 'remover') {
      const indice = parseInt(args[1], 10);
      if (!indice || indice < 1 || indice > lista.length) return reply('Uso: #agendamento remover <número> (veja o número com "listar")');
      const nova = lista.filter((_, i) => i !== indice - 1);
      setGroupConfig(groupId, 'agendamentos', nova);
      return reply(`✅ Agendamento removido (${nova.length} restante(s)).`);
    }

    if (acao === 'mensagem') {
      const horario = args[1];
      const dias = args[2];
      const texto = args.slice(3).join(' ');
      if (!validarHorario(horario) || !texto) {
        return reply('Uso: #agendamento mensagem <HH:MM> <dias|todos> <texto>\nEx: #agendamento mensagem 08:00 seg,qua,sex Bom dia, pessoal!');
      }
      const novo = { tipo: 'mensagem', horario, diasSemana: parseDias(dias), texto };
      setGroupConfig(groupId, 'agendamentos', [...lista, novo]);
      return reply(`✅ Mensagem agendada pra ${horario} (${dias}).`);
    }

    if (acao === 'backup') {
      const horario = args[1];
      const dias = args[2];
      if (!validarHorario(horario)) {
        return reply('Uso: #agendamento backup <HH:MM> <dias|todos>\nEx: #agendamento backup 03:00 todos');
      }
      const novo = { tipo: 'backup', horario, diasSemana: parseDias(dias) };
      setGroupConfig(groupId, 'agendamentos', [...lista, novo]);
      return reply(`✅ Backup automático agendado pra ${horario} (${dias || 'todos os dias'}).`);
    }

    if (acao === 'resumo' || acao === 'resumodiario') {
      const horario = args[1];
      const dias = args[2];
      if (!validarHorario(horario)) {
        return reply(`Uso: #agendamento ${acao} <HH:MM> <dias|todos>\nEx: #agendamento ${acao} 20:00 todos`);
      }
      const novo = { tipo: acao, horario, diasSemana: parseDias(dias) };
      setGroupConfig(groupId, 'agendamentos', [...lista, novo]);
      const rotulo = acao === 'resumo' ? 'Resumo automático (top 10 geral)' : 'Ranking diário automático';
      return reply(`✅ ${rotulo} agendado pra ${horario} (${dias || 'todos os dias'}).`);
    }

    if (acao === 'sorteio') {
      const horario = args[1];
      const dias = args[2];
      const segundos = parseInt(args[3], 10);
      const premio = args.slice(4).join(' ');
      if (!validarHorario(horario) || !segundos || !premio) {
        return reply('Uso: #agendamento sorteio <HH:MM> <dias|todos> <segundos> <prêmio>\nEx: #agendamento sorteio 19:00 sex 60 Vale-presente');
      }
      const novo = { tipo: 'sorteio', horario, diasSemana: parseDias(dias), duracaoSegundos: segundos, premio };
      setGroupConfig(groupId, 'agendamentos', [...lista, novo]);
      return reply(`✅ Sorteio automático agendado pra ${horario} (${dias || 'todos os dias'}).`);
    }

    if (acao === 'lembrete') {
      // #agendamento lembrete <MM-DD ou YYYY-MM-DD> <HH:MM> <texto>
      const data = args[1];
      const horario = args[2];
      const texto = args.slice(3).join(' ');
      const dataValida = /^(\d{4}-)?\d{2}-\d{2}$/.test(data || '');

      if (!dataValida || !validarHorario(horario) || !texto) {
        return reply(
          'Uso: #agendamento lembrete <data> <HH:MM> <texto>\n' +
          'Data no formato MM-DD (repete todo ano, ex: aniversário) ou YYYY-MM-DD (dispara uma vez só).\n' +
          'Ex: #agendamento lembrete 12-25 09:00 Feliz Natal, pessoal!'
        );
      }

      const novo = { tipo: 'lembrete', data, horario, texto };
      setGroupConfig(groupId, 'agendamentos', [...lista, novo]);
      return reply(`✅ Lembrete agendado pra ${data} às ${horario}.`);
    }

    return reply(
      `Uso:\n` +
      `#agendamento mensagem <HH:MM> <dias|todos> <texto>\n` +
      `#agendamento backup <HH:MM> <dias|todos>\n` +
      `#agendamento resumo <HH:MM> <dias|todos> (top 10 geral)\n` +
      `#agendamento resumodiario <HH:MM> <dias|todos> (ranking só do dia)\n` +
      `#agendamento sorteio <HH:MM> <dias|todos> <segundos> <prêmio>\n` +
      `#agendamento lembrete <MM-DD ou YYYY-MM-DD> <HH:MM> <texto>\n` +
      `#agendamento listar\n` +
      `#agendamento remover <número>\n\n` +
      `Dias: dom,seg,ter,qua,qui,sex,sab (separados por vírgula) ou "todos"`
    );
  }
};
