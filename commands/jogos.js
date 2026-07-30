const fs = require("fs");
const path = require("path");
const { getGroupConfig, setGroupConfig } = require("../lib/database");
const { listaJogos } = require("../lib/gamesList");
const { iniciarJogo, jogoEmAndamento } = require("../lib/gameRuntime");
const { aguardarFigurinha } = require("../lib/pendingCapture");

module.exports = {
  name: "jogos",
  adminOnly: true,
  async execute({ sock, msg, groupId, senderId, args, reply }) {
    const sub = (args[0] || "").toLowerCase();
    const config = getGroupConfig(groupId);

    // --- #jogos addfigurinha <número> ---
    // Figurinha não aceita legenda no WhatsApp, então funciona em 2 passos:
    // 1) manda esse comando de texto, 2) manda a figurinha logo em seguida
    if (sub === "addfigurinha") {
      const numero = parseInt(args[1], 10);
      const jogo = listaJogos[numero - 1];
      if (!jogo) return reply("Uso: #jogos addfigurinha <número>");

      aguardarFigurinha(groupId, senderId, jogo.id);
      return reply(
        `📌 Beleza! Agora manda a figurinha que você quer adicionar ao jogo "${jogo.nome}" ` +
          `(só a figurinha, sozinha, sem precisar de legenda). Você tem 2 minutos.`
      );
    }

    // --- #jogos figurinhas limpar <número> ---
    if (sub === "figurinhas" && (args[1] || "").toLowerCase() === "limpar") {
      const numero = parseInt(args[2], 10);
      const jogo = listaJogos[numero - 1];
      if (!jogo) return reply("Uso: #jogos figurinhas limpar <número>");
      setGroupConfig(groupId, `jogos.figurinhas.${jogo.id}`, []);
      return reply(`✅ Figurinhas do jogo "${jogo.nome}" removidas.`);
    }

    // --- #jogos perguntas add <número> <texto> ---
    if (sub === "perguntas" && (args[1] || "").toLowerCase() === "add") {
      const numero = parseInt(args[2], 10);
      const jogo = listaJogos[numero - 1];
      const texto = args.slice(3).join(" ");
      if (!jogo || !texto)
        return reply("Uso: #jogos perguntas add <número> <texto da pergunta>");

      const listaAtual = config.jogos.perguntasCustom[jogo.id] || [];
      const nova = [...listaAtual, texto];
      setGroupConfig(groupId, `jogos.perguntasCustom.${jogo.id}`, nova);

      return reply(
        `✅ Pergunta adicionada (${nova.length} pergunta(s) personalizada(s) pra "${jogo.nome}").\n` +
          `A partir de agora esse jogo usa a lista personalizada em vez das perguntas padrão.`
      );
    }

    // --- #jogos perguntas listar <número> ---
    if (sub === "perguntas" && (args[1] || "").toLowerCase() === "listar") {
      const numero = parseInt(args[2], 10);
      const jogo = listaJogos[numero - 1];
      if (!jogo) return reply("Uso: #jogos perguntas listar <número>");

      const custom = config.jogos.perguntasCustom[jogo.id] || [];
      const usando = custom.length > 0 ? custom : jogo.perguntas;
      const origem = custom.length > 0 ? "personalizada" : "padrão do jogo";

      const texto = usando.map((p, i) => `${i + 1}. ${p}`).join("\n");
      return reply(
        `📋 Perguntas de "${jogo.nome}" (lista ${origem}):\n${texto}`
      );
    }

    // --- #jogos perguntas remover <número> <índice> ---
    if (sub === "perguntas" && (args[1] || "").toLowerCase() === "remover") {
      const numero = parseInt(args[2], 10);
      const indice = parseInt(args[3], 10);
      const jogo = listaJogos[numero - 1];
      if (!jogo || !indice)
        return reply(
          'Uso: #jogos perguntas remover <número> <índice> (veja o índice com "perguntas listar")'
        );

      const listaAtual = config.jogos.perguntasCustom[jogo.id] || [];
      if (indice < 1 || indice > listaAtual.length)
        return reply("Índice inválido.");

      const nova = listaAtual.filter((_, i) => i !== indice - 1);
      setGroupConfig(groupId, `jogos.perguntasCustom.${jogo.id}`, nova);
      return reply(
        `✅ Pergunta removida (${nova.length} restante(s) na lista personalizada).`
      );
    }

    // --- #jogos perguntas limpar <número> ---
    if (sub === "perguntas" && (args[1] || "").toLowerCase() === "limpar") {
      const numero = parseInt(args[2], 10);
      const jogo = listaJogos[numero - 1];
      if (!jogo) return reply("Uso: #jogos perguntas limpar <número>");
      setGroupConfig(groupId, `jogos.perguntasCustom.${jogo.id}`, []);
      return reply(
        `✅ Lista personalizada apagada. "${jogo.nome}" volta a usar as perguntas padrão.`
      );
    }

    // --- #jogos iniciar <número> ---
    if (sub === "iniciar") {
      const numero = parseInt(args[1], 10);
      const jogoBase = listaJogos[numero - 1];
      if (!jogoBase)
        return reply("Número de jogo inválido. Use #jogos pra ver a lista.");

      if (jogoEmAndamento(groupId) || config.jogos.estado !== "idle") {
        return reply(
          "Já tem um jogo em andamento nesse grupo. Use #pararjogo antes de iniciar outro."
        );
      }

      const figurinhas = config.jogos.figurinhas[jogoBase.id] || [];
      if (figurinhas.length === 0) {
        return reply(
          `O jogo "${jogoBase.nome}" ainda não tem figurinhas configuradas.\n` +
            `Use "#jogos addfigurinha ${numero}" e depois manda a figurinha antes de iniciar.`
        );
      }

      // usa a lista de perguntas personalizada se existir, senão a padrão do jogo
      const perguntasCustom = config.jogos.perguntasCustom[jogoBase.id] || [];
      const jogo = {
        ...jogoBase,
        perguntas:
          perguntasCustom.length > 0 ? perguntasCustom : jogoBase.perguntas,
      };

      setGroupConfig(groupId, "jogos.jogoAtual", jogoBase.id);
      await iniciarJogo(sock, groupId, jogo, figurinhas);
      return;
    }

    // --- #jogos (sem argumento) -> lista os jogos disponíveis ---
    const texto = listaJogos.map((j, i) => `${i + 1}. ${j.nome}`).join("\n");
    return reply(
      `🎮 *Jogos disponíveis:*\n${texto}\n\n` +
        `#jogos iniciar <número> — começa o jogo\n` +
        `#jogos addfigurinha <número> — depois manda a figurinha em seguida\n` +
        `#jogos figurinhas limpar <número>\n` +
        `#jogos perguntas add <número> <texto>\n` +
        `#jogos perguntas listar <número>\n` +
        `#jogos perguntas remover <número> <índice>\n` +
        `#jogos perguntas limpar <número> (volta pra lista padrão)`
    );
  },
};