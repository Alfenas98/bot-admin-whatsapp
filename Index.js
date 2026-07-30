const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const http = require("http");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const { loadCommands } = require("./lib/commandLoader");
const { runModeration } = require("./middlewares/moderation");
const { getGroupConfig, setGroupConfig, db } = require("./lib/database");
const { isGroupAdmin } = require("./lib/permissions");
const { adicionarXP } = require("./lib/xp");
const { registrarAtividade, registrarEntrada } = require("./lib/activity");
const { calcularInativos } = require("./lib/inactivityChecker");
const { salvarNome, verificarClone } = require("./lib/anticlone");
const { storageDir } = require("./lib/storage");
const { desembrulharMensagem } = require("./lib/unwrapMessage");
const { consumirFigurinhaPendente } = require("./lib/pendingCapture");
const messageCache = require("./lib/messageCache");

const commands = loadCommands();

let sockAtual = null;
let qrAtual = null;
let statusConexao = "iniciando";

// Servidor web simples só pra mostrar o QR code como imagem — evita ter que
// ler QR em texto/ASCII direto do log do Railway, que fica ilegível.
const servidor = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (statusConexao === "conectado") {
    res.end(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>✅ Bot conectado com sucesso!</h2>
        <p>Não precisa mais dessa página.</p>
      </body></html>
    `);
    return;
  }

  if (!qrAtual) {
    res.end(`
      <html><head><meta http-equiv="refresh" content="5"></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>⏳ Aguardando QR code...</h2>
        <p>Essa página atualiza sozinha a cada 5 segundos.</p>
      </body></html>
    `);
    return;
  }

  try {
    const qrImagemBase64 = await QRCode.toDataURL(qrAtual, { width: 320 });
    res.end(`
      <html><head><meta http-equiv="refresh" content="15"></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>📱 Escaneie pra conectar o bot</h2>
        <img src="${qrImagemBase64}" alt="QR code" />
        <p>WhatsApp → Aparelhos conectados → Conectar um aparelho</p>
        <p style="color:#888;font-size:13px">Essa página atualiza sozinha a cada 15s (o QR expira e é renovado automaticamente).</p>
      </body></html>
    `);
  } catch (err) {
    res.end("Erro ao gerar o QR code: " + err.message);
  }
});

servidor.listen(process.env.PORT || 3000, () => {
  console.log(
    `[web] Página do QR code disponível na porta ${process.env.PORT || 3000}`
  );
});

async function startBot() {
  const pastaAuth = path.join(storageDir, "auth_info");

  // Permite limpar uma sessão travada/inválida sem precisar acessar o
  // volume manualmente: defina RESET_SESSION=true no Railway, reinicie,
  // e depois REMOVA essa variável (senão ele limpa de novo a cada boot).
  if (process.env.RESET_SESSION === "true" && fs.existsSync(pastaAuth)) {
    fs.rmSync(pastaAuth, { recursive: true, force: true });
    console.log(
      "[reset] Sessão anterior apagada por causa de RESET_SESSION=true. Remova essa variável depois de conectar de novo."
    );
  }

  const { state, saveCreds } = await useMultiFileAuthState(pastaAuth);
  const { version } = await fetchLatestBaileysVersion();

  // Se PHONE_NUMBER estiver definido (ex: variável de ambiente no Railway),
  // usamos pairing code em vez de QR — não precisa de terminal interativo
  // pra escanear nada, só digitar um código de 8 dígitos no celular.
  const usarPairingCode = !!process.env.PHONE_NUMBER && !state.creds.registered;

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  sockAtual = sock;

  if (usarPairingCode) {
    const numero = process.env.PHONE_NUMBER.replace(/\D/g, "");
    setTimeout(async () => {
      try {
        const codigo = await sock.requestPairingCode(numero);
        console.log("════════════════════════════════════");
        console.log(`CÓDIGO DE PAREAMENTO: ${codigo}`);
        console.log(
          "No WhatsApp do número informado: Aparelhos conectados > Conectar com número de telefone > digite esse código."
        );
        console.log("════════════════════════════════════");
      } catch (err) {
        console.error("[pairing-code] Falha ao gerar código:", err.message);
      }
    }, 3000);
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usarPairingCode) {
      qrAtual = qr;
      console.log(
        "QR code disponível! Acesse a URL pública do serviço no Railway pra escanear (ou veja o ASCII abaixo)."
      );
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      statusConexao = "iniciando";
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "Conexão fechada.",
        shouldReconnect ? "Reconectando..." : "Deslogado."
      );
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      qrAtual = null;
      statusConexao = "conectado";
      console.log("✅ Bot conectado com sucesso!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // --- Entrada / saída de membros ---
  sock.ev.on("group-participants.update", async (event) => {
    const config = getGroupConfig(event.id);

    if (event.action === "add" && config.boasvindas.ativo) {
      for (const participantId of event.participants) {
        const texto = config.boasvindas.mensagem.replace(
          "@user",
          `@${participantId.split("@")[0]}`
        );
        const imagens = (config.boasvindas.imagens || []).filter((caminho) =>
          fs.existsSync(caminho)
        );

        if (imagens.length === 0) {
          await sock.sendMessage(event.id, {
            text: texto,
            mentions: [participantId],
          });
        } else {
          // primeira imagem leva a legenda com o texto; as demais seguem sem legenda
          for (let i = 0; i < imagens.length; i++) {
            await sock.sendMessage(event.id, {
              image: fs.readFileSync(imagens[i]),
              caption: i === 0 ? texto : undefined,
              mentions: [participantId],
            });
          }
        }
      }
    }

    if (event.action === "add") {
      for (const participantId of event.participants) {
        registrarEntrada(event.id, participantId);
      }
    }

    if (event.action === "remove" && config.saida.ativo) {
      for (const participantId of event.participants) {
        const texto = config.saida.mensagem.replace(
          "@user",
          `@${participantId.split("@")[0]}`
        );
        await sock.sendMessage(event.id, {
          text: texto,
          mentions: [participantId],
        });
      }
    }

    // Avisa o dono do grupo (no privado) se o próprio bot for rebaixado
    if (event.action === "demote") {
      const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
      if (event.participants.includes(botId)) {
        try {
          const metadata = await sock.groupMetadata(event.id);
          if (metadata.owner) {
            await sock.sendMessage(metadata.owner, {
              text: `⚠️ Fui removido de admin no grupo "${metadata.subject}". Meus comandos de administração vão parar de funcionar até eu ser promovido de novo.`,
            });
          }
        } catch (err) {
          console.error(
            "[demote-alert] Falha ao avisar dono do grupo:",
            err.message
          );
        }
      }
    }
  });

  // --- Mensagens recebidas ---
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg.message) return;

    const groupId = msg.key.remoteJid;
    const isGroup = groupId?.endsWith("@g.us");
    if (!isGroup) return; // bot é focado em grupos

    // --- x9: detecta mensagem apagada (revoke) ---
    const protocolo = msg.message.protocolMessage;
    if (protocolo && protocolo.type === 0 /* REVOKE */) {
      const config = getGroupConfig(groupId);
      if (config.x9) {
        const original = messageCache.buscar(groupId, protocolo.key.id);
        if (original) {
          await sock.sendMessage(groupId, {
            text: `👀 Mensagem apagada por @${
              original.senderId.split("@")[0]
            }:\n"${original.texto}"`,
            mentions: [original.senderId],
          });
        }
      }
      return;
    }

    if (msg.key.fromMe) return;

    const senderId = msg.key.participant || msg.key.remoteJid;
    const conteudoReal = desembrulharMensagem(msg.message);
    const messageType = Object.keys(conteudoReal)[0];
    const textContent =
      conteudoReal.conversation ||
      conteudoReal.extendedTextMessage?.text ||
      conteudoReal.imageMessage?.caption ||
      "";

    if (process.env.DEBUG === "true") {
      console.log(
        "[debug] tipo bruto:",
        Object.keys(msg.message)[0],
        "| tipo desembrulhado:",
        messageType,
        "| remetente:",
        senderId
      );
    }

    // guarda no cache pro x9 conseguir mostrar depois se for apagada
    messageCache.guardar(groupId, msg.key.id, textContent, senderId);
    registrarAtividade(groupId, senderId);

    // --- Captura de figurinha pendente (configuração do modo jogo) ---
    // Figurinha não aceita legenda no WhatsApp, então o comando de texto
    // "#jogos addfigurinha" marca uma espera, e a próxima figurinha
    // enviada por essa mesma pessoa é capturada aqui.
    if (messageType === "stickerMessage") {
      const jogoIdPendente = consumirFigurinhaPendente(groupId, senderId);
      if (jogoIdPendente) {
        try {
          const buffer = await downloadMediaMessage(msg, "buffer", {});
          const pastaMedia = path.join(storageDir, "media");
          if (!fs.existsSync(pastaMedia))
            fs.mkdirSync(pastaMedia, { recursive: true });

          const nomeArquivo = `jogo-${jogoIdPendente}-${groupId.replace(
            /[^0-9]/g,
            ""
          )}-${Date.now()}.webp`;
          const caminho = path.join(pastaMedia, nomeArquivo);
          fs.writeFileSync(caminho, buffer);

          const configAtual = getGroupConfig(groupId);
          const listaAtual = configAtual.jogos.figurinhas[jogoIdPendente] || [];
          const nova = [...listaAtual, caminho];
          setGroupConfig(groupId, `jogos.figurinhas.${jogoIdPendente}`, nova);

          await sock.sendMessage(
            groupId,
            { text: `✅ Figurinha adicionada (${nova.length} no total).` },
            { quoted: msg }
          );
        } catch (err) {
          console.error("[jogos] Falha ao salvar figurinha:", err.message);
          await sock.sendMessage(groupId, {
            text: "⚠️ Não consegui salvar essa figurinha.",
          });
        }
        return; // não processa mais essa mensagem (não é comando nem precisa de moderação)
      }
    }

    const config = getGroupConfig(groupId);

    // --- Anti-clone: nome de exibição parecido com o de um admin ---
    if (config.anticlone) {
      try {
        const metadata = await sock.groupMetadata(groupId);
        const adminIds = metadata.participants
          .filter((p) => ["admin", "superadmin"].includes(p.admin))
          .map((p) => p.id);

        salvarNome(groupId, senderId, msg.pushName);

        if (!adminIds.includes(senderId)) {
          const adminClonado = verificarClone(
            groupId,
            senderId,
            msg.pushName,
            adminIds
          );
          if (adminClonado) {
            await sock.sendMessage(groupId, {
              text: `⚠️ Atenção: @${
                senderId.split("@")[0]
              } está usando um nome de exibição parecido com o do admin @${
                adminClonado.split("@")[0]
              }. Cuidado com golpes se essa pessoa pedir dinheiro ou dados.`,
              mentions: [senderId, adminClonado],
            });
          }
        }
      } catch (err) {
        console.error("[anticlone] Falha ao checar:", err.message);
      }
    }

    // 1. Moderação automática primeiro (anti-link, anti-mídia, etc)
    const foiRemovida = await runModeration(
      sock,
      msg,
      groupId,
      senderId,
      messageType,
      textContent
    );
    if (foiRemovida) return;

    // 2. XP por mensagem (sistema de level)
    if (config.levelSystem) {
      const resultado = adicionarXP(groupId, senderId, 5);
      if (resultado.subiuNivel) {
        await sock.sendMessage(groupId, {
          text: `🎉 @${senderId.split("@")[0]} subiu para o nível ${
            resultado.nivel
          }!`,
          mentions: [senderId],
        });
      }
    }

    // 3. Auto-sticker (converte imagem recebida em figurinha)
    if (config.autosticker && messageType === "imageMessage") {
      try {
        const buffer = await downloadMediaMessage(msg, "buffer", {});
        const webp = await sharp(buffer)
          .resize(512, 512, { fit: "inside" })
          .webp()
          .toBuffer();
        await sock.sendMessage(groupId, { sticker: webp }, { quoted: msg });
      } catch (err) {
        console.error("[autosticker] Falha ao converter imagem:", err.message);
      }
    }

    // 4. Auto-resposta por palavra-chave
    if (config.autoresposta.ativo && textContent) {
      const resposta =
        config.autoresposta.gatilhos[textContent.toLowerCase().trim()];
      if (resposta) {
        await sock.sendMessage(groupId, { text: resposta }, { quoted: msg });
      }
    }

    // 5. Roteamento de comandos (aceita qualquer prefixo configurado)
    const prefixoUsado = config.prefixos.find((p) => textContent.startsWith(p));
    if (!prefixoUsado) return;

    const [rawCommand, ...args] = textContent
      .slice(prefixoUsado.length)
      .trim()
      .split(/\s+/);
    const command = commands.get((rawCommand || "").toLowerCase());
    if (!command) return;

    const reply = (text) =>
      sock.sendMessage(groupId, { text }, { quoted: msg });

    // Trava global: se ativada, TODO comando exige admin, mesmo os que
    // normalmente são abertos (#menu, #level, #top10, etc)
    const exigeAdmin = command.adminOnly || config.apenasAdminUsaComandos;

    if (exigeAdmin) {
      const senderIsAdmin = await isGroupAdmin(sock, groupId, senderId);
      if (!senderIsAdmin) {
        return reply(
          "❌ Apenas admins do grupo podem usar comandos deste bot."
        );
      }
    }

    try {
      await command.execute({ sock, msg, groupId, senderId, args, reply });
    } catch (err) {
      console.error(`[comando:${command.name}] Erro:`, err);
      await reply("⚠️ Ocorreu um erro ao executar esse comando.");
    }
  });
}

/** * Roda a checagem de inatividade em todos os grupos que têm a função * ativada, removendo automaticamente quem passou do limite de dias. */
async function verificarInatividadeEmTodosGrupos(sock) {
  const grupos = db.get("groups").value() || {};

  for (const groupId of Object.keys(grupos)) {
    const config = grupos[groupId];
    if (!config.inatividade?.ativo) continue;

    try {
      const metadata = await sock.groupMetadata(groupId);
      const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";

      const { inativos } = calcularInativos(
        groupId,
        metadata.participants,
        botId,
        config.inatividade.diasLimite
      );

      if (inativos.length === 0) continue;

      await sock.groupParticipantsUpdate(groupId, inativos, "remove");
      await sock.sendMessage(groupId, {
        text: `🧹 Removi automaticamente ${inativos.length} membro(s) inativo(s) há mais de ${config.inatividade.diasLimite} dias.`,
      });
    } catch (err) {
      console.error(
        `[inatividade] Falha ao checar grupo ${groupId}:`,
        err.message
      );
    }
  }
}

const UM_DIA_MS = 24 * 60 * 60 * 1000;

startBot();

// Primeira checagem 2 minutos depois de subir (dá tempo da conexão estabilizar),
// depois repete a cada 24h.
setTimeout(() => {
  if (sockAtual) verificarInatividadeEmTodosGrupos(sockAtual);
  setInterval(() => {
    if (sockAtual) verificarInatividadeEmTodosGrupos(sockAtual);
  }, UM_DIA_MS);
}, 2 * 60 * 1000);