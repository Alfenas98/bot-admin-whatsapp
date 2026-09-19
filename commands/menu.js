const { getGroupConfig } = require('../lib/database');

function status(v) {
  return v ? '✅' : '❌';
}

function statusOnOff(v) {
  return v ? '🟢 LIGADO' : '🔴 DESLIGADO';
}

const CATEGORIAS = {
  seguranca: `
╭───────────────╮
│ 🔐 *SEGURANÇA* │
╰───────────────╯
├─ Anti-Link
│  #antilink on/off     → Links de convite
│  #antilinkhard on/off → Todos os links
│  #whitelist add/remover <num> → Exceções
├─ Anti-Fake
│  #antifake on/off     → Bloqueia DDI estrangeiro
│  #ddi <código>        → Ex: #ddi 55
├─ Anti-Spam
│  #antipalavrao on/off → Filtra palavrões
│  #palavrao add <palavra>
│  #antifloodfigurinha on/off
│  #antispam on/off
│  #antimarcacaomassa on/off
├─ Anti-Mídia
│  #antiimagem on/off
│  #antivideo on/off
│  #antiaudio on/off
│  #antisticker on/off
│  #antidocumento on/off
├─ Outros
│  #antienquete on/off
│  #anticontato on/off
│  #anticlone on/off
│  #x9 on/off           → Dedurar admins
│  #limitecaracteres on/off <num>
╚═`,

  admin: `
╭─────────────────╮
│ 🛡️ *ADMINISTRAÇÃO* │
╰─────────────────╯
├─ Grupo
│  #abrir / #fechar    → Abrir/fechar grupo
│  #apagar             → Apagar msg (responder)
│  #soadm on/off       → Só admins falaram
│  #apenasadmin on/off → Só admins comandos
├─ Membros
│  #ban @user          → Banir membro
│  #promover @user     → Promover a admin
│  #rebaixar @user     → Rebaixar admin
│  #warn @user         → Advertir
│  #warns @user        → Ver advertências
│  #resetwarn @user    → Zerar advertências
│  #warnsystem limite <n>
├─ Mute
│  #mutar @user [tempo]   → Mutar membro
│  #desmutar @user        → Desmutar
├─ Prefixo
│  #prefixo add/remover <símbolo>
├─ Inatividade
│  #inatividade on/off|dias <n>
│  #inativos [remover]    → Remover inativos
├─ Mensagens
│  #boasvindas on/off|mensagem <texto>
│  #saida on/off|mensagem <texto>
├─ Agendamento
│  #agendamento mensagem|backup|resumo|sorteio|lembrete
│  #agendamento listar|remover
├─ Extras
│  #linkgrupo           → Link do grupo
│  #backup              → Backup dos dados
│  #auditoria on/off|destino <num>
│  #alertagrupo on/off  → Alertas de mudança
│  #broadcast <mensagem> → Enviar para outros grupos
╚═`,

  engajamento: `
╭──────────────────╮
│ ⭐ *ENGAJAMENTO*   │
╰──────────────────╯
├─ Level/XP
│  #levelsystem on/off → Ativar sistema de XP
│  #level                → Ver seu progresso
│  #top10                → Ranking do grupo
│  #rankdiario           → Ranking de hoje
│  #rankia               → Análise IA do ranking 🤖
├─ Auto
│  #autosticker on/off  → Figurinha automática
│  #autoresposta on/off → Respostas automáticas
│  #zoeiranovato on/off  → Zoar novatos
├─ Namoro/Casamento
│  #namorar @user       → Propor namoro
│  #aceitar             → Aceitar proposta
│  #terminar            → Terminar namoro
│  #casal               → Ver seu casal
│  #casar @user         → Pedir em casamento
├─ Diversão
│  #enquete Pergunta | Opção 1 | Opção 2
│  #sorteio <segundos> <prêmio>
├─ Jogos
│  #jogos               → Lista de jogos
│  #jogo <número>       → Iniciar jogo
│  #jogos addfigurinha <número> → Add figurinha
│  #pararjogo           → Parar jogo
╚═`,

  jogos: `
╭─────────────╮
│ 🎮 *JOGOS*  │
╰─────────────╯
├─ Eu Nunca
│  #jogo 1 → "Eu Nunca..."
│  #jogo 2 → "Eu Nunca +18"
├─ Outros
│  #jogo 3 → Verdade ou Desafio
│  #jogo 4 → Verdade ou Desafio +18
│  #jogo 5 → Qual Foi?
│  #jogo 6 → Enquete Polêmica
├─ Comandos
│  #px                 → Pular pergunta
│  #pararjogo          → Parar jogo
│  #jogos addfigurinha → Add figurinha
╚═`,

  inteligencia: `
╭────────────────────╮
│ 🤖 *INTELIGÊNCIA IA* │
╰────────────────────╯
├─ Consultas
│  #pergunta <texto>   → Perguntar à IA
│  #rankia             → Análise IA do ranking
├─ Texto
│  #traduzir <texto>   → Traduzir qualquer idioma
├─ Diversão
│  #piada              → Piadas aleatórias
│  #historia           → História com membros
│  #conselho <tema>    → Conselhos
│  #dica               → Dica do dia
├─ Análise
│  #humor              → Análise de humor do grupo
│  #analise            → Diagnóstico do grupo
│  #sugestiao          → Sugestões de enquetes
├─ Utilidades
│  #resumo             → Resumo das mensagens
│  #membros            → Estatísticas do grupo
╚═`,

  anonimo: `
╭─────────────────╮
│ 📬 *CAIXA ANÔNIMA* │
╰─────────────────╯
├─ Admin
│  #caixaanon on/off  → Ativar/desativar
│  #limparanon        → Limpar histórico
├─ Membros
│  #anomsg <mensagem> → Enviar mensagem anônima
├─ Consulta (Admin)
│  #histanon [qtd]    → Ver histórico
│  #responderanon <n> <resposta>
│  #relatorioanon     → Estatísticas
╚═`,

  utilidades: `
╭─────────────────╮
│ 🔧 *UTILIDADES*  │
╰─────────────────╯
├─ Clima
│  #clima <cidade>    → Previsão do tempo
│  Cidades: SP, RJ, BH, Curitiba, etc
├─ Economia
│  #cotacao <moeda>   → Cotação
│  USD, EUR, BTC, ETH, etc
├─ Grupo
│  #id                → ID do grupo
│  #ping               → Latência
│  #infogrupo         → Informações
├─ Outros
│  #ativarpadrao       → Ativar recursos padrão
│  #menu               → Este menu
╚═`
};

module.exports = {
  name: 'menu',
  aliases: ['help', 'ajuda', 'comandos'],
  adminOnly: false,

  async execute({ groupId, args, reply }) {
    const categoria = (args[0] || '').toLowerCase();
    
    if (CATEGORIAS[categoria]) {
      return reply(CATEGORIAS[categoria].trim());
    }

    const c = getGroupConfig(groupId);

    const texto = `
╭─────────────────────────────────╮
│   🤖 *BOT ADMINISTRADOR v2.0*    │
╰─────────────────────────────────╯

╭─ *📊 STATUS DO GRUPO* ─╮
│ 🔗 Anti-Link: ${statusOnOff(c.antilink)}
│ 🧱 Anti-Link Hard: ${statusOnOff(c.antilinkhard)}
│ 🧩 Anti-Fake: ${statusOnOff(c.antifake)}
│ 🤬 Anti-Palavrão: ${statusOnOff(c.antipalavrao)}
│ 🖼️ Anti-Imagem: ${statusOnOff(c.antimidia.imagem)}
│ 📹 Anti-Vídeo: ${statusOnOff(c.antimidia.video)}
│ 🎧 Anti-Áudio: ${statusOnOff(c.antimidia.audio)}
│ 🧩 Anti-Sticker: ${statusOnOff(c.antimidia.sticker)}
│ 📄 Anti-Doc: ${statusOnOff(c.antimidia.documento)}
│ 📢 Anti-Flood Fig: ${statusOnOff(c.antifloodFigurinha.ativo)}
│ 🔁 Anti-Spam: ${statusOnOff(c.antispamRepetido.ativo)}
│ 👋 Boas-vindas: ${statusOnOff(c.boasvindas.ativo)}
│ ⭐ Level: ${statusOnOff(c.levelSystem)}
╰─────────────────────────╯

╭─ *📂 CATEGORIAS* ─╮
│ 
│  🔐 #menu seguranca
│  🛡️ #menu admin
│  ⭐ #menu engajamento
│  🎮 #menu jogos
│  🤖 #menu inteligencia
│  📬 #menu anonimo
│  🔧 #menu utilidades
│
╰─────────────────╯

╭─ *💡 COMANDOS POPULARES* ─╮
│ 
│  #jogo 1           → Eu Nunca
│  #sorteio 60s Prêmio  → Sorteio
│  #clima São Paulo  → Clima
│  #cotacao USD      → Cotação
│  #pergunta texto   → Perguntar à IA
│  #traduzir texto   → Traduzir
│  #anomsg mensagem  → Msg anônima
│  #px               → Pular pergunta
│ 
╰───────────────────────────╯
    `.trim();

    return reply(texto);
  }
};
