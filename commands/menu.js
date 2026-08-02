const { getGroupConfig } = require('../lib/database');

function status(v) {
  return v ? '✅' : '❌';
}

const CATEGORIAS = {
  seguranca: `*🔐 Segurança*
#antilink | #antilinkhard | #antifake | #ddi <código>
#antipalavrao | #palavrao add|remover|lista
#antienquete | #anticontato | #x9 | #anticlone
#antiimagem | #antivideo | #antiaudio | #antisticker | #antidocumento
#antifloodfigurinha on|off|limite|tempo
#antispamrepetido on|off|limite
#antimarcacaomassa on|off|limite
#limitecaracteres on|off|<número>
#whitelist add|remover <numero>`,

  admin: `*🛡️ Administração*
#soadm on|off
#ban @user | #promover @user | #rebaixar @user
#fechar | #abrir
#apagar (responda a mensagem)
#prefixo add|remover <símbolo>
#inatividade on|off|dias <número>
#inativos [remover]
#warn @user | #warns @user | #resetwarn @user | #warnsystem limite <n>
#linkgrupo
#backup
#apenasadmin on|off (só admins podem usar QUALQUER comando)
#agendamento mensagem|backup|resumo|sorteio|lembrete|listar|remover
#auditoria on|off|destino <numero>
#alertagrupo on|off
#broadcast <mensagem> | origem on|off | receber on|off
#sync definirmodelo | aplicar`,

  engajamento: `*⭐ Engajamento*
#levelsystem on|off
#level (vê seu progresso)
#top10 (ranking do grupo)
#rankdiario (ranking só de hoje, reseta à meia-noite)
#autosticker on|off
#autoresposta on|off|add|remover|lista
#zoeiranovato on|off|frase add|listar|remover|limpar (zoa homens na apresentação, por nome)
#enquete Pergunta | Opção 1 | Opção 2
#sorteio <segundos> <prêmio>
#jogos (lista jogos disponíveis)
#jogo <número>
#jogos addfigurinha <número> (envie com uma figurinha)
#pararjogo`,

  geral: `*⚙️ Geral*
#boasvindas on|off|mensagem <texto>
#saida on|off|mensagem <texto>
#ativarpadrao (liga x9, antidocumento, anticlone, boasvindas, saida de uma vez)
#menu (este painel)`
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
#menu geral

Apenas admins do grupo podem usar comandos de configuração.
    `.trim();

    return reply(texto);
  }
};
