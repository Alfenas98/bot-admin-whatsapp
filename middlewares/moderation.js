const { getGroupConfig } = require("../lib/database");
const { isGroupAdmin } = require("../lib/permissions");
const { registrarFigurinha } = require("../lib/floodTracker");
const { registrarMensagem } = require("../lib/spamTracker");

const GROUP_LINK_REGEX = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i;
const GENERIC_LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/i;

const MEDIA_TYPE_MAP = {
  imageMessage: "imagem",
  videoMessage: "video",
  audioMessage: "audio",
  stickerMessage: "sticker",
  documentMessage: "documento",
};

async function runModeration( sock, msg, groupId, senderId, messageType, textContent ) {
  const config = getGroupConfig(groupId);
  const senderIsAdmin = await isGroupAdmin(sock, groupId, senderId);

  if (config.antifake && !senderIsAdmin) {
    const numero = senderId.split("@")[0];
    const ddiValido = config.ddiPermitidos.some((ddi) =>
      numero.startsWith(ddi)
    );
    if (!ddiValido) {
      await deleteAndWarn(
        sock,
        groupId,
        msg,
        senderId,
        "Números de fora do DDI permitido não podem enviar mensagem aqui."
      );
      return true;
    }
  }

  if (config.soAdmin && !senderIsAdmin) {
    await deleteMessage(sock, groupId, msg);
    return true;
  }

  // --- Anti-marcação em massa (aplica mesmo pra não-admin only; admins ficam isentos abaixo) ---
  if (!senderIsAdmin && config.antimarcacaomassa.ativo) {
    const mencionados =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length > config.antimarcacaomassa.limite) {
      await deleteAndWarn(
        sock,
        groupId,
        msg,
        senderId,
        `Você marcou muita gente de uma vez (limite: ${config.antimarcacaomassa.limite}).`
      );
      return true;
    }
  }

  if (senderIsAdmin) return false;

  // --- Modo jogo: durante a espera e a partida, membros só podem mandar figurinha ---
  if (config.jogos && ["aguardando", "jogando"].includes(config.jogos.estado)) {
    if (messageType !== "stickerMessage") {
      await deleteMessage(sock, groupId, msg);
      return true;
    }
  }

  const numeroRemetente = senderId.split("@")[0];
  const estaNaWhitelist = config.whitelistLinks.includes(numeroRemetente);

  if (
    !estaNaWhitelist &&
    config.antilinkhard &&
    textContent &&
    GENERIC_LINK_REGEX.test(textContent)
  ) {
    await deleteAndWarn(
      sock,
      groupId,
      msg,
      senderId,
      "Links não são permitidos neste grupo."
    );
    return true;
  }

  if (
    !estaNaWhitelist &&
    config.antilink &&
    textContent &&
    GROUP_LINK_REGEX.test(textContent)
  ) {
    await deleteAndWarn(
      sock,
      groupId,
      msg,
      senderId,
      "Links de convite de grupo não são permitidos."
    );
    return true;
  }

  if (config.antipalavrao && textContent) {
    const textoLower = textContent.toLowerCase();
    const achou = config.palavroes.some((p) =>
      textoLower.includes(p.toLowerCase())
    );
    if (achou) {
      await deleteAndWarn(
        sock,
        groupId,
        msg,
        senderId,
        "Uso de palavrão não é permitido neste grupo."
      );
      return true;
    }
  }

  if (config.antienquete && messageType === "pollCreationMessage") {
    await deleteAndWarn(
      sock,
      groupId,
      msg,
      senderId,
      "Enquetes não são permitidas neste grupo."
    );
    return true;
  }

  if (
    config.anticontato &&
    (messageType === "contactMessage" || messageType === "contactsArrayMessage")
  ) {
    await deleteAndWarn(
      sock,
      groupId,
      msg,
      senderId,
      "Envio de contatos não é permitido neste grupo."
    );
    return true;
  }

  if (
    config.limiteCaracteres.ativo &&
    textContent &&
    textContent.length > config.limiteCaracteres.limite
  ) {
    await deleteAndWarn(
      sock,
      groupId,
      msg,
      senderId,
      `Mensagem excede o limite de ${config.limiteCaracteres.limite} caracteres.`
    );
    return true;
  }

  // --- Anti-spam de mensagem repetida ---
  if (config.antispamRepetido.ativo && textContent) {
    const excedeu = registrarMensagem(
      groupId,
      senderId,
      textContent,
      config.antispamRepetido.limite
    );
    if (excedeu) {
      await deleteAndWarn(
        sock,
        groupId,
        msg,
        senderId,
        `Pare de repetir a mesma mensagem (limite: ${config.antispamRepetido.limite}x seguidas).`
      );
      return true;
    }
  }

  const mediaKey = MEDIA_TYPE_MAP[messageType];

  if (process.env.DEBUG === "true" && mediaKey) {
    console.log(
      `[debug-moderation] mediaKey=${mediaKey} | antimidia.${mediaKey}=${config.antimidia[mediaKey]} | admin=${senderIsAdmin}`
    );
  }

  if (mediaKey && config.antimidia[mediaKey]) {
    await deleteAndWarn(
      sock,
      groupId,
      msg,
      senderId,
      `Envio de ${mediaKey} está desativado neste grupo.`
    );
    return true;
  }

  if (mediaKey === "sticker" && config.antifloodFigurinha.ativo) {
    const passou = registrarFigurinha(
      groupId,
      senderId,
      config.antifloodFigurinha.limite,
      config.antifloodFigurinha.tempoSegundos
    );
    if (passou) {
      await deleteAndWarn(
        sock,
        groupId,
        msg,
        senderId,
        `Limite de ${config.antifloodFigurinha.limite} figurinhas a cada ${config.antifloodFigurinha.tempoSegundos}s excedido.`
      );
      return true;
    }
  }

  return false;
}

async function deleteMessage(sock, groupId, msg) {
  try {
    await sock.sendMessage(groupId, { delete: msg.key });
  } catch (err) {
    console.error("[moderation] Falha ao deletar mensagem:", err.message);
  }
}

async function deleteAndWarn(sock, groupId, msg, senderId, reason) {
  await deleteMessage(sock, groupId, msg);
  await sock.sendMessage(groupId, {
    text: `🚫 @${senderId.split("@")[0]} ${reason}`,
    mentions: [senderId],
  });
}

module.exports = { runModeration };