const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { listaJogos } = require('../lib/gamesList');
const { iniciarColeta } = require('../lib/pendingCapture');

module.exports = {
  name: 'jogos',
  adminOnly: true,
  async execute({ sock, msg, groupId, senderId, args, reply }) {
    const sub = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    // --- #jogos addfigurinha <número> ---
    // Figurinha não aceita legenda no WhatsApp, então funciona em 3 passos:
    // 1) manda esse comando de texto, 2) manda quantas figurinhas quiser,
    // 3) manda "#salvar figurinhas" pra gravar tudo de uma vez
    if (sub === 'addfigurinha') {
      const numero = parseInt(args[1], 10);
      const jogo = listaJogos[numero - 1];
      if (!jogo) return reply('Uso: #jogos addfigurinha <número>');

      if (jogo.tipo === 'enquete') {
        return reply(`O jogo "${jogo.nome}" usa enquete nativa do WhatsApp, não precisa de figurinha.`);
      }

      iniciarColeta(groupId, senderId, jogo.id);
      return reply(
        `📌 Beleza! Agora manda quantas figurinhas quiser pro jogo "${jogo.nome}" ` +
        `(uma por vez, sem legenda). Quando terminar, manda "#salvar figurinhas" pra salvar tudo de uma vez. ` +
        `Você tem 10 minutos.`
      );
    }

    // --- #jogos figurinhas limpar <número> ---
    if (sub === 'figurinhas' && (args[1] || '').toLowerCase() === 'limpar') {
      const numero = parseInt(args[2], 10);
      const jogo = listaJogos[numero - 1];
      if (!jogo) return reply('Uso: #jogos figurinhas limpar <número>');
      setGroupConfig(groupId, `jogos.figurinhas.${jogo.id}`, []);
      return reply(`✅ Figurinhas do jogo "${jogo.nome}" removidas.`);
    }

    // --- #jogos perguntas add <número> <texto> ---
    if (sub === 'perguntas' && (args[1] || '').toLowerCase() === 'add') {
      const numero = parseInt(args[2], 10);
      const jogo = listaJogos[numero - 1];
      const texto = args.slice(3).join(' ');
      if (!jogo || !texto) return reply('Uso: #jogos perguntas add <número> <texto da pergunta>');

      const listaAtual = config.jogos.perguntasCustom[jogo.id] || [];
      const nova = [...listaAtual, texto];
      setGroupConfig(groupId, `jogos.perguntasCustom.${jogo.id}`, nova);

      return reply(
        `✅ Pergunta adicionada (${nova.length} pergunta(s) personalizada(s) pra "${jogo.nome}").\n` +
        `A partir de agora esse jogo usa a lista personalizada em vez das perguntas padrão.`
      );
    }

    // --- #jogos perguntas listar <número> ---
    if (sub === 'perguntas' && (args[1] || '').toLowerCase() === 'listar') {
      const numero = parseInt(args[2], 10);
      const jogo = listaJogos[numero - 1];
      if (!jogo) return reply('Uso: #jogos perguntas listar <número>');

      const custom = config.jogos.perguntasCustom[jogo.id] || [];
      const usando = custom.length > 0 ? custom : jogo.perguntas;
      const origem = custom.length > 0 ? 'personalizada' : 'padrão do jogo';

      const texto = usando.map((p, i) => `${i + 1}. ${p}`).join('\n');
      return reply(`📋 Perguntas de "${jogo.nome}" (lista ${origem}):\n${texto}`);
    }

    // --- #jogos perguntas remover <número> <índice> ---
    if (sub === 'perguntas' && (args[1] || '').toLowerCase() === 'remover') {
      const numero = parseInt(args[2], 10);
      const indice = parseInt(args[3], 10);
      const jogo = listaJogos[numero - 1];
      if (!jogo || !indice) return reply('Uso: #jogos perguntas remover <número> <índice> (veja o índice com "perguntas listar")');

      const listaAtual = config.jogos.perguntasCustom[jogo.id] || [];
      if (indice < 1 || indice > listaAtual.length) return reply('Índice inválido.');

      const nova = listaAtual.filter((_, i) => i !== indice - 1);
      setGroupConfig(groupId, `jogos.perguntasCustom.${jogo.id}`, nova);
      return reply(`✅ Pergunta removida (${nova.length} restante(s) na lista personalizada).`);
    }

    // --- #jogos perguntas limpar <número> ---
    if (sub === 'perguntas' && (args[1] || '').toLowerCase() === 'limpar') {
      const numero = parseInt(args[2], 10);
      const jogo = listaJogos[numero - 1];
      if (!jogo) return reply('Uso: #jogos perguntas limpar <número>');
      setGroupConfig(groupId, `jogos.perguntasCustom.${jogo.id}`, []);
      return reply(`✅ Lista personalizada apagada. "${jogo.nome}" volta a usar as perguntas padrão.`);
    }

    // --- #jogos (sem argumento) -> lista os jogos disponíveis ---
    const texto = listaJogos.map((j, i) => `${i + 1}. ${j.nome}${j.tipo === 'enquete' ? ' (enquete nativa, sem figurinha)' : ''}`).join('\n');
    return reply(
      `🎮 *Jogos disponíveis:*\n${texto}\n\n` +
      `#jogo <número> — começa o jogo\n` +
      `#jogos addfigurinha <número> — depois manda as figurinhas e finalize com #salvar figurinhas\n` +
      `#jogos figurinhas limpar <número>\n` +
      `#jogos perguntas add <número> <texto>\n` +
      `#jogos perguntas listar <número>\n` +
      `#jogos perguntas remover <número> <índice>\n` +
      `#jogos perguntas limpar <número> (volta pra lista padrão)`
    );
  }
};
