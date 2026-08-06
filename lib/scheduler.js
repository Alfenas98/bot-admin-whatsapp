const fs = require('fs');
const path = require('path');
const { db, setGroupConfig } = require('./database');
const { storageDir } = require('./storage');
const { setSchedulerJobState, removeSchedulerJobState } = require('./runtimeStore');

const DIAS_SEMANA = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };

function nomeDia(numero) {
  return Object.keys(DIAS_SEMANA).find(k => DIAS_SEMANA[k] === numero);
}

/**
 * "Agora" ajustado por um offset de fuso horário (em horas), configurável
 * via TIMEZONE_OFFSET_HOURS, já que o servidor do Railway pode não estar
 * no horário de Brasília por padrão. Ex: TIMEZONE_OFFSET_HOURS=-3
 */
function agoraAjustado() {
  const offsetHoras = parseInt(process.env.TIMEZONE_OFFSET_HOURS || '0', 10);
  const agora = new Date();
  agora.setHours(agora.getHours() + offsetHoras);
  return agora;
}

function formatarHorario(data) {
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

function formatarDataCurta(data) {
  return `${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function formatarDataCompleta(data) {
  return `${data.getFullYear()}-${formatarDataCurta(data)}`;
}

/**
 * Roda a checagem de agendamentos em todos os grupos. Pensado pra ser
 * chamado 1x por minuto. Aceita "agora" customizado, útil pra testes.
 */
async function checarAgendamentos(sock, agora = agoraAjustado()) {
  const horarioAtual = formatarHorario(agora);
  const diaSemanaAtual = agora.getDay();
  const chaveMinuto = `${formatarDataCompleta(agora)}T${horarioAtual}`;
  const dataCurtaAtual = formatarDataCurta(agora);
  const dataCompletaAtual = formatarDataCompleta(agora);

  const grupos = db.get('groups').value() || {};

  for (const groupId of Object.keys(grupos)) {
    const config = grupos[groupId];
    const agendamentos = config.agendamentos || [];
    if (agendamentos.length === 0) continue;

    let mudou = false;
    const restantes = [];

    for (const item of agendamentos) {
      if (item.horario !== horarioAtual) {
        restantes.push(item);
        continue;
      }
      if (item.ultimoDisparo === chaveMinuto) {
        restantes.push(item);
        continue; // já disparou nesse minuto exato
      }

      let dispara = false;

      if (item.tipo === 'lembrete') {
        const ehAnual = item.data.length === 5; // "MM-DD"
        dispara = ehAnual ? item.data === dataCurtaAtual : item.data === dataCompletaAtual;
      } else {
        dispara = !item.diasSemana || item.diasSemana.length === 0 || item.diasSemana.includes(diaSemanaAtual);
      }

      if (!dispara) {
        restantes.push(item);
        continue;
      }

      try {
        await executarAgendamento(sock, groupId, item);
      } catch (err) {
        console.error(`[scheduler] Falha ao executar agendamento (${item.tipo}) no grupo ${groupId}:`, err.message);
      }

      mudou = true;

      // lembrete de data única (não anual) é removido depois de disparar
      if (item.tipo === 'lembrete' && item.data.length > 5) {
        continue;
      }

      restantes.push({ ...item, ultimoDisparo: chaveMinuto });
    }

    if (mudou) setGroupConfig(groupId, 'agendamentos', restantes);

    const jobState = getGroupConfig(groupId).agendamentoRuntime;
    const proximoMinuto = `${formatarDataCompleta(agora)}T${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    setGroupConfig(groupId, 'agendamentoRuntime', { checadoEm: proximoMinuto });
  }
}

async function executarAgendamento(sock, groupId, item) {
  setSchedulerJobState(groupId, {
    tipo: item.tipo,
    horario: item.horario,
    ultimoDisparo: `${formatarDataCompleta(new Date())}T${formatarHorario(new Date())}`
  });

  try {
    switch (item.tipo) {
      case 'mensagem':
      case 'lembrete':
        await sock.sendMessage(groupId, { text: item.texto });
        break;

      case 'backup': {
        const dbPath = path.join(storageDir, 'database', 'db.json');
        if (fs.existsSync(dbPath)) {
          await sock.sendMessage(groupId, {
            document: fs.readFileSync(dbPath),
            fileName: `backup-auto-${Date.now()}.json`,
            mimetype: 'application/json',
            caption: '💾 Backup automático agendado.'
          });
        }
        break;
      }

      case 'resumo': {
        const usuarios = db.get(['users', groupId]).value() || {};
        const lista = Object.entries(usuarios)
          .filter(([, dados]) => dados.mensagens > 0)
          .sort((a, b) => (b[1].nivel || 1) - (a[1].nivel || 1) || (b[1].xp || 0) - (a[1].xp || 0))
          .slice(0, 10);

        if (lista.length === 0) {
          await sock.sendMessage(groupId, { text: '📊 Resumo automático: ainda não há dados suficientes pro ranking.' });
        } else {
          const texto = lista.map(([id, dados], i) => `${i + 1}. @${id.split('@')[0]} — nível ${dados.nivel || 1} (${dados.mensagens} msgs)`).join('\n');
          await sock.sendMessage(groupId, {
            text: `📊 *Resumo automático do grupo*\n${texto}`,
            mentions: lista.map(([id]) => id)
          });
        }
        break;
      }

      case 'resumodiario': {
        const { getRankDiario } = require('./dailyRank');
        const lista = getRankDiario(groupId);

        if (lista.length === 0) {
          await sock.sendMessage(groupId, { text: '📅 Ranking de hoje: ninguém mandou mensagem ainda.' });
        } else {
          const texto = lista.map(([id, dados], i) => `${i + 1}. @${id.split('@')[0]} — ${dados.diario.mensagens} mensagem(ns) hoje`).join('\n');
          await sock.sendMessage(groupId, {
            text: `📅 *Ranking do dia*\n${texto}`,
            mentions: lista.map(([id]) => id)
          });
        }
        break;
      }

      case 'sorteio': {
        const participantes = new Set();
        const coletor = ({ messages, type }) => {
          if (type !== 'notify') return;
          const msg = messages[0];
          if (!msg.message || msg.key.fromMe) return;
          if (msg.key.remoteJid !== groupId) return;
          participantes.add(msg.key.participant || msg.key.remoteJid);
        };

        sock.ev.on('messages.upsert', coletor);
        await sock.sendMessage(groupId, {
          text: `🎁 *SORTEIO AUTOMÁTICO!*\nPrêmio: ${item.premio}\nMande qualquer mensagem nos próximos ${item.duracaoSegundos}s pra participar!`
        });

        setTimeout(async () => {
          sock.ev.off('messages.upsert', coletor);
          const lista = [...participantes];
          if (lista.length === 0) {
            await sock.sendMessage(groupId, { text: '😕 Ninguém participou do sorteio automático a tempo.' });
            return;
          }
          const vencedor = lista[Math.floor(Math.random() * lista.length)];
          await sock.sendMessage(groupId, {
            text: `🎉 Vencedor(a) do sorteio automático de "${item.premio}": @${vencedor.split('@')[0]}!`,
            mentions: [vencedor]
          });
        }, item.duracaoSegundos * 1000);
        break;
      }

      default:
        console.warn(`[scheduler] Tipo de agendamento desconhecido: ${item.tipo}`);
    }
  } catch (err) {
    removeSchedulerJobState(groupId);
    throw err;
  }
}

module.exports = { checarAgendamentos, DIAS_SEMANA, nomeDia, agoraAjustado };
