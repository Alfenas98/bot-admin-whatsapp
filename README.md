# Bot de Administração de Grupo — WhatsApp

![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-000000?style=for-the-badge)
![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

> Bot profissional de administração para grupos WhatsApp, com moderação automática, sistema de plugins, jogos interativos e automações agendadas. As configurações são persistidas por grupo em `database/db.json` usando `lowdb`.

---

## Sumário

- [Sobre](#sobre)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Instalação local](#instalação-local)
- [Deploy no Railway](#deploy-no-railway)
- [Comandos](#comandos)
- [Configurações avançadas](#configurações-avançadas)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Extensibilidade](#extensibilidade)
- [Limitações conhecidas](#limitações-conhecidas)

---

## Sobre

Este projeto utiliza a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys) para se conectar ao WhatsApp Web e atuar como administrador assistente em grupos. Ele foi projetado para ser:

- **Multi-grupo**: cada grupo tem sua própria configuração isolada.
- **Extensível**: comandos são plugins carregados automaticamente.
- **Resiliente**: sessão persistente em volume, reconexão automática e deploy contínuo seguro.
- **Observável**: logs estruturados com `pino` e página web de status/QR code.

---

## Funcionalidades

- **Moderação automática**: anti-link, anti-fake, anti-palavrão, anti-enquete, anti-contato, anti-clone, anti-mídia, anti-flood, anti-spam e limite de caracteres.
- **Administração**: ban/promote/rebaixar, fechar/abrir grupo, warn, inatividade, backup, auditoria, broadcast, sincronização de configuração.
- **Engajamento**: sistema de XP/level, ranking diário/geral, auto-sticker, auto-resposta, enquetes e sorteios.
- **Jogos**: Eu Nunca, Verdade ou Desafio, Qual Foi? e Enquete Polêmica.
- **Automações**: agendamento de mensagens, backups, resumos, rankings, sorteios e lembretes recorrentes ou únicos.

---

## Pré-requisitos

- **Node.js** ≥ 18
- **npm** ≥ 9
- Conta no [Railway](https://railway.app) (opcional, para deploy)
- Volume configurado no Railway se for rodar de forma persistente

---

## Instalação local

```bash
# Instale as dependências
npm install

# Inicie o bot
npm start
```

Na primeira execução, um QR code será exibido no terminal. Escaneie com o WhatsApp que atuará como bot. Recomenda-se usar uma conta pessoal, não Business.

---

## Deploy no Railway

### Variáveis de ambiente

| Variável | Exemplo | Obrigatória | Descrição |
|----------|---------|-------------|-----------|
| `STORAGE_DIR` | `/data` | ✅ recomendada | Caminho onde a sessão e o banco serão salvos. Deve coincidir com o ponto de montagem do Volume. |
| `PHONE_NUMBER` | `5511999998888` | ❌ opcional | Se definida, ativa conexão por **código de pareamento** ao invés de QR. Somente dígitos, com DDI, sem `+`. |
| `TIMEZONE_OFFSET_HOURS` | `-3` | ❌ recomendada | Ajusta os agendamentos para o fuso de Brasília. O Railway costuma rodar em UTC. |
| `RESET_SESSION` | `true` | ❌ uso temporário | Apaga a sessão atual para recuperar de conexão travada. **Remova após reconectar**. |
| `DEBUG` | `true` | ❌ opcional | Habilita logs extras de depuração. |

### Conexão sem QR

1. Defina `PHONE_NUMBER` e `STORAGE_DIR` no Railway.
2. Adicione um **Volume** ao serviço, montado em `STORAGE_DIR`.
3. Faça o deploy e abra os **Logs**.
4. Copie o `CÓDIGO DE PAREAMENTO`.
5. No WhatsApp: *Aparelhos conectados → Conectar com número de telefone* e digite o código rapidamente.
6. A sessão ficará salva no Volume. Próximos deploys reconectarão automaticamente.

### Conexão por QR code

Se `PHONE_NUMBER` não estiver definida, o bot publica uma página web com o QR code atualizando automaticamente.

1. Gere um domínio público em **Settings → Networking → Generate Domain**.
2. Acesse a URL pública; o QR aparecerá na página e será renovado a cada 15s.
3. Escaneie com o WhatsApp para conectar.

---

## ⚠️ Atualizações não apagam dados do Railway

Variáveis de ambiente e Volume são independentes do código no GitHub.

- ✅ Atualizar o repositório **não remove** variáveis configuradas.
- ✅ Atualizar o repositório **não apaga** o conteúdo do Volume.
- ✅ O bot reinicia e reconecta automaticamente com a sessão salva.

Riscos reais de perda:
- deixar `RESET_SESSION=true` configurado;
- remover o Volume manualmente;
- logout espontâneo por parte do WhatsApp após longo período de inatividade.

Portanto, **pode atualizar o código com segurança**, contanto que não altere `Variables` ou `Volume`.

---

## Comandos

Use `#menu` para ver o painel geral, ou `#menu <categoria>` para filtrar por tema.

### 🔐 Segurança

- `#antilink` — bloqueia convites de grupo
- `#antilinkhard` — bloqueia qualquer link
- `#antifake` + `#ddi <código>` — restringe DDI permitido
- `#antipalavrao` + `#palavrao add|remover|lista`
- `#antienquete` — bloqueia enquetes de membros
- `#anticontato` — bloqueia envio de vCard
- `#x9` — alerta sobre mensagens apagadas
- `#anticlone` — alerta nomes parecidos com admins
- `#antiimagem`, `#antivideo`, `#antiaudio`, `#antisticker`, `#antidocumento`
- `#antifloodfigurinha on|off|limite|tempo`
- `#antispamrepetido on|off|limite`
- `#antimarcacaomassa on|off|limite`
- `#limitecaracteres on|off|<número>`
- `#whitelist add|remover <numero>`

### 🛡️ Administração

- `#soadm on|off` — apenas admins enviam mensagem
- `#apenasadmin on|off` — apenas admins usam comandos
- `#ban @user`, `#promover @user`, `#rebaixar @user`
- `#fechar` / `#abrir`
- `#apagar` — apaga a mensagem respondida
- `#prefixo add|remover <símbolo>`
- `#inatividade on|off|dias <número>` e `#inativos [remover]`
- `#warn`, `#warns`, `#resetwarn` e `#warnsystem limite <n>`
- `#linkgrupo` — link de convite atual
- `#backup` — exporta o banco como documento
- `#auditoria on|off|destino <numero>`
- `#alertagrupo on|off`
- `#broadcast` e modos `origem` / `receber`
- `#sync definirmodelo` / `#sync aplicar`
- `#agendamento mensagem|backup|resumo|resumodiario|sorteio|lembrete|listar|remover`

### ⭐ Engajamento

- `#levelsystem on|off` e `#level`
- `#top10` e `#rankdiario`
- `#autosticker on|off`
- `#autoresposta on|off|add|remover|lista`
- `#enquete Pergunta | Opção 1 | Opção 2`
- `#sorteio <segundos> <prêmio>`

### 🎮 Jogos

- `#jogos` — lista disponíveis
- `#jogo <número>` — inicia partida
- `#jogos addfigurinha <número>`
- `#jogos figurinhas limpar <número>`
- `#jogos perguntas add|listar|remover|limpar <número>`
- `#pararjogo`

Jogos incluídos: **Eu Nunca**, **Eu Nunca +18**, **Verdade ou Desafio**, **Qual Foi?** e **Enquete Polêmica**.

### ⚙️ Geral

- `#boasvindas on|off|mensagem <texto>|imagem|imagens lista|imagens limpar`
- `#saida on|off|mensagem <texto>`
- `#menu` e `#menu <categoria>`

---

## Configurações avançadas

### Inatividade

- Ativa com `#inatividade on` e define limite com `#inatividade dias <número>`.
- A checagem roda automaticamente a cada 24h.
- Admins nunca são removidos.
- `#inativos` lista; `#inativos remover` executa a remoção.

### Agendamentos

- `#agendamento mensagem <HH:MM> <dias|todos> <texto>`
- `#agendamento backup <HH:MM> <dias|todos>`
- `#agendamento resumo <HH:MM> <dias|todos>`
- `#agendamento resumodiario <HH:MM> <dias|todos>`
- `#agendamento sorteio <HH:MM> <dias|todos> <segundos> <prêmio>`
- `#agendamento lembrete <MM-DD|YYYY-MM-DD> <HH:MM> <texto>`
- `#agendamento listar` e `#agendamento remover <número>`

Formato de dias aceito: `dom,seg,ter,qua,qui,sex,sab` ou `todos`.

> Ajuste `TIMEZONE_OFFSET_HOURS=-3` no Railway para horário de Brasília.

### Auditoria

- `#auditoria on` registra `#ban`, `#promover`, `#rebaixar` e remoções por warn.
- Saída padrão: o próprio grupo.
- `#auditoria destino <numero>` envia para um privado.

### Broadcast entre grupos

1. Grupo remetente: `#broadcast origem on`
2. Grupos destinatários: `#broadcast receber on`
3. Envio: `#broadcast <mensagem>`

### Sincronização entre grupos

1. Grupo modelo: `#sync definirmodelo`
2. Grupo alvo: `#sync aplicar`

---

## Estrutura do projeto

```text
index.js                     -> conexão Baileys, servidor web, roteamento de eventos
lib/
  database.js                -> configuração por grupo via lowdb + defaults
  storage.js                 -> caminho configurável de armazenamento
  commandLoader.js           -> carregamento automático de plugins
  permissions.js             -> checagem de admin de grupo/admin do bot
  activity.js                -> última atividade por membro
  inactivityChecker.js       -> cálculo e remoção de inativos
  dailyRank.js                -> ranking diário
  xp.js                      -> sistema de level/XP
  warns.js                   -> advertências
  auditLog.js                -> log de ações administrativas
  scheduler.js               -> agendamentos
  floodTracker.js            -> controle de flood de figurinhas
  spamTracker.js             -> controle de mensagem repetida
  similarity.js / anticlone.js -> detecção de clone de admin
  messageCache.js            -> cache de mensagens recentes
  unwrapMessage.js           -> desembrulho de mensagens temporárias
  pendingCapture.js          -> captura de figurinha em 2 passos
  gameRuntime.js             -> motor de jogos
  gamesList.js / lib/games/* -> catálogo e conteúdos de jogos
middlewares/
  moderation.js              -> regras automáticas de moderação
commands/*.js                -> plugins de comando
database/
  db.json                    -> banco local por grupo
```

---

## Extensibilidade

### Novo comando

Crie um arquivo em `commands/` exportando:

```js
module.exports = {
  name: 'meucomando',
  aliases: ['mc'],
  adminOnly: false,
  async execute({ sock, groupId, senderId, args, reply }) {
    return reply('funcionou');
  }
};
```

O carregamento é automático; não é necessário registrar manualmente.

### Novo jogo

Crie um arquivo em `lib/games/` exportando `id`, `nome`, `instrucoes` e `perguntas`, ou `tipo: 'enquete'` com `opcoes` e `perguntas`. Registre em `lib/gamesList.js`. A posição na lista define o número do `#jogo`.

---

## Limitações conhecidas

- **Anti-NSFW visual**: não incluído, pois exigiria API externa de moderação de imagem.
- **Pin nativo de mensagem**: não há garantia de suporte confiável na versão atual do Baileys. Alternativa recomendada: `#agendamento mensagem`.

---

## Deploy — checklist rápido

1. Suba o repositório para o GitHub.
2. Conecte o repositório no Railway.
3. Configure as variáveis de ambiente e o Volume conforme esta documentação.
4. Verifique dependências de sistema para `sharp` em caso de erro de build.
