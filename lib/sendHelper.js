async function enviarRespostaLonga(sock, groupId, resposta, quoted) {
  // WhatsApp tem limite de ~4000 caracteres por mensagem
  const LIMITE = 3800;
  
  if (resposta.length <= LIMITE) {
    await sock.sendMessage(groupId, { text: resposta }, { quoted });
    return;
  }
  
  // Dividir em partes
  const partes = [];
  let resto = resposta;
  
  while (resto.length > 0) {
    if (resto.length <= LIMITE) {
      partes.push(resto);
      break;
    }
    
    // Cortar no último parágrafo ou linha
    let corte = resto.lastIndexOf('\n\n', LIMITE);
    if (corte === -1) corte = resto.lastIndexOf('. ', LIMITE);
    if (corte === -1) corte = LIMITE;
    
    partes.push(resto.substring(0, corte + 1));
    resto = resto.substring(corte + 1).trim();
  }
  
  for (let i = 0; i < partes.length; i++) {
    const texto = partes.length > 1 
      ? `${partes[i]}\n\n(${i + 1}/${partes.length})`
      : partes[i];
    await sock.sendMessage(groupId, { text: texto }, { quoted });
  }
}
