const fs = require('fs');
const { getGroupConfig, setGroupConfig } = require('./database');
const { getGameState, setGameState, removeGameState, incMetric } = require('./runtimeStore');

const TEMPO_PREPARACAO_MS = 60 * 1000;
const TEMPO_PERGUNTA_MS = 1 * 60 * 1000;
const runtimeState = new Map();

function embaralhar(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

async function iniciarJogo(sock, groupId, jogo, figurinhas) {
  const jogoEmbaralhado = { ...jogo, perguntas: embaralhar(jogo.perguntas) };

  if (jogoEmbaralhado.tipo === 'enquete') {
    return iniciarJogoEnquete(sock, groupId, jogoEmbaralhado);
  }

  setGroupConfig(groupId, 'jogos.estado', 'preparando');
  setGameState(groupId, {
    tipo: jogoEmbaralhado.tipo,
    jogoId: jogoEmbaralhado.id,
    perguntaIndex: 0,
    perguntas: jogoEmbaralhado.perguntas,
    opcoes: jogoEmbaralhado.opcoes,
    nome: jogoEmbaralhado.nome,
    etapa: 'preparando'
  });

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
  setGameState(groupId, {
    tipo: jogoEmbaralhado.tipo,
    jogoId: jogoEmbaralhado.id,
    perguntaIndex: 0,
    perguntas: jogoEmbaralhado.perguntas,
    opcoes: jogoEmbaralhado.opcoes,
    nome: jogoEmbaralhado.nome,
    etapa: 'aguardando'
  });

  await sock.sendMessage(groupId, {
    text: '⏳ A partir de agora só é permitido enviar figurinhas até o jogo acabar. O jogo começa em 1 minuto!'
  });

  const timeoutId = setTimeout(() => {
    iniciarPerguntas(sock, groupId, jogoEmbaralhado);
  }, TEMPO_PREPARACAO_MS);

  runtimeState.set(groupId, { timeoutId, perguntaIndex: 0, jogoId: jogoEmbaralhado.id });
}

async function iniciarJogoEnquete(sock, groupId, jogo) {
  setGroupConfig(groupId, 'jogos.estado', 'preparando');
  setGameState(groupId, {
    tipo: 'enquete',
    jogoId: jogo.id,
    perguntaIndex: 0,
    perguntas: jogo.perguntas,
    opcoes: jogo.opcoes,
    nome: jogo.nome,
    etapa: 'preparando'
  });

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
  if (!runtimeState.has(groupId)) return;
  setGroupConfig(groupId, 'jogos.estado', 'jogando');
  const estado = getGameState(groupId);
  if (estado) {
    estado.etapa = 'jogando';
    setGameState(groupId, estado);
  }
  await proximaPergunta(sock, groupId, jogo);
}

async function iniciarPerguntasEnquete(sock, groupId, jogo) {
  if (!runtimeState.has(groupId)) return;
  setGroupConfig(groupId, 'jogos.estado', 'jogando-enquete');
  const estado = getGameState(groupId);
  if (estado) {
    estado.etapa = 'jogando-enquete';
    setGameState(groupId, estado);
  }
  await proximaEnquete(sock, groupId, jogo);
}

async function proximaPergunta(sock, groupId, jogo) {
  const runtime = runtimeState.get(groupId);
  if (!runtime) return;

  const index = runtime.perguntaIndex;

  if (index >= jogo.perguntas.length) {
    return finalizarJogo(sock, groupId, 'todas as perguntas foram feitas 🎉');
  }

  const estado = getGameState(groupId);
  if (estado) {
    estado.perguntaIndex = index;
    setGameState(groupId, estado);
  }

  await sock.sendMessage(groupId, {
    text: `*${jogo.perguntas[index]}*\n\n_Vocês têm ${TEMPO_PERGUNTA_MS / 60000} minuto(s) pra responder com figurinha!_`
  });

  const timeoutId = setTimeout(async () => {
    const atual = runtimeState.get(groupId);
    if (!atual) return;

    await sock.sendMessage(groupId, { text: '⏰ Tempo esgotado! Próxima pergunta a seguir...' });
    atual.perguntaIndex += 1;
    runtimeState.set(groupId, atual);

    const proximoEstado = getGameState(groupId);
    if (proximoEstado) {
      proximoEstado.perguntaIndex = atual.perguntaIndex;
      setGameState(groupId, proximoEstado);
    }
    await proximaPergunta(sock, groupId, jogo);
  }, TEMPO_PERGUNTA_MS);

  runtime.timeoutId = timeoutId;
  runtimeState.set(groupId, runtime);
}

async function proximaEnquete(sock, groupId, jogo) {
  const runtime = runtimeState.get(groupId);
  if (!runtime) return;

  const index = runtime.perguntaIndex;

  if (index >= jogo.perguntas.length) {
    return finalizarJogo(sock, groupId, 'todas as enquetes foram feitas 🎉');
  }

  const estado = getGameState(groupId);
  if (estado) {
    estado.perguntaIndex = index;
    setGameState(groupId, estado);
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

    const proximoEstado = getGameState(groupId);
    if (proximoEstado) {
      proximoEstado.perguntaIndex = atual.perguntaIndex;
      setGameState(groupId, proximoEstado);
    }
    await proximaEnquete(sock, groupId, jogo);
  }, TEMPO_PERGUNTA_MS);

  runtime.timeoutId = timeoutId;
  runtimeState.set(groupId, runtime);
}

async function finalizarJogo(sock, groupId, motivo) {
  const runtime = runtimeState.get(groupId);
  if (runtime?.timeoutId) clearTimeout(runtime.timeoutId);
  runtimeState.delete(groupId);
  removeGameState(groupId);

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

function pararJogo(sock, groupId) {
  if (!runtimeState.has(groupId) && !getGameState(groupId)) return false;
  finalizarJogo(sock, groupId, 'interrompido por um admin');
  return true;
}

function jogoEmAndamento(groupId) {
  return runtimeState.has(groupId) || !!getGameState(groupId);
}

module.exports = { iniciarJogo, pararJogo, jogoEmAndamento, TEMPO_PREPARACAO_MS, TEMPO_PERGUNTA_MS };
