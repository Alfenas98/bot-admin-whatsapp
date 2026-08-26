const fs = require('fs');
const path = require('path');
const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { storageDir } = require('../lib/storage');
const { finalizarColeta } = require('../lib/pendingCapture');
const { listaJogos } = require('../lib/gamesList');

module.exports = {
  name: 'salvar',
  aliases: ['salvarfigurinhas'],
  adminOnly: true,
  async execute({ groupId, senderId, args, reply }) {
    const sub = (args[0] || '').toLowerCase();
    if (sub !== 'figurinhas') {
      return reply('Uso: #salvar figurinhas (depois de usar "#jogos addfigurinha <número>" e mandar as figurinhas).');
    }

    const coleta = finalizarColeta(groupId, senderId);
    if (!coleta) {
      return reply('Nenhuma coleta de figurinhas em andamento. Use "#jogos addfigurinha <número>" primeiro.');
    }

    if (coleta.buffers.length === 0) {
      return reply('Você não mandou nenhuma figurinha ainda. Manda as figurinhas antes de usar "#salvar figurinhas".');
    }

    const jogo = listaJogos.find(j => j.id === coleta.jogoId);
    const nomeJogo = jogo ? jogo.nome : coleta.jogoId;

    try {
      const pastaFigurinhas = path.join(storageDir, 'media', 'jogos');
      if (!fs.existsSync(pastaFigurinhas)) fs.mkdirSync(pastaFigurinhas, { recursive: true });

      const novosCaminhos = coleta.buffers.map((buffer, i) => {
        const nomeArquivo = `figurinha-${coleta.jogoId}-${groupId.replace(/[^0-9]/g, '')}-${Date.now()}-${i}.webp`;
        const caminho = path.join(pastaFigurinhas, nomeArquivo);
        fs.writeFileSync(caminho, buffer);
        return caminho;
      });

      const config = getGroupConfig(groupId);
      const figurinhasAtuais = config.jogos.figurinhas[coleta.jogoId] || [];
      const novaLista = [...figurinhasAtuais, ...novosCaminhos];
      setGroupConfig(groupId, `jogos.figurinhas.${coleta.jogoId}`, novaLista);

      return reply(
        `✅ ${novosCaminhos.length} figurinha(s) salva(s) no jogo "${nomeJogo}" ` +
        `(${novaLista.length} no total).`
      );
    } catch (err) {
      console.error('[salvar figurinhas] Falha ao salvar:', err.message);
      return reply('⚠️ Deu erro ao salvar as figurinhas. Tenta de novo.');
    }
  }
};