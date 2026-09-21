/**
 * Jogo Bigphone (Telefone Tocando)
 * 
 * O bot envia uma mensagem de "telefone tocando" em horários aleatórios.
 * A primeira pessoa que responder ganha um prêmio OU recebe um castigo.
 * 
 * Prêmios: +50 a +500 coins
 * Castigos: -10 a -200 coins
 */

const { db } = require('./database');

const MENSAGENS_TOQUE = [
  '📞 *TRIM TRIM TRIM* 📞\n\nAlguém atende o telefone?!',
  '📱 *Briiiim Briiiim* 📱\n\nTelefone tocando! Atende aí!',
  '☎️ *Ring Ring Ring* ☎️\n\nAlguém vai atender?!',
  '📞 *Pssssssss* 📞\n\nTelefone tocando! Primeira pessoa que falar ganha!',
  '🔔 *Blim Blim Blim* 🔔\n\nTelefone tocando! Corre lá!',
  '📱 *Vruuuum Vruuuum* 📱\n\nAlguém atende?!',
  '☎️ *Trrrriim Trrrriim* ☎️\n\nTelefone! Atende primeiro!',
  '📞 *Briim Briim Briim* 📞\n\nTelefone tocando! Quem vai atender?!'
];

const PREMIOS = [50, 75, 100, 125, 150, 200, 250, 300, 400, 500];
const CASTIGOS = [-10, -20, -30, -50, -75, -100, -150, -200];

let jogoAtivo = false;
let ultimoToque = 0;
let grupoAtivo = null;
let aguardandoResposta = false;

function iniciarBigphone(sock, groupId) {
  grupoAtivo = groupId;
  jogoAtivo = true;
  
  console.log('[bigphone] Jogo ativado para grupo:', groupId);
  
  // Enviar primeiro toque após 10 segundos
  setTimeout(() => enviarToque(sock, groupId), 10000);
  
  // Continuar enviando toques a cada 30-120 segundos
  setInterval(() => {
    if (!jogoAtivo) return;
    
    // Delay aleatório entre 30-120 segundos
    const delay = Math.floor(Math.random() * 90000) + 30000;
    
    setTimeout(() => {
      if (jogoAtivo) {
        enviarToque(sock, groupId);
      }
    }, delay);
  }, 120000);
}

function pararBigphone() {
  jogoAtivo = false;
  aguardandoResposta = false;
  console.log('[bigphone] Jogo desativado');
}

async function enviarToque(sock, groupId) {
  if (!jogoAtivo || aguardandoResposta) return;
  
  // Verificar se passou tempo suficiente desde o último toque (mínimo 30s)
  if (Date.now() - ultimoToque < 30000) return;
  
  aguardandoResposta = true;
  ultimoToque = Date.now();
  
  // Escolher mensagem aleatória
  const mensagem = MENSAGENS_TOQUE[Math.floor(Math.random() * MENSAGENS_TOQUE.length)];
  
  try {
    await sock.sendMessage(groupId, { text: mensagem });
    console.log('[bigphone] Toque enviado para', groupId);
  } catch (e) {
    console.error('[bigphone] Erro ao enviar toque:', e.message);
    aguardandoResposta = false;
  }
}

async function processarResposta(sock, groupId, senderId) {
  if (!jogoAtivo || !aguardandoResposta || groupId !== grupoAtivo) return;
  
  // Marcar que não está mais aguardando
  aguardandoResposta = false;
  
  // Sortear se é prêmio ou castigo (60% prêmio, 40% castigo)
  const ehPremio = Math.random() < 0.6;
  
  let valor;
  let mensagem;
  
  if (ehPremio) {
    // Sortear prêmio
    valor = PREMIOS[Math.floor(Math.random() * PREMIOS.length)];
    
    // Adicionar coins
    const { addCoins } = require('./economy');
    addCoins(groupId, senderId, valor);
    
    mensagem = `🎉 *BIGPHONE!* 📞\n\n` +
               `@${senderId.split('@')[0]} foi o primeiro a atender!\n\n` +
               `💰 Prêmio: *+${valor} coins*`;
  } else {
    // Sortear castigo
    valor = CASTIGOS[Math.floor(Math.random() * CASTIGOS.length)];
    
    // Remover coins
    const { removeCoins, getSaldo } = require('./economy');
    const saldo = getSaldo(groupId, senderId);
    
    // Não deixar saldo negativo
    const valorReal = Math.abs(valor);
    const valorDescontar = Math.min(valorReal, saldo.saldo);
    
    if (valorDescontar > 0) {
      removeCoins(groupId, senderId, valorDescontar);
    }
    
    mensagem = `💀 *BIGPHONE!* 📞\n\n` +
               `@${senderId.split('@')[0]} atendeu o telefone...\n\n` +
               `😱 Castigo: *-${valorDescontar} coins*`;
  }
  
  try {
    await sock.sendMessage(groupId, {
      text: mensagem,
      mentions: [senderId]
    });
    console.log(`[bigphone] ${ehPremio ? 'Prêmio' : 'Castigo'} de ${valor} para ${senderId}`);
  } catch (e) {
    console.error('[bigphone] Erro ao enviar resultado:', e.message);
  }
}

module.exports = {
  iniciarBigphone,
  pararBigphone,
  processarResposta,
  isJogoAtivo: () => jogoAtivo,
  isAguardandoResposta: () => aguardandoResposta
};
