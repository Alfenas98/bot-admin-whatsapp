# whatsapp-group-bot

Bot de administração de grupo no WhatsApp usando [Baileys](https://github.com/WhiskeySockets/Baileys),
com sistema de plugins de comando, moderação automática, jogos interativos
e automações agendadas. Configuração salva por grupo em `database/db.json`
(lowdb).

## Como rodar localmente

```bash
npm install
npm start
```

Sem nenhuma variável de ambiente configurada, aparece um QR code no
terminal — escaneie com o WhatsApp que vai atuar como bot (recomenda-se uma
conta normal, não Business).

## Rodando 100% no Railway (sem depender do celular/computador ligados)

### Variáveis de ambiente

| Variável | Exemplo | Obrigatória? | Pra quê serve |
|---|---|---|---|
| `STORAGE_DIR` | `/data` | Sim (recomendado) | Onde ficam salvos a sessão e o banco. Precisa bater com o caminho do Volume. |
| `PHONE_NUMBER` | `5511999998888` | Não | Se definida, conecta por **código de pareamento** em vez de QR (só dígitos, com DDI, sem `+`). |
| `TIMEZONE_OFFSET_HOURS` | `-3` | Não, mas recomendado | Ajusta os horários dos agendamentos pro fuso de Brasília (o servidor do Railway costuma rodar em UTC). |
| `RESET_SESSION` | `true` | Não | Só use temporariamente pra apagar uma sessão travada. **Remova depois de reconectar**, senão ele reseta a cada boot. |
| `DEBUG` | `true` | Não | Ativa logs extras (tipo de mensagem recebida) pra depurar problemas de moderação. |

### Passo a passo pra conectar sem QR

1. Configure `PHONE_NUMBER` e `STORAGE_DIR` no Railway.
2. Adicione um **Volume** no serviço, montado no mesmo caminho de `STORAGE_DIR`.
3. Suba o código, espere o deploy.
4. Abra os **Logs** — vai aparecer um `CÓDIGO DE PAREAMENTO`.
5. No WhatsApp do número configurado: Aparelhos conectados → Conectar um
   aparelho → "Conectar com número de telefone" → digite o código
   **rapidamente** (ele expira em poucos minutos).
6. Depois de conectado, a sessão fica salva no Volume — deploys futuros
   reconectam sozinhos, sem pedir nada de novo.

### Alternativa: QR code numa página web

Se preferir QR em vez de código de pareamento, **não defina** `PHONE_NUMBER`.
O bot sobe um servidor web simples (na porta de `PORT`, ou 3000 por padrão)
mostrando o QR code como imagem. Gere um domínio público em Settings →
Networking → "Generate Domain" no Railway, e abra essa URL — o QR aparece
lá, atualizando sozinho a cada 15s.

## ⚠️ Atualizar o código NÃO apaga as configurações do Railway

Isso é importante: **variáveis de ambiente e o Volume são configurações do
serviço no Railway, completamente separadas do código no GitHub**. Subir
arquivos novos pro repositório e fazer redeploy:

- ✅ NÃO apaga `PHONE_NUMBER`, `STORAGE_DIR`, `TIMEZONE_OFFSET_HOURS` nem
  nenhuma outra variável — elas continuam lá até você mesmo apagar/mudar
  manualmente na aba Variables.
- ✅ NÃO apaga o conteúdo do Volume — a sessão do WhatsApp e o
  `database.json` (todas as configs de grupo, XP, warns, agendamentos, etc)
  continuam intactos.
- ✅ O bot reinicia por alguns segundos durante o deploy e reconecta sozinho
  usando a sessão salva — sem pedir QR/código de novo.

**A única forma de perder algo é:**
- Deixar `RESET_SESSION=true` esquecido (apaga a sessão a cada boot).
- Apagar ou desconectar o Volume manualmente nas configurações do serviço.
- O WhatsApp deslogar a sessão por conta própria (uso raro, geralmente após
  muitas semanas sem abrir o app no celular).

Então: **pode subir código novo sem medo**, contanto que não mexa nas
Variables/Volume por conta própria.

## Lista completa de comandos

Chame `#menu` no grupo pra ver o painel de status, ou `#menu seguranca` /
`#menu admin` / `#menu engajamento` / `#menu geral` pra ver por categoria.
A maioria dos comandos de toggle funciona chamado sozinho (liga se tava
off, desliga se tava on).

### 🔐 Segurança
- `#antilink` — bloqueia link de convite de grupo (chat.whatsapp.com/...)
- `#antilinkhard` — bloqueia QUALQUER link
- `#antifake` + `#ddi <código>` — bloqueia números fora do DDI permitido
- `#antipalavrao` + `#palavrao add|remover|lista`
- `#antienquete` — bloqueia enquetes enviadas por membros
- `#anticontato` — bloqueia envio de vCard
- `#x9` — avisa quando alguém apaga mensagem no grupo
- `#anticlone` — avisa quando um nome de exibição fica parecido com o de
  um admin (possível golpe)
- `#antiimagem`, `#antivideo`, `#antiaudio`, `#antisticker`, `#antidocumento`
- `#antifloodfigurinha on|off|limite|tempo`
- `#antispamrepetido on|off|limite` — bloqueia mensagem repetida N vezes seguidas
- `#antimarcacaomassa on|off|limite`
- `#limitecaracteres on|off|<número>`
- `#whitelist add|remover <numero>` — libera um número específico do anti-link

### 🛡️ Administração
- `#soadm on|off` — só admins mandam mensagem
- `#apenasadmin on|off` — só admins podem usar **qualquer** comando do bot
- `#ban @user`, `#promover @user`, `#rebaixar @user`
- `#fechar` / `#abrir`
- `#apagar` (responda a mensagem)
- `#prefixo add|remover <símbolo>`
- `#inatividade on|off|dias <número>` + `#inativos [remover]`
- `#warn @user`, `#warns @user`, `#resetwarn @user`, `#warnsystem limite <n>`
- `#linkgrupo` — gera o link de convite atual
- `#backup` — envia o arquivo de dados como documento no WhatsApp
- `#auditoria on|off|destino <numero>` — log de ban/promover/rebaixar/warn
- `#alertagrupo on|off` — avisa quando nome/descrição do grupo mudam
- `#broadcast <mensagem>` / `origem on|off` / `receber on|off`
- `#sync definirmodelo` / `#sync aplicar` — replica config entre grupos
- `#agendamento mensagem|backup|resumo|resumodiario|sorteio|lembrete|listar|remover`

### ⭐ Engajamento
- `#levelsystem on|off` + `#level`
- `#top10` — ranking geral (desde sempre)
- `#rankdiario` — ranking só de hoje, reseta à meia-noite
- `#autosticker on|off`
- `#autoresposta on|off|add|remover|lista`
- `#enquete Pergunta | Opção 1 | Opção 2` — enquete nativa do WhatsApp
- `#sorteio <segundos> <prêmio>`

### 🎮 Jogos
- `#jogos` — lista os jogos disponíveis
- `#jogo <número>` — inicia a partida
- `#jogos addfigurinha <número>` — configura figurinhas (2 passos: comando + mandar a figurinha em seguida)
- `#jogos figurinhas limpar <número>`
- `#jogos perguntas add|listar|remover|limpar <número>`
- `#pararjogo` — interrompe a qualquer momento

Jogos disponíveis: **Eu Nunca** (106 perguntas), **Eu Nunca +18** (34,
conteúdo adulto), **Verdade ou Desafio** (30), **Qual Foi?** (24, livre
compartilhamento), **Enquete Polêmica** (24, usa enquete nativa do
WhatsApp em vez de figurinha).

### ⚙️ Geral
- `#boasvindas on|off|mensagem <texto>|imagem|imagens lista|imagens limpar`
- `#saida on|off|mensagem <texto>`
- `#menu` / `#menu <categoria>`

## Detecção de inatividade

`#inatividade on` + `#inatividade dias <número>` (padrão: 30 dias sem
mensagem). Checagem automática a cada 24h. Admins nunca são removidos.
Membros sem histórico (de antes da função ser ligada) não são removidos na
primeira checagem — só passam a ser rastreados a partir dali.
`#inativos` mostra a lista sem remover; `#inativos remover` roda na hora.

## Automações agendadas

O `#agendamento` cobre várias automações num só sistema:

- **Mensagem recorrente**: `#agendamento mensagem <HH:MM> <dias|todos> <texto>`
- **Backup automático**: `#agendamento backup <HH:MM> <dias|todos>`
- **Resumo automático (top 10 geral)**: `#agendamento resumo <HH:MM> <dias|todos>`
- **Ranking diário automático**: `#agendamento resumodiario <HH:MM> <dias|todos>`
- **Sorteio automático**: `#agendamento sorteio <HH:MM> <dias|todos> <segundos> <prêmio>`
- **Lembrete**: `#agendamento lembrete <MM-DD ou YYYY-MM-DD> <HH:MM> <texto>`
  (formato `MM-DD` repete todo ano — bom pra aniversário; `YYYY-MM-DD`
  dispara uma vez só e depois se autoapaga)

`#agendamento listar` mostra tudo configurado; `#agendamento remover <número>` apaga um.

Dias aceitos: `dom,seg,ter,qua,qui,sex,sab` (separados por vírgula) ou `todos`.

⚠️ Os horários dependem do fuso do servidor — configure
`TIMEZONE_OFFSET_HOURS=-3` no Railway pra bater com o horário de Brasília.

## Log de auditoria

`#auditoria on` registra `#ban`, `#promover`, `#rebaixar` e remoção
automática por `#warn`, mandando um log formatado. Por padrão manda no
próprio grupo; `#auditoria destino <numero>` redireciona pro privado de
alguém (útil pra um "grupo de admins" só de vocês).

## Broadcast entre grupos

Pra um grupo poder mandar aviso pra outros:
1. No grupo que vai **enviar**: `#broadcast origem on`
2. Nos grupos que vão **receber**: `#broadcast receber on`
3. No grupo de origem: `#broadcast <sua mensagem>`

## Sincronizar configuração entre grupos

1. No grupo que vai servir de modelo: `#sync definirmodelo`
2. Em qualquer outro grupo: `#sync aplicar` — copia moderação, boas-vindas,
   level, prefixos, etc (não copia estado de jogo em andamento nem
   figurinhas configuradas).

## O que NÃO está incluído

- **Anti-figurinha/imagem NSFW**: exigiria API externa de moderação visual.
- **Pin nativo de mensagem**: não há garantia de suporte confiável na
  versão do Baileys usada; a alternativa é repostar via `#agendamento mensagem`.

## Estrutura

```
index.js                    -> conexão Baileys, servidor de QR, roteamento de eventos
lib/database.js              -> config por grupo (lowdb) + merge automático de defaults
lib/storage.js                -> caminho configurável de armazenamento (STORAGE_DIR)
lib/commandLoader.js         -> carrega automaticamente os arquivos de commands/
lib/permissions.js           -> checagem de admin de grupo / admin do bot
lib/activity.js                -> última atividade (pra inatividade)
lib/inactivityChecker.js      -> cálculo de quem está inativo
lib/dailyRank.js               -> ranking diário (reseta à meia-noite)
lib/xp.js                     -> sistema de level/XP
lib/warns.js                  -> sistema de advertências
lib/auditLog.js                -> log de ações administrativas
lib/scheduler.js               -> motor de agendamentos (#agendamento)
lib/floodTracker.js           -> controle de flood de figurinhas (memória)
lib/spamTracker.js            -> controle de mensagem repetida (memória)
lib/similarity.js / anticlone.js -> detecção de nome parecido com admin
lib/messageCache.js            -> cache de mensagens recentes (pro x9)
lib/unwrapMessage.js           -> desembrulha mensagem temporária/visualização única
lib/pendingCapture.js          -> captura de figurinha em 2 passos (jogos)
lib/gameRuntime.js             -> motor dos jogos (figurinha e enquete nativa)
lib/gamesList.js / lib/games/*.js -> definição de cada jogo
middlewares/moderation.js     -> todas as regras automáticas
commands/*.js                 -> cada comando é um plugin isolado
```

## Criando um novo comando

Crie um arquivo em `commands/`, exportando:

```js
module.exports = {
  name: 'meucomando',
  aliases: ['mc'],       // opcional
  adminOnly: true,        // opcional
  async execute({ sock, groupId, senderId, args, reply }) {
    return reply('resposta');
  }
};
```

Carregado automaticamente, sem precisar registrar em nenhum outro lugar.

## Criando um novo jogo

Crie um arquivo em `lib/games/`, exportando `{ id, nome, instrucoes,
perguntas }` (jogos de figurinha) ou `{ id, nome, tipo: 'enquete', opcoes,
instrucoes, perguntas }` (jogos de enquete nativa). Registre no array em
`lib/gamesList.js` — a posição na lista define a numeração do `#jogo`.

## Deploy no Railway — checklist geral

1. Suba pro GitHub (`.gitignore` já exclui `auth_info/` e o banco).
2. Conecte o repositório no Railway.
3. Configure as variáveis da tabela acima + o Volume.
4. A lib `sharp` (usada no `#autosticker`) às vezes precisa de dependências
   de sistema (libvips) — se o build falhar por causa dela, vale investigar.
