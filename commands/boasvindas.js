const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { storageDir } = require('../lib/storage');
const { desembrulharMensagem } = require('../lib/unwrapMessage');

const LIMITE_IMAGENS = 5; // evita acumular imagens demais sem querer

module.exports = {
  name: 'boasvindas',
  aliases: ['bv'],
  adminOnly: true,
  async execute({ sock, msg, groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'mensagem' || opcao === 'msg') {
      const novaMensagem = args.slice(1).join(' ');
      if (!novaMensagem) return reply('Uso: #boasvindas mensagem <texto>\nUse @user pra mencionar quem entrou.');
      setGroupConfig(groupId, 'boasvindas.mensagem', novaMensagem);
      return reply('✅ Mensagem de boas-vindas atualizada.');
    }

    if (opcao === 'imagem') {
      const conteudoReal = desembrulharMensagem(msg.message);
      if (!conteudoReal.imageMessage) {
        return reply('Envie a imagem com a legenda "#boasvindas imagem" (a legenda vai junto da foto).');
      }

      const imagensAtuais = config.boasvindas.imagens || [];
      if (imagensAtuais.length >= LIMITE_IMAGENS) {
        return reply(`⚠️ Limite de ${LIMITE_IMAGENS} imagens atingido. Use #boasvindas imagens limpar antes de adicionar mais.`);
      }

      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        const pastaMedia = path.join(storageDir, 'media');
        if (!fs.existsSync(pastaMedia)) fs.mkdirSync(pastaMedia, { recursive: true });

        const nomeArquivo = `boasvindas-${groupId.replace(/[^0-9]/g, '')}-${Date.now()}.jpg`;
        const caminho = path.join(pastaMedia, nomeArquivo);
        fs.writeFileSync(caminho, buffer);

        const novaLista = [...imagensAtuais, caminho];
        setGroupConfig(groupId, 'boasvindas.imagens', novaLista);
        return reply(`✅ Imagem adicionada (${novaLista.length}/${LIMITE_IMAGENS}). Todas as imagens salvas são enviadas junto quando alguém entrar.`);
      } catch (err) {
        console.error('[boasvindas] Falha ao salvar imagem:', err.message);
        return reply('⚠️ Não consegui salvar essa imagem.');
      }
    }

    if (opcao === 'imagens' && (args[1] || '').toLowerCase() === 'limpar') {
      setGroupConfig(groupId, 'boasvindas.imagens', []);
      return reply('✅ Todas as imagens de boas-vindas foram removidas. Voltou a ser só texto.');
    }

    if (opcao === 'imagens' && (args[1] || '').toLowerCase() === 'lista') {
      const total = (config.boasvindas.imagens || []).length;
      return reply(`📷 ${total} imagem(ns) salva(s) pras boas-vindas (limite: ${LIMITE_IMAGENS}).`);
    }

    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.boasvindas.ativo;
    else return reply('Uso: #boasvindas  (ou on / off / mensagem <texto> / imagem / imagens limpar / imagens lista)');

    setGroupConfig(groupId, 'boasvindas.ativo', ativo);
    return reply(`🤳 Boas-vindas ${ativo ? 'ATIVADAS ✅' : 'DESATIVADAS ❌'}`);
  }
};
