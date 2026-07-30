const fs = require("fs");
const { getGroupConfig, setGroupConfig } = require("./database");

const TEMPO_PREPARACAO_MS = 60 * 1000; // 1 minuto antes de começar
const TEMPO_PERGUNTA_MS = 2 * 60 * 1000; // 2 minutos por pergunta

// Estado em memória (timers não podem ser salvos em disco). Chave: groupId
const runtimeState = new Map();

async function iniciarJogo(sock, groupId, jogo, figurinhas) {
  setGroupConfig(groupId, "jogos.estado", "preparando");

  // 1. Fecha o chat: só admins podem mandar mensagem enquanto prepara o jogo
  try {
    await sock.groupSettingUpdate(groupId, "announcement");
  } catch (err) {
    console.error("[jogos] Falha ao fechar o grupo:", err.message);
  }

  await sock.sendMessage(groupId, {
    text: `🎮 *${jogo.nome}*\n\n${jogo.instrucoes}\n\nSalvem as figurinhas abaixo, vocês vão precisar delas!`,
  });

  // 2. Envia as figurinhas do jogo pra todo mundo salvar
  for (const caminhoFigurinha of figurinhas) {
    try {
      if (fs.existsSync(caminhoFigurinha)) {
        await sock.sendMessage(groupId, {
          sticker: fs.readFileSync(caminhoFigurinha),
        });
      }
    } catch (err) {
      console.error("[jogos] Falha ao enviar figurinha:", err.message);
    }
  }

  // 3. Reabre o grupo (a moderação vai restringir os membros só a figurinhas
  // enquanto o estado for "aguardando" ou "jogando")
  try {
    await sock.groupSettingUpdate(groupId, "not_announcement");
  } catch (err) {
    console.error("[jogos] Falha ao reabrir o grupo:", err.message);
  }

  setGroupConfig(groupId, "jogos.estado", "aguardando");

  await sock.sendMessage(groupId, {
    text: "⏳ A partir de agora só é permitido enviar figurinhas até o jogo acabar. O jogo começa em 1 minuto!",
  });

  const timeoutId = setTimeout(() => {
    iniciarPerguntas(sock, groupId, jogo);
  }, TEMPO_PREPARACAO_MS);

  runtimeState.set(groupId, { timeoutId, perguntaIndex: 0, jogoId: jogo.id });
}

async function iniciarPerguntas(sock, groupId, jogo) {
  if (!runtimeState.has(groupId)) return; // pode ter sido parado durante a espera
  setGroupConfig(groupId, "jogos.estado", "jogando");
  await proximaPergunta(sock, groupId, jogo);
}

async function proximaPergunta(sock, groupId, jogo) {
  const runtime = runtimeState.get(groupId);
  if (!runtime) return; // jogo foi parado

  const index = runtime.perguntaIndex;

  if (index >= jogo.perguntas.length) {
    return finalizarJogo(sock, groupId, "todas as perguntas foram feitas 🎉");
  }

  await sock.sendMessage(groupId, {
    text: `*${jogo.perguntas[index]}*\n\n_Vocês têm 2 minutos pra responder com figurinha!_`,
  });

  const timeoutId = setTimeout(async () => {
    const atual = runtimeState.get(groupId);
    if (!atual) return; // parado nesse meio tempo

    await sock.sendMessage(groupId, {
      text: "⏰ Tempo esgotado! Próxima pergunta a seguir...",
    });
    atual.perguntaIndex += 1;
    runtimeState.set(groupId, atual);
    await proximaPergunta(sock, groupId, jogo);
  }, TEMPO_PERGUNTA_MS);

  runtime.timeoutId = timeoutId;
  runtimeState.set(groupId, runtime);
}

async function finalizarJogo(sock, groupId, motivo) {
  const runtime = runtimeState.get(groupId);
  if (runtime?.timeoutId) clearTimeout(runtime.timeoutId);
  runtimeState.delete(groupId);

  setGroupConfig(groupId, "jogos.estado", "idle");
  setGroupConfig(groupId, "jogos.jogoAtual", null);

  try {
    await sock.groupSettingUpdate(groupId, "not_announcement");
  } catch (err) {
    console.error("[jogos] Falha ao reabrir o grupo no final:", err.message);
  }

  await sock.sendMessage(groupId, {
    text: `🏁 Jogo encerrado: ${motivo}. Chat liberado normalmente pra todo mundo!`,
  });
}

/** * Interrompe um jogo em andamento manualmente (via #pararjogo). * Retorna true se havia um jogo rodando, false se não havia nada pra parar. */
function pararJogo(sock, groupId) {
  if (!runtimeState.has(groupId)) return false;
  finalizarJogo(sock, groupId, "interrompido por um admin");
  return true;
}

function jogoEmAndamento(groupId) {
  return runtimeState.has(groupId);
}

module.exports = {
  iniciarJogo,
  pararJogo,
  jogoEmAndamento,
  TEMPO_PREPARACAO_MS,
  TEMPO_PERGUNTA_MS,
};