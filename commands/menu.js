const { getGroupConfig } = require('../lib/database');

function status(v) {
  return v ? '✅' : '❌';
}

const CATEGORIAS = {
  seguranca: `*🔐 Segurança*\n#antilink | #antilinkhard | #antifake | #ddi <código>\n#antipalavrao | #palavrao add|remover|lista\n#antienquete | #anticontato | #x9 | #anticlone\n#antiimagem | #antivideo | #antiaudio | #antisticker | #antidocumento\n#antifloodfigurinha on|off|limite|tempo\n#antispamrepetido on|off|limite\n#antimarcacaomassa on|off|limite\n#limitecaracteres on|off|<número>\n#whitelist add|remover <numero>`, 

  admin: `*🛡️ Administração*\n#soadm on|off\n#ban @user | #promover @user | #rebaixar @user\n#fechar | #abrir\n#apagar (responda a mensagem)\n#prefixo add|remover <símbolo>\n#inatividade on|off|dias <número>\n#inativos [remover]\n#warn @user | #warns @user | #resetwarn @user | #warnsystem limite <n>\n#linkgrupo\n#backup\n#apenasadmin on|off (só admins podem usar QUALQUER comando)\n#agendamento mensagem|backup|resumo|sorteio|lembrete|listar|remover\n#auditoria on|off|destino <numero>\n#alertagrupo on|off\n#broadcast <mensagem> | origem on|off | receber on|off\n#sync definirmodelo | aplicar`,

  engajamento: `*⭐ Engajamento*\n#levelsystem on|off\n#level (vê seu progresso)\n#top10 (ranking do grupo)\n#rankdiario (ranking só de hoje, reseta à meia-noite)\n#autosticker on|off\n#autoresposta on|off|add|remover|lista\n#zoeiranovato on|off|frase add|listar|remover|limpar (zoa homens na apresentação, por nome)\n#namorar @user (propõe) | #aceitar | #terminar | #casal [@user]\n#casar @user (pede casamento pra quem já namora)\n#enquete Pergunta | Opção 1 | Opção 2\n#sorteio <segundos> <prêmio>\n#jogos (lista jogos disponíveis)\n#jogo <número>\n#jogos addfigurinha <número> (envie com uma figurinha)\n#pararjogo`,

  inteligencia: `*🤖 Inteligência Artificial*\n#ai <pergunta>\n#resumir <texto>\n#traduzir pt|en "texto"\n#sentimento <texto>\n#topicos <texto>\n#code "requisição"`,

  geral: `*⚙️ Geral*\n#boasvindas on|off|mensagem <texto>\n#saida on|off|mensagem <texto>\n#ativarpadrao (liga x9, antidocumento, anticlone, boasvindas, saida de uma vez)\n#menu (este painel)`
};

module.exports = {
  name: 'menu',
  aliases: ['status', 'painel'],
  adminOnly: false,
  async execute({ groupId, args, reply }) {
    const categoria = (args[0] || '').toLowerCase();
    if (CATEGORIAS[categoria]) return reply(CATEGORIAS[categoria]);

    const c = getGroupConfig(groupId);

    const texto = `
╭─〔 *STATUS DO BOT* 〕
│ 🔗 antilink (convite): ${status(c.antilink)}
│ 🧱 antilinkhard (todo link): ${status(c.antilinkhard)}
│ 🧩 antifake: ${status(c.antifake)}
│ 🤬 antipalavrao: ${status(c.antipalavrao)}
│ 📊 antienquete: ${status(c.antienquete)}
│ 👤 anticontato: ${status(c.anticontato)}
│ 👀 x9: ${status(c.x9)}
│ 🧬 anticlone: ${status(c.anticlone)}
│ 🛡️ soadm: ${status(c.soAdmin)}
│ 🕰️ inatividade: ${status(c.inatividade.ativo)}
│ 🔒 apenasadmin: ${status(c.apenasAdminUsaComandos)}
│ 🖼️ antiimagem: ${status(c.antimidia.imagem)}
│ 📹 antivideo: ${status(c.antimidia.video)}
│ 🎧 antiaudio: ${status(c.antimidia.audio)}
│ 🧩 antisticker: ${status(c.antimidia.sticker)}
│ 📄 antidocumento: ${status(c.antimidia.documento)}
│ 📢 antifloodfigurinha: ${status(c.antifloodFigurinha.ativo)}
│ 🔁 antispamrepetido: ${status(c.antispamRepetido.ativo)}
│ 📛 antimarcacaomassa: ${status(c.antimarcacaomassa.ativo)}
│ 🔢 limitecaracteres: ${status(c.limiteCaracteres.ativo)}
│ 🤳 boasvindas: ${status(c.boasvindas.ativo)}
│ 👋 saida: ${status(c.saida.ativo)}
│ ⭐ levelsystem: ${status(c.levelSystem)}
│ 🖼️➡️🧩 autosticker: ${status(c.autosticker)}
│ 💬 autoresposta: ${status(c.autoresposta.ativo)}
╰────────────

*Categorias de comando:*
#menu seguranca
#menu admin
#menu engajamento
#menu inteligencia
#menu geral

Apenas admins do grupo podem usar comandos de configuração.
    `.trim();

    return reply(texto);
  }
};
