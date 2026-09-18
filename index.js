const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const sharp = require('sharp');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const http = require('http');
const fs = require('fs');
const path = require('path');

const { loadCommands } = require('./lib/commandLoader');
const { runModeration } = require('./middlewares/moderation');
const { getGroupConfig, setGroupConfig } = require('./lib/database');
const { salvarNome, verificarClone } = require('./lib/anticlone');
const { storageDir } = require('./lib/storage');
const { getAdminIdsCached, isGroupAdminCached, invalidateGroupCache } = require('./lib/groupCache');
const { desembrulharMensagem } = require('./lib/unwrapMessage');
const { temColetaAtiva, adicionarFigurinhaColeta } = require('./lib/pendingCapture');
const { checarAgendamentos, agoraAjustado } = require('./lib/scheduler');
const { carregarTimeouts } = require('./lib/timeoutMute');
const { estaBanido, removerBanimento } = require('./lib/blocklist');
const { createResilientSocket } = require('./lib/resilientSocket');
const messageCache = require('./lib/messageCache');
const { adicionarXP } = require('./lib/xp');
const { registrarAtividade, registrarEntrada } = require('./lib/activity');
const { calcularInativos } = require('./lib/inactivityChecker');
const { getRankDiario } = require('./lib/dailyRank');
const { salvarMidia, listarMidiasSalvas } = require('./lib/mediaSave');
const { inc, get } = require('./lib/metrics');
const { checkRateLimit, enqueue, scheduleExecution } = require('./lib/rateLimiter');
const { pesquisar } = require('./lib/ai');

const commands = loadCommands();

let statusConexao = 'iniciando';
let qrAtual = null;
let primeiraMensagemEnviada = false;
let sockAtual = null;
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

  if (req.url === '/qr') {
    if (statusConexao === 'conectado') {
      res.writeHead(200);
      return res.end('<h2>✅ Bot já está conectado. Não há QR pra mostrar.</h2>');
    }

    if (!qrAtual) {
      res.writeHead(200, { Refresh: '3' });
      return res.end('<h2>⏳ Gerando QR code... essa página atualiza sozinha.</h2>');
    }

    try {
      const imagemDataUrl = await QRCode.toDataURL(qrAtual, { width: 320, margin: 1 });
      res.writeHead(200, { Refresh: '5' });
      return res.end(`
        <html>
          <head><meta charset="utf-8"><title>Conectar WhatsApp</title></head>
          <body style="font-family: sans-serif; text-align: center; padding-top: 40px;">
            <h2>Escaneie com o WhatsApp</h2>
            <p>Aparelhos conectados &gt; Conectar um aparelho</p>
            <img src="${imagemDataUrl}" alt="QR code" />
            <p style="color: #888;">Essa página atualiza sozinha a cada 5s — sempre mostra o QR mais atual, nunca escaneie um print antigo.</p>
          </body>
        </html>
      `);
    } catch (err) {
      res.writeHead(500);
      return res.end('Erro ao gerar QR: ' + err.message);
    }
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

  // --- Carrega mutes temporários pendentes ---
  carregarTimeouts(sock).catch(err => {
    console.error('[timeoutMute] Erro ao carregar timeouts:', err.message);
  });

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
        
        // Registrar no histórico de membros
        try {
          const config = getGroupConfig(event.id);
          const membros = [...(config.membros || [])];
          membros.push({
            timestamp: Date.now(),
            acao: 'add',
            membroId: participantId,
            nome: participantId.split('@')[0]
          });
          // Limitar a 500 registros
          if (membros.length > 500) membros.shift();
          setGroupConfig(event.id, 'membros', membros);
        } catch (e) {}
        
        // Verifica se o usuário está na lista negra
        if (estaBanido(event.id, participantId)) {
          try {
            await sock.groupParticipantsUpdate(event.id, [participantId], 'remove');
            await sock.sendMessage(event.id, {
              text: `🚫 @${participantId.split('@')[0]} está na lista negra e foi removido automaticamente.`,
              mentions: [participantId]
            });
            console.log(`[blocklist] ${participantId} foi banido de ${event.id} por estar na lista negra.`);
          } catch (err) {
            console.error('[blocklist] Falha ao remover usuário banido:', err.message);
          }
        }
      }
    }

    if (event.action === 'remove' && config.saida.ativo) {
      for (const participantId of event.participants) {
        const texto = config.saida.mensagem.replace('@user', `@${participantId.split('@')[0]}`);
        await sock.sendMessage(event.id, { text: texto, mentions: [participantId] });
      }
    }

    // Registrar saída no histórico
    if (event.action === 'remove') {
      for (const participantId of event.participants) {
        try {
          const config = getGroupConfig(event.id);
          const membros = [...(config.membros || [])];
          membros.push({
            timestamp: Date.now(),
            acao: 'remove',
            membroId: participantId,
            nome: participantId.split('@')[0]
          });
          if (membros.length > 500) membros.shift();
          setGroupConfig(event.id, 'membros', membros);
        } catch (e) {}
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

    // Verificar se é resposta a uma mensagem do bot (auto-chat)
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    if (contextInfo?.quotedMessage) {
      const quotedSender = contextInfo.participant;
      const botId = sock.user?.id?.split(':')[0];
      
      // Se o usuário respondeu uma mensagem do bot
      if (quotedSender?.startsWith(botId)) {
        const configIA = getGroupConfig(groupId);
        if (configIA.autoIA && textContent && !textContent.startsWith('#')) {
          try {
            const { chatWithMemory } = require('./lib/ai');
            const userName = msg.pushName || 'Usuário';
            
            await sock.sendMessage(groupId, { text: '🤔 Pensando...' }, { quoted: msg });
            
            const resposta = await chatWithMemory(senderId, userName, textContent);
            if (resposta) {
              await sock.sendMessage(groupId, { text: `🤖 ${resposta}` }, { quoted: msg });
            } else {
              await sock.sendMessage(groupId, { text: '⚠️ A IA não conseguiu responder. Tente novamente.' }, { quoted: msg });
            }
          } catch (e) {
            console.error('[auto-ia-reply] Erro:', e.message);
          }
        }
      }
    }

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

    const configMute = getGroupConfig(groupId);
    // Normaliza para comparação: pega apenas números
    const senderNumero = senderId.replace(/[^0-9]/g, '');
    const mutedList = configMute.muted || [];
    const estaMutado = mutedList.some(mutedId => mutedId.includes(senderNumero));
    if (estaMutado) {
      try {
        await sock.sendMessage(groupId, { delete: msg.key });
      } catch (err) {
        console.error('[mute] Falha ao deletar:', err.message);
      }
      return;
    }

    // Coleta participantes para sorteio ativo
    const sorteioConfig = getGroupConfig(groupId);
    if (sorteioConfig.sorteioAtivo && !msg.key.fromMe) {
      const participantes = sorteioConfig.sorteioParticipantes || [];
      if (!participantes.includes(senderId)) {
        participantes.push(senderId);
        setGroupConfig(groupId, 'sorteioParticipantes', participantes);
      }
    }

    if (config.levelSystem) {
      const resultado = adicionarXP(groupId, senderId, 5);
      if (resultado.subiuNivel) {
        await sock.sendMessage(groupId, {
          text: `🎉 @${senderId.split('@')[0]} subiu para o nível ${resultado.nivel}!`,
          mentions: [senderId]
        });
      }
    }

    if (messageType === 'stickerMessage' && temColetaAtiva(groupId, senderId)) {
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        const quantidade = adicionarFigurinhaColeta(groupId, senderId, buffer);
        if (quantidade !== null) {
          await sock.sendMessage(groupId, {
            text: `📥 Figurinha guardada (${quantidade} até agora). Manda mais ou "#salvar figurinhas" pra concluir.`
          }, { quoted: msg });
          return;
        }
      } catch (err) {
        console.error('[jogos] Falha ao guardar figurinha da coleta:', err.message);
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

    // Salvar mídia automaticamente
    const configMidia = getGroupConfig(groupId);
    if (configMidia.midiasSalvas.ativo) {
      try {
        const caminho = await salvarMidia(msg, storageDir);
        if (caminho) {
          console.log(`[midia-salva] Arquivo salvo: ${caminho}`);
        }
      } catch (err) {
        console.error('[midia-salva] Erro:', err.message);
      }
    }

    // Auto-responder da IA (se ativado)
    const configIA = getGroupConfig(groupId);
    
    if (configIA.autoIA && textContent && !textContent.startsWith('#')) {
      try {
        const { chatWithMemory, autoResponder } = require('./lib/ai');
        
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const temMencao = mentionedJid.length > 0;
        const temBot = /\bbot\b/.test(textContent.toLowerCase());
        
        // Verificar se é resposta a mensagem do bot (múltiplas formas)
        let respondeuAoBot = false;
        
        // Método 1: contextInfo.participant
        if (contextInfo?.quotedMessage) {
          const quotedSender = contextInfo.participant || contextInfo.remoteJid;
          const botJid = sock.user?.id || '';
          const botNumber = botJid.split(':')[0].split('@')[0];
          
          console.log(`[auto-ia] quotedSender: ${quotedSender}, botNumber: ${botNumber}`);
          
          if (quotedSender?.includes(botNumber)) {
            respondeuAoBot = true;
          }
        }
        
        // Método 2: msg.key.fromMe na mensagem respondida
        if (!respondeuAoBot && contextInfo?.quotedMessage) {
          const quotedFromMe = contextInfo.quotedMessage.conversation || 
                               contextInfo.quotedMessage.extendedTextMessage?.text;
          const botNumbers = sock.user?.id?.split(':')[0]?.split('@') || [];
          if (botNumbers.some(n => contextInfo.participant?.includes(n))) {
            respondeuAoBot = true;
          }
        }
        
        console.log(`[auto-ia] textContent: "${textContent?.slice(0, 50)}", temMencao: ${temMencao}, temBot: ${temBot}, respondeuAoBot: ${respondeuAoBot}`);
        
        if (temMencao || temBot || respondeuAoBot) {
          const userName = msg.pushName || 'Usuário';
          
          // Enviar mensagem de pensando
          await sock.sendMessage(groupId, { text: '🤔 Pensando...' }, { quoted: msg });
          
          // Se respondeu ao bot, usar chatWithMemory para continuar conversa
          let resposta;
          if (respondeuAoBot) {
            resposta = await chatWithMemory(senderId, userName, textContent);
          } else {
            resposta = await autoResponder(userName, textContent);
          }
          
          if (resposta && resposta !== 'SKIP') {
            await sock.sendMessage(groupId, { text: `🤖 ${resposta}` }, { quoted: msg });
          }
        }
      } catch (e) {
        console.error('[auto-ia] Erro:', e.message);
      }
    }

    const prefixoUsado = config.prefixos.find(p => textContent.startsWith(p));
    if (!prefixoUsado) return;

    const [rawCommand, ...args] = textContent.slice(prefixoUsado.length).trim().split(/\s+/);
    const command = commands.get((rawCommand || '').toLowerCase());
    if (!command) return;

    const reply = async (text) => {
      try {
        await sock.sendMessage(groupId, { text }, { quoted: msg });
      } catch (err) {
        console.error('[reply] Falha ao enviar resposta:', err.message);
        throw err;
      }
    };

    try {
      // Verificar rate limit
      const rateLimitResult = checkRateLimit(senderId, command.name);
      if (!rateLimitResult.allowed) {
        // Se está em cooldown, adicionar à fila e mencionar
        if (rateLimitResult.reason === 'cooldown') {
          const position = enqueue(senderId, {
            commandName: command.name,
            command,
            msg,
            groupId,
            senderId,
            args,
            getGroupConfig,
            setGroupConfig,
            textContent
          });
          
          // Mencionar usuário sobre a fila
          await sock.sendMessage(groupId, {
            text: `⏳ @${senderId.split('@')[0]} você está em *cooldown*!\n\n📋 Comando adicionado à fila. Posição: *${position}*\n⏱️ Será executado automaticamente em *${rateLimitResult.remaining}s*`,
            mentions: [senderId]
          });
          
          // Agendar execução automática
          scheduleExecution(senderId, {
            commandName: command.name,
            command,
            msg,
            groupId,
            senderId,
            args,
            getGroupConfig,
            setGroupConfig,
            textContent
          }, sock, reply);
          
          return;
        }
        
        return reply(rateLimitResult.message);
      }

      if (command.adminOnly || config.apenasAdminUsaComandos) {
        const ehAdmin = await isGroupAdminCached(sock, groupId, senderId);
        if (!ehAdmin) {
          return reply('🔒 Esse comando só pode ser usado por administradores do grupo.');
        }
      }

      inc('commandsExecuted');
      await command.execute({ sock, msg, groupId, senderId, args, reply, getGroupConfig, setGroupConfig, textContent });
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
