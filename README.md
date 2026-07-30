# whatsapp-group-bot

Bot de administração de grupo no WhatsApp usando [Baileys](https://github.com/WhiskeySockets/Baileys),
com sistema de plugins de comando e configuração por grupo salva em
`database/db.json` (lowdb).

## Como rodar localmente

```bash
npm install
npm start
```

Na primeira execução vai aparecer um QR code no terminal — escaneie com o
WhatsApp que vai atuar como bot (recomendo uma conta normal, não Business).

As credenciais de sessão ficam salvas em `auth_info/` (não sobe pro git).

## ⚠️ Importante sobre persistência

O banco (`database/db.json`) e a sessão (`auth_info/`) são arquivos locais.
Se o Railway não tiver um volume persistente configurado pro seu plano, eles
são perdidos a cada redeploy — o que reseta configs, XP, warns e histórico de
atividade. Não tenho confirmação de que o plano Hobby inclui isso por
padrão; vale checar a documentação do Railway sobre "Volumes" antes de
depender disso em produção. Use `#backup` periodicamente como proteção
extra (gera um arquivo .json que você pode salvar em outro lugar).

## Lista completa de comandos

Chame `#menu` no grupo pra ver o painel de status, ou `#menu seguranca` /
`#menu admin` / `#menu engajamento` / `#menu geral` pra ver comandos por
categoria. A maioria dos comandos de toggle funciona chamado sozinho (liga
se tava off, desliga se tava on), sem precisar decorar sintaxe.

**🔐 Segurança**
- `#antilink` — bloqueia links de convite de grupo (chat.whatsapp.com/...)
- `#antilinkhard` — bloqueia QUALQUER link
- `#antifake` + `#ddi <código>` — bloqueia números fora do DDI permitido
- `#antipalavrao` + `#palavrao add|remover|lista` — bloqueia palavras da lista
- `#antienquete` — bloqueia enquetes enviadas por membros
- `#anticontato` — bloqueia envio de vCard/contato
- `#x9` — avisa no grupo quando alguém apaga uma mensagem
- `#anticlone` — avisa quando um nome de exibição fica parecido demais com
  o de um admin (possível golpe de personificação)
- `#antiimagem`, `#antivideo`, `#antiaudio`, `#antisticker`, `#antidocumento`
- `#antifloodfigurinha on|off|limite|tempo` — limite de figurinhas por janela de tempo
- `#antispamrepetido on|off|limite` — bloqueia mensagem repetida N vezes seguidas
- `#antimarcacaomassa on|off|limite` — bloqueia marcar muita gente de uma vez
- `#limitecaracteres on|off|<número>`
- `#whitelist add|remover <numero>` — libera um número específico do anti-link
  (útil se você já usa um bot de afiliados nesse mesmo grupo)

**🛡️ Administração**
- `#soadm on|off` — só admins podem mandar mensagem
- `#ban @user`, `#promover @user`, `#rebaixar @user`
- `#fechar` / `#abrir` — usa a configuração nativa de grupo do WhatsApp
- `#apagar` — responda (reply) a mensagem que quer apagar
- `#prefixo add|remover <símbolo>` — aceita múltiplos prefixos (#, !, etc)
- `#inatividade on|off|dias <número>` + `#inativos [remover]` — detecta e
  remove membros sem mensagem há X dias (checagem automática a cada 24h)
- `#warn @user`, `#warns @user`, `#resetwarn @user`, `#warnsystem limite <n>`
  — sistema de advertências manuais; remove automaticamente ao atingir o limite
- `#linkgrupo` — gera o link de convite atual
- `#backup` — envia o arquivo de dados do bot como documento no próprio WhatsApp

**⭐ Engajamento**
- `#levelsystem on|off` — sistema de XP por mensagem enviada
- `#level` — mostra seu nível/XP atual
- `#top10` — ranking dos membros mais ativos
- `#autosticker on|off` — converte toda imagem enviada em figurinha automaticamente
- `#autoresposta on|off|add|remover|lista` — resposta automática por palavra-chave
- `#enquete Pergunta | Opção 1 | Opção 2` — cria uma enquete nativa do WhatsApp
- `#sorteio <segundos> <prêmio>` — sorteia entre quem mandar mensagem na janela de tempo

**⚙️ Geral**
- `#boasvindas on|off|mensagem <texto>`
- `#saida on|off|mensagem <texto>`
- `#menu` / `#menu <categoria>`

## O que NÃO está incluído

- **Anti-figurinha/imagem NSFW**: exigiria uma API externa de moderação de
  conteúdo visual pra detectar automaticamente. Não implementado.

## Estrutura

```
index.js                    -> conexão Baileys + roteamento de eventos
lib/database.js              -> config por grupo (lowdb) + merge automático de defaults
lib/commandLoader.js         -> carrega automaticamente os arquivos de commands/
lib/permissions.js           -> checagem de admin de grupo / admin do bot
lib/activity.js               -> rastreio de última atividade (pra inatividade)
lib/inactivityChecker.js      -> cálculo de quem está inativo
lib/xp.js                     -> sistema de level/XP
lib/warns.js                  -> sistema de advertências
lib/floodTracker.js           -> controle de flood de figurinhas (em memória)
lib/spamTracker.js            -> controle de mensagem repetida (em memória)
lib/similarity.js             -> comparação de nomes (anti-clone)
lib/anticlone.js               -> lógica do anti-clone
lib/messageCache.js            -> cache de mensagens recentes (pro x9)
middlewares/moderation.js     -> todas as regras automáticas, roda antes dos comandos
commands/*.js                 -> cada comando é um plugin isolado
```

## Criando um novo comando

Crie um arquivo em `commands/`, exportando:

```js
module.exports = {
  name: 'meucomando',
  aliases: ['mc'],       // opcional
  adminOnly: true,        // opcional
  async execute({ sock, groupId, args, reply }) {
    return reply('resposta');
  }
};
```

Ele é carregado automaticamente, sem precisar registrar em nenhum outro lugar.

## Rodando 100% no Railway (sem depender do seu celular/computador ligados)

O WhatsApp multi-dispositivo permite que o bot funcione de forma independente
depois de conectado uma vez — não precisa do celular do número do bot ficar
com internet o tempo todo. Mas a conexão inicial e a persistência da sessão
precisam de configuração:

### 1. Variáveis de ambiente no Railway
- `PHONE_NUMBER` — número do WhatsApp que vai ser o bot, com DDI, só números
  (ex: `5511999998888`). Isso ativa o login por **código de pareamento** em
  vez de QR code, porque não dá pra escanear QR direto do log do Railway.
- `STORAGE_DIR` — caminho onde a sessão e o banco vão ficar salvos. Aponte
  pra dentro do volume persistente (ver item 2). Ex: `/data`

### 2. Volume persistente
No painel do Railway, adicione um **Volume** ao serviço e monte em `/data`
(ou o caminho que você definir em `STORAGE_DIR`). Sem isso, a cada redeploy
o bot perde a sessão (precisa reconectar) e todos os dados salvos (configs,
XP, warns, histórico de atividade).

⚠️ Não tenho confirmação de que Volumes estão disponíveis no plano Hobby —
recomendo checar na documentação atual do Railway antes de montar a
arquitetura em cima disso.

### 3. Primeira conexão
1. Suba o projeto com as variáveis configuradas.
2. Abra os **Logs** do serviço no Railway.
3. Em poucos segundos vai aparecer algo como:
   ```
   CÓDIGO DE PAREAMENTO: ABCD1234
   ```
4. No WhatsApp do número informado em `PHONE_NUMBER`: Configurações >
   Aparelhos conectados > Conectar um aparelho > "Conectar com número de
   telefone" > digite o código.
5. Depois de parear uma vez, a sessão fica salva no volume e o bot reconecta
   sozinho nos próximos redeploys, sem pedir novo código.

### 4. Rodando localmente (sem Railway)
Se preferir testar sem essas variáveis, o comportamento padrão continua o
mesmo de antes: roda `npm start`, aparece QR code no terminal.

```bash
npm install
npm start
```

## Deploy no Railway — checklist geral

1. Suba pro GitHub (`.gitignore` já exclui `auth_info/` e o banco).
2. Conecte o repositório no Railway.
3. Configure `PHONE_NUMBER`, `STORAGE_DIR` e o Volume (seção acima).
4. A lib `sharp` (usada no auto-sticker) às vezes precisa de dependências de
   sistema (libvips) — se o build falhar por causa dela, me avise.
