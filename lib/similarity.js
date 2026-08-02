/**
 * Distância de Levenshtein simples (número de edições pra transformar a de b).
 */
function distancia(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Retorna true se dois nomes são "parecidos demais" (potencial clone de admin).
 */
function nomesParecidos(nomeA, nomeB) {
  if (!nomeA || !nomeB) return false;
  const a = nomeA.trim().toLowerCase();
  const b = nomeB.trim().toLowerCase();
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  return distancia(a, b) <= 2; // até 2 caracteres de diferença
}

module.exports = { nomesParecidos, distancia };
