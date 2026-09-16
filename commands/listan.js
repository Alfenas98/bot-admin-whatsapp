const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { estaBanido, adicionarBanimento, removerBanimento, listarBanidos, limparBanimentos } = require('../lib/blocklist');

module.exports = {
  name: 'listan',
  aliases: ['blocklist', 'blacklist'],
  adminOnly: true,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Uso:\n#listan add @pessoa - Adicionar à lista negra\n#listan rm @pessoa - Remover da lista negra\n#listan lista - Listar banidos\n#listan clear - Limpar todos');
    }

    const subcomando = args[0].toLowerCase();

    // Listar todos os banidos
    if (subcomando === 'lista' || subcomando === 'list' || subcomando === 'ver') {
      const banidos = listarBanidos(groupId);
      if (banidos.length === 0) {
        return await sock.sendMessage(groupId, {
          text: '📋 A lista negra está vazia.',
        }, { quoted: msg });

      }

      // Tenta resolver nomes dos banidos
      const lista = await Promise.all(banidos.map(async (id) => {
        const numero = id.split('@')[0];
        let nome = '@' + numero;
        try {
          const metadata = await sock.groupMetadata(groupId);
          const participante = metadata.participants?.find(p => p.id === id);
          if (participante?.profile) {
            nome = participante.profile;
          }
        } catch (e) {}
        return `${nome} (${numero})`;
      }));

      return await sock.sendMessage(groupId, {
        text: `🚫 *Lista Negra*\n${lista.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
      }, { quoted: msg });
    }

    // Limpar todos os banimentos
    if (subcomando === 'clear' || subcomando === 'limpar') {
      limparBanimentos(groupId);
      return await sock.sendMessage(groupId, {
        text: '🗑️ Lista negra limpa com sucesso.',
      }, { quoted: msg });
    }

    // Adicionar à lista negra
    if (subcomando === 'add' || subcomando === 'banir') {
      if (args.length < 2) {
        return reply('⚠️ Uso: #listan add @pessoa');
      }

      const numero = args[1].replace(/[^0-9]/g, '');
      const alvo = numero + '@s.whatsapp.net';

      // Não permite banir admins do bot
      if (!msg.key.participant) return;

      if (estaBanido(groupId, alvo)) {
        return reply('⚠️ Esta pessoa já está na lista negra.');
      }

      adicionarBanimento(groupId, alvo);

      // Tenta resolver o nome
      let nomeExibicao = '@' + numero;
      try {
        const metadata = await sock.groupMetadata(groupId);
        const participante = metadata.participants?.find(p => p.id === alvo);
        if (participante?.profile) {
          nomeExibicao = participante.profile;
        }
      } catch (e) {}

      await sock.sendMessage(groupId, {
        text: `🚫 ${nomeExibicao} foi adicionado à lista negra. Ele(a) não poderá mais acessar este grupo.`,
        mentions: [alvo]
      }, { quoted: msg });

      return;
    }

    // Remover da lista negra
    if (subcomando === 'rm' || subcomando === 'remover') {
      if (args.length < 2) {
        return reply('⚠️ Uso: #listan rm @pessoa');
      }

      const numero = args[1].replace(/[^0-9]/g, '');
      const alvo = numero + '@s.whatsapp.net';

      if (!estaBanido(groupId, alvo)) {
        return reply('⚠️ Esta pessoa não está na lista negra.');
      }

      removerBanimento(groupId, alvo);

      // Tenta resolver o nome
      let nomeExibicao = '@' + numero;
      try {
        const metadata = await sock.groupMetadata(groupId);
        const participante = metadata.participants?.find(p => p.id === alvo);
        if (participante?.profile) {
          nomeExibicao = participante.profile;
        }
      } catch (e) {}

      await sock.sendMessage(groupId, {
        text: `✅ ${nomeExibicao} foi removido(a) da lista negra. Ele(a) pode acessar o grupo novamente.`,
        mentions: [alvo]
      }, { quoted: msg });

      return;
    }

    return reply('⚠️ Subcomando desconhecido. Use: add, rm, lista, clear');
  }
};
