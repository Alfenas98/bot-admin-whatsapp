const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const http = require('http');
const fs = require('fs');
const path = require('path');

const { loadCommands } = require('./lib/commandLoader');
const { runModeration } = require('./middlewares/moderation');
const { getGroupConfig, setGroupConfig } = require('./lib/database');
const { salvarNome, verificarClone } = require('./lib/anticlone');
const { storageDir } = require('./lib/storage');
const { getAdminIdsCached, invalidateGroupCache } = require('./lib/groupCache');
const { desembrulharMensagem } = require('./lib/unwrapMessage');
const { consumirFigurinhaPendente } = require('./lib/pendingCapture');
const { checarAgendamentos, agoraAjustado } = require('./lib/scheduler');
const { createResilientSocket } = require('./lib/resilientSocket');
const messageCache = require('./lib/messageCache');
const { adicionarXP, registrarAtividade } = require('./lib/xp');
const { calcularInativos } = require('./lib/inactivityChecker');
const { getRankDiario } = require('./lib/dailyRank');
const { inc, get } = require('./lib/metrics');

const commands = loadCommands();

let statusConexao = 'iniciando';
let qrAtual = null;
let primeiraMensagemEnviada = false;
const adminCache = new Map();

const servidor = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.url === '/health' || req.url === '/api/health') {
    const connected = statusConexao === 'conectado';
    res.writeHead(connected ? 200 : 503);
    return res.end(JSON.stringify({ status: connected ? 'ok' : 'unavailable', connection: statusConexao }));
  }

  if (req.url === '/api/status') {
    return res.end(JSON.stringify({
      connection: statusConexao,
      qr: !!qrAtual,
      metrics: get()
    }));
  }

  res.writeHead(404);
  res.end('Not found');
});

servidor.listen(process.env.PORT || 3000, () => {
  console.log(`Painel HTTP ativo na porta ${process.env.PORT || 3000}`);
});

async function startBot() {
  const pastaAuth = path.join(storageDir, 'auth_info');

  if (process.env.RESET_SESSION === 'true' && fs.existsSync(pastaAuth)) {
    fs.rmSync(pastaAuth, { recursive: true, force: true });
    console.log('[reset] Sessão anterior apagada por causa de RESET_SESSION=true. Remova essa variável depois de conectar de novo.');
  }

  const { state, saveCreds } = await useMultiFileAuthState(pastaAuth);
  const { version } = await fetchLatestBaileysVersion();

  const usarPairingCode = !!process.env.PHONE_NUMBER && !state.creds.registered;

  const sock = createResilientSocket(makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  }));

  sockAtual = sock;

  if (usarPairingCode) {
    const numero = process.env.PHONE_NUMBER.replace(/\D/g, '');
    setTimeout(async () => {
      try {
        const codigo = await sock.requestPairingCode(numero);
        console.log('════════════════════════════════════');
        console.log(`CÓDIGO DE PAREAMENTO: ${codigo}`);
        console.log('No WhatsApp do número informado: Aparelhos conectados > Conectar com número de telefone > digite esse código.');
        console.log('════════════════════════════════════');
      } catch (err) {
        console.error('[pairing-code] Falha ao gerar código:', err.message);
      }
    }, 3000);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usarPairingCode) {
      qrAtual = qr;
      console.log('QR code disponível! Acesse a URL pública do serviço no Railway pra escanear (ou veja o ASCII abaixo).');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      statusConexao = 'iniciando';
      adminCache.clear();
      inc('connectionEvents');
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão fechada.', shouldReconnect ? 'Reconectando...' : 'Deslogado.');
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      qrAtual = null;
      statusConexao = 'conectado';
      adminCache.clear();
      inc('connectionEvents');
      console.log('✅ Bot conectado com sucesso!');
    }
  });

  // --- Mudança de nome/descrição do grupo ---
  sock.ev.on('groups.update', async (updates) => {
    for (const update of updates) {
      const groupId = update.id;
      if (!groupId) continue;

      const config = getGroupConfig(groupId);
      if (!config.alertaMudancaGrupo) continue;

      const partes = [];
      if (update.subject) partes.push(`nome mudou para: "${update.subject}"`);
      if (update.desc !== undefined) partes.push('a descrição do grupo foi alterada');

      if (partes.length > 0) {
        await sock.sendMessage(groupId, { text: `🔔 Mudança detectada no grupo: ${partes.join(', ')}` });
      }
    }
  });

  // --- Entrada / saída de membros ---
  sock.ev.on('group-participants.update', async (event) => {
    invalidateAdminCache(event.id);
    invalidateGroupCache(event.id);
    const config = getGroupConfig(event.id);

    if (event.action === 'add' && config.boasvindas.ativo) {
      for (const participantId of event.participants) {
        const texto = config.boasvindas.mensagem.replace('@user', `@${participantId.split('@')[0]}`);
        const imagens = (config.boasvindas.imagens || []).filter(caminho => fs.existsSync(caminho));

        if (imagens.length === 0) {
          await sock.sendMessage(event.id, { text: texto, mentions: [participantId] });
        } else {
          for (let i = 0; i < imagens.length; i++) {
            await sock.sendMessage(event.id, {
              image: fs.readFileSync(imagens[i]),
              caption: i === 0 ? texto : undefined,
              mentions: [participantId]
            });
          }
        }
      }
    }

    if (event.action === 'add') {
      for (const participantId of event.participants) {
        registrarEntrada(event.id, participantId);
      }
    }

    if (event.action === 'remove' && config.saida.ativo) {
      for (const participantId of event.participants) {
        const texto = config.saida.mensagem.replace('@user', `@${participantId.split('@')[0]}`);
        await sock.sendMessage(event.id, { text: texto, mentions: [participantId] });
      }
    }

    if (event.action === 'demote') {
      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      if (event.participants.includes(botId)) {
        try {
          const metadata = await sock.groupMetadata(event.id);
          if (metadata.owner) {
            await sock.sendMessage(metadata.owner, {
              text: `⚠️ Fui removido de admin no grupo "${metadata.subject}". Meus comandos de administração vão parar de funcionar até eu ser promovido de novo.`
            });
          }
        } catch (err) {
          console.error('[demote-alert] Falha ao avisar dono do grupo:', err.message);
        }
      }
    }
  });

  // --- Mensagens recebidas ---
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message) return;

    const groupId = msg.key.remoteJid;
    const isGroup = groupId?.endsWith('@g.us');
    if (!isGroup) return;

    const protocolo = msg.message.protocolMessage;
    if (protocolo && protocolo.type === 0 /* REVOKE */) {
      const config = getGroupConfig(groupId);
      if (config.x9) {
        const original = messageCache.buscar(groupId, protocolo.key.id);
        if (original) {
          await sock.sendMessage(groupId, {
            text: `👀 Mensagem apagada por @${original.senderId.split('@')[0]}:\n"${original.texto}"`,
            mentions: [original.senderId]
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
      '';

    if (process.env.DEBUG === 'true') {
      console.log('[debug] tipo bruto:', Object.keys(msg.message)[0], '| tipo desembrulhado:', messageType, '| remetente:', senderId);
    }

    messageCache.guardar(groupId, msg.key.id, textContent, senderId);

    registrarAtividade(groupId, senderId);

    const config = getGroupConfig(groupId);

    if (config.anticlone) {
      try {
        const adminIds = await getAdminIdsCached(sock, groupId);

        salvarNome(groupId, senderId, msg.pushName);

        if (!adminIds.includes(senderId)) {
          const adminClonado = verificarClone(groupId, senderId, msg.pushName, adminIds);
          if (adminClonado) {
            await sock.sendMessage(groupId, {
              text: `⚠️ Atenção: @${senderId.split('@')[0]} está usando um nome de exibição parecido com o do admin @${adminClonado.split('@')[0]}. Cuidado com golpes se essa pessoa pedir dinheiro ou dados.`,
              mentions: [senderId, adminClonado]
            });
          }
        }
      } catch (err) {
        console.error('[anticlone] Falha ao checar:', err.message);
      }
    }

    const foiRemovida = await runModeration(sock, msg, groupId, senderId, messageType, textContent);
    if (foiRemovida) return;

    if (config.levelSystem) {
      const resultado = adicionarXP(groupId, senderId, 5);
      if (resultado.subiuNivel) {
        await sock.sendMessage(groupId, {
          text: `🎉 @${senderId.split('@')[0]} subiu para o nível ${resultado.nivel}!`,
          mentions: [senderId]
        });
      }
    }

    if (config.autosticker && messageType === 'imageMessage') {
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        const webp = await sharp(buffer).resize(512, 512, { fit: 'inside' }).webp().toBuffer();
        await sock.sendMessage(groupId, { sticker: webp }, { quoted: msg });
      } catch (err) {
        console.error('[autosticker] Falha ao converter imagem:', err.message);
      }
    }

    if (config.autoresposta.ativo && textContent) {
      const resposta = config.autoresposta.gatilhos[textContent.toLowerCase().trim()];
      if (resposta) {
        await sock.sendMessage(groupId, { text: resposta }, { quoted: msg });
      }
    }

    const prefixoUsado = config.prefixos.find(p => textContent.startsWith(p));
    if (!prefixoUsado) return;

    const [rawCommand, ...args] = textContent.slice(prefixoUsado.length).trim().split(/\s+/);
    const command = commands.get((rawCommand || '').toLowerCase());
    if (!command) return;

    const reply = (text) => sock.sendMessage(groupId, { text }, { quoted: msg });

    try {
      inc('commandsExecuted');
      await command({ sock, msg, groupId, senderId, args, reply, getGroupConfig, setGroupConfig, textContent });
    } catch (err) {
      console.error(`[commands] Erro em ${rawCommand}:`, err.message);
      await reply('⚠️ Ops, algo deu errado ao executar esse comando.');
    }
  });

  // --- Inatividade ---
  setInterval(async () => {
    const agora = new Date();
    const grupos = Object.keys(getGroupConfig.__test__?.groups || {});
    for (const groupId of grupos) {
      const config = getGroupConfig(groupId);
      if (!config.inatividade.ativo) continue;

      const inativos = calcularInativos(groupId, config.inatividade.diasLimite);
      for (const id of inativos) {
        try {
          await sock.groupParticipantsUpdate(groupId, [id], 'remove');
        } catch (err) {
          console.error('[inactivity] Falha ao remover inativo:', err.message);
        }
      }
    }

    if (agora.getHours() === 9 && agora.getMinutes() === 0 && !primeiraMensagemEnviada) {
      primeiraMensagemEnviada = true;
      const ranking = getRankDiario(global?.__groupId);
    }
  }, 1000 * 60 * 60);

  // --- Scheduler ---
  setInterval(() => {
    checarAgendamentos(sock);
  }, 1000 * 30);
}

startBot().catch(console.error);
