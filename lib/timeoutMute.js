const { db, getGroupConfig, setGroupConfig } = require('./database');
const { storageDir } = require('./storage');
const path = require('path');
const fs = require('fs');

// Estado em memória: Map<groupId> -> Map<numero, { timeout, expiresAt }>
const timeoutsAtivos = new Map();

// Arquivo de persistência
const caminhoTimeouts = path.join(storageDir, 'database', 'muteTimeouts.json');

try {
  if (fs.existsSync(caminhoTimeouts)) {
    const raw = JSON.parse(fs.readFileSync(caminhoTimeouts, 'utf-8'));
    for (const [grupo, mutes] of Object.entries(raw)) {
      const map = new Map();
      for (const [numero, info] of Object.entries(mutes)) {
        // Se o timeout já expirou, pula (não reativa)
        if (info.expiresAt && Date.now() < info.expiresAt) {
          map.set(numero, info);
        }
      }
      if (map.size > 0) timeoutsAtivos.set(grupo, map);
    }
  }
} catch (err) {
  console.error('[timeoutMute] Erro ao carregar timeouts:', err.message);
}

function salvarTimeouts() {
  const obj = {};
  for (const [grupo, mutes] of timeoutsAtivos) {
    obj[grupo] = {};
    for (const [numero, info] of mutes) {
      // Não salva o timeout (é um objeto Timer)
      obj[grupo][numero] = { expiresAt: info.expiresAt, duracaoMs: info.duracaoMs };
    }
  }
  try {
    fs.writeFileSync(caminhoTimeouts, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[timeoutMute] Erro ao salvar timeouts:', err.message);
  }
}

function parseDuracao(texto) {
  if (!texto || texto.toLowerCase() === 'perm') return null;

  // Formatos suportados: 10m, 2h, 1d, 30s
  const match = texto.match(/^(\d+)\s*([smhd])$/i);
  if (!match) throw new Error('Formato inválido. Use números seguidos de: s(seg), m(min), h(hora), d(dia). Ex: 10m, 2h, 30s, 1d');

  const valor = parseInt(match[1], 10);
  const unidade = match[2].toLowerCase();
  const multiplicadores = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 86400 * 1000 };
  return valor * multiplicadores[unidade];
}

function formatarDuracao(ms) {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`;
  return `${Math.floor(ms / 86400000)}d`;
}

async function aplicarMuteTemporario(sock, groupId, alvo, duracaoMs) {
  const config = getGroupConfig(groupId);
  const muted = config.muted || [];

  // Garante que o alvo está na lista
  if (!muted.includes(alvo)) {
    muted.push(alvo);
    setGroupConfig(groupId, 'muted', muted);
  }

  const expiresAt = Date.now() + duracaoMs;

  if (!timeoutsAtivos.has(groupId)) timeoutsAtivos.set(groupId, new Map());
  timeoutsAtivos.get(groupId).set(alvo, { expiresAt, duracaoMs });

  salvarTimeouts();

  const timeout = setTimeout(async () => {
    // Desmuta automaticamente
    try {
      await desmutarAutomatico(sock, groupId, alvo);
      const numero = alvo.split('@')[0];
      // Tenta resolver o nome
      let nome = '@' + numero;
      try {
        const metadata = await sock.groupMetadata(groupId);
        const participante = metadata.participants?.find(p => p.id === alvo);
        if (participante?.profile) nome = participante.profile;
      } catch (e) {}
      
      if (nome === '@' + numero) {
        try {
          const info = await sock.onWhatsApp(alvo);
          if (info && info.name) nome = info.name;
        } catch (e) {}
      }

      await sock.sendMessage(groupId, {
        text: `🔊 ${nome} teve o mute temporário expirado e foi desmutado automaticamente.`,
        mentions: [alvo]
      });
    } catch (err) {
      console.error('[timeoutMute] Falha ao desmutar após timeout:', err.message);
    }
  }, duracaoMs);

  // Guarda referência do timer para eventual cancelamento
  const entry = timeoutsAtivos.get(groupId).get(alvo);
  if (entry) entry.timeout = timeout;
}

async function desmutarAutomatico(sock, groupId, alvo) {
  const config = getGroupConfig(groupId);
  let muted = config.muted || [];
  muted = muted.filter(id => id !== alvo);
  setGroupConfig(groupId, 'muted', muted);

  if (timeoutsAtivos.has(groupId)) {
    timeoutsAtivos.get(groupId).delete(alvo);
    salvarTimeouts();
  }
}

function limparTimeout(groupId, alvo) {
  if (timeoutsAtivos.has(groupId)) {
    const entry = timeoutsAtivos.get(groupId).get(alvo);
    if (entry?.timeout) clearTimeout(entry.timeout);
    timeoutsAtivos.get(groupId).delete(alvo);
    salvarTimeouts();
  }
}

async function carregarTimeouts(sock) {
  for (const [groupId, mutes] of timeoutsAtivos) {
    for (const [alvo, info] of mutes) {
      const restante = info.expiresAt - Date.now();
      if (restante <= 0) {
        await desmutarAutomatico(sock, groupId, alvo);
        continue;
      }
      const timeout = setTimeout(async () => {
        try {
          await desmutarAutomatico(sock, groupId, alvo);
          const numero = alvo.split('@')[0];
          let nome = '@' + numero;
          try {
            const metadata = await sock.groupMetadata(groupId);
            const participante = metadata.participants?.find(p => p.id === alvo);
            if (participante?.profile) nome = participante.profile;
          } catch (e) {}
          
          if (nome === '@' + numero) {
            try {
              const info = await sock.onWhatsApp(alvo);
              if (info && info.name) nome = info.name;
            } catch (e) {}
          }

          await sock.sendMessage(groupId, {
            text: `🔊 ${nome} teve o mute temporário expirado e foi desmutado automaticamente.`,
            mentions: [alvo]
          });
        } catch (err) {
          console.error('[timeoutMute] Falha ao desmutar após timeout:', err.message);
        }
      }, restante);
      info.timeout = timeout;
    }
  }
}

module.exports = {
  parseDuracao,
  formatarDuracao,
  aplicarMuteTemporario,
  desmutarAutomatico,
  limparTimeout,
  carregarTimeouts
};
