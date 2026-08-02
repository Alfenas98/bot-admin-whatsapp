const fs = require('fs');
const { getGroupConfig, setGroupConfig } = require('./database');

const TEMPO_PREPARACAO_MS = 60 * 1000; // 1 minuto antes de começar
const TEMPO_PERGUNTA_MS = 1 * 60 * 1000; // 1 minuto por pergunta/enquete

// Estado em memória (timers não podem ser salvos em disco). Chave: groupId
const runtimeState = new Map();

/**
 * Embaralha um array sem alterar o original (Fisher-Yates).
 */
function embaralhar(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Inicia um jogo. Jogos do tipo "enquete" usam o sistema nativo de enquete
 * do WhatsApp (sem precisar de figurinha nem fechar o chat). Os demais
 * seguem o fluxo original: fecha o chat, manda as figurinhas, reabre
 * restringindo a só figurinha, espera 1 min e começa.
 */
async function iniciarJogo(sock, groupId, jogo, figurinhas) {
  const jogoEmbaralhado = { ...jogo, perguntas: embaralhar(jogo.perguntas) };

  if (jogoEmbaralhado.tipo === 'enquete') {
    return iniciarJogoEnquete(sock, groupId, jogoEmbaralhado);
  }

  setGroupConfig(groupId, 'jogos.estado', 'preparando');

  try {
    await sock.groupSettingUpdate(groupId, 'announcement');
  } catch (err) {
    console.error('[jogos] Falha ao fechar o grupo:', err.message);
  }

  await sock.sendMessage(groupId, {
    text: `🎮 *${jogoEmbaralhado.nome}*\n\n${jogoEmbaralhado.instrucoes}\n\nSalvem as figurinhas abaixo, vocês vão precisar delas!`
  });

  for (const caminhoFigurinha of figurinhas) {
    try {
      if (fs.existsSync(caminhoFigurinha)) {
        await sock.sendMessage(groupId, { sticker: fs.readFileSync(caminhoFigurinha) });
      }
    } catch (err) {
      console.error('[jogos] Falha ao enviar figurinha:', err.message);
    }
  }

  try {
    await sock.groupSettingUpdate(groupId, 'not_announcement');
  } catch (err) {
    console.error('[jogos] Falha ao reabrir o grupo:', err.message);
  }

  setGroupConfig(groupId, 'jogos.estado', 'aguardando');

  await sock.sendMessage(groupId, {
    text: '⏳ A partir de agora só é permitido enviar figurinhas até o jogo acabar. O jogo começa em 1 minuto!'
  });

  const timeoutId = setTimeout(() => {
    iniciarPerguntas(sock, groupId, jogoEmbaralhado);
  }, TEMPO_PREPARACAO_MS);

  runtimeState.set(groupId, { timeoutId, perguntaIndex: 0, jogoId: jogoEmbaralhado.id });
}

/**
 * Fluxo pra jogos do tipo "enquete": não precisa de figurinha, mas o chat
 * continua fechado (só admin fala) durante o jogo — membros só votam nas
 * enquetes, que funcionam independente do chat estar fechado.
 */
async function iniciarJogoEnquete(sock, groupId, jogo) {
  setGroupConfig(groupId, 'jogos.estado', 'preparando');

  try {
    await sock.groupSettingUpdate(groupId, 'announcement');
  } catch (err) {
    console.error('[jogos] Falha ao fechar o grupo:', err.message);
  }

  await sock.sendMessage(groupId, {
    text: `🎮 *${jogo.nome}*\n\n${jogo.instrucoes}`
  });

  await sock.sendMessage(groupId, {
    text: '📊 O jogo começa em 1 minuto! Fiquem de olho nas enquetes que o bot vai mandar — só é preciso votar, não precisa falar no chat.'
  });

  const timeoutId = setTimeout(() => {
    iniciarPerguntasEnquete(sock, groupId, jogo);
  }, TEMPO_PREPARACAO_MS);

  runtimeState.set(groupId, { timeoutId, perguntaIndex: 0, jogoId: jogo.id });
}

async function iniciarPerguntas(sock, groupId, jogo) {
  if (!runtimeState.has(groupId)) return; // pode ter sido parado durante a espera
  setGroupConfig(groupId, 'jogos.estado', 'jogando');
  await proximaPergunta(sock, groupId, jogo);
}

async function iniciarPerguntasEnquete(sock, groupId, jogo) {
  if (!runtimeState.has(groupId)) return;
  setGroupConfig(groupId, 'jogos.estado', 'jogando-enquete');
  await proximaEnquete(sock, groupId, jogo);
}

async function proximaPergunta(sock, groupId, jogo) {
  const runtime = runtimeState.get(groupId);
  if (!runtime) return; // jogo foi parado

  const index = runtime.perguntaIndex;

  if (index >= jogo.perguntas.length) {
    return finalizarJogo(sock, groupId, 'todas as perguntas foram feitas 🎉');
  }

  await sock.sendMessage(groupId, {
    text: `*${jogo.perguntas[index]}*\n\n_Vocês têm ${TEMPO_PERGUNTA_MS / 60000} minuto(s) pra responder com figurinha!_`
  });

  const timeoutId = setTimeout(async () => {
    const atual = runtimeState.get(groupId);
    if (!atual) return; // parado nesse meio tempo

    await sock.sendMessage(groupId, { text: '⏰ Tempo esgotado! Próxima pergunta a seguir...' });
    atual.perguntaIndex += 1;
    runtimeState.set(groupId, atual);
    await proximaPergunta(sock, groupId, jogo);
  }, TEMPO_PERGUNTA_MS);

  runtime.timeoutId = timeoutId;
  runtimeState.set(groupId, runtime);
}

async function proximaEnquete(sock, groupId, jogo) {
  const runtime = runtimeState.get(groupId);
  if (!runtime) return; // jogo foi parado

  const index = runtime.perguntaIndex;

  if (index >= jogo.perguntas.length) {
    return finalizarJogo(sock, groupId, 'todas as enquetes foram feitas 🎉');
  }

  try {
    await sock.sendMessage(groupId, {
      poll: {
        name: jogo.perguntas[index],
        values: jogo.opcoes || ['Concordo', 'Discordo'],
        selectableCount: 1
      }
    });
  } catch (err) {
    console.error('[jogos] Falha ao enviar enquete:', err.message);
  }

  const timeoutId = setTimeout(async () => {
    const atual = runtimeState.get(groupId);
    if (!atual) return;

    await sock.sendMessage(groupId, { text: '⏰ Próxima enquete a seguir...' });
    atual.perguntaIndex += 1;
    runtimeState.set(groupId, atual);
    await proximaEnquete(sock, groupId, jogo);
  }, TEMPO_PERGUNTA_MS);

  runtime.timeoutId = timeoutId;
  runtimeState.set(groupId, runtime);
}

async function finalizarJogo(sock, groupId, motivo) {
  const runtime = runtimeState.get(groupId);
  if (runtime?.timeoutId) clearTimeout(runtime.timeoutId);
  runtimeState.delete(groupId);

  setGroupConfig(groupId, 'jogos.estado', 'idle');
  setGroupConfig(groupId, 'jogos.jogoAtual', null);

  try {
    await sock.groupSettingUpdate(groupId, 'not_announcement');
  } catch (err) {
    console.error('[jogos] Falha ao reabrir o grupo no final:', err.message);
  }

  await sock.sendMessage(groupId, {
    text: `🏁 Jogo encerrado: ${motivo}. Chat liberado normalmente pra todo mundo!`
  });
}

/**
 * Interrompe um jogo em andamento manualmente (via #pararjogo).
 * Retorna true se havia um jogo rodando, false se não havia nada pra parar.
 */
function pararJogo(sock, groupId) {
  if (!runtimeState.has(groupId)) return false;
  finalizarJogo(sock, groupId, 'interrompido por um admin');
  return true;
}

function jogoEmAndamento(groupId) {
  return runtimeState.has(groupId);
}

module.exports = { iniciarJogo, pararJogo, jogoEmAndamento, TEMPO_PREPARACAO_MS, TEMPO_PERGUNTA_MS };
