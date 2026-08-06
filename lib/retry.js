const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

async function withRetry(fn, label) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= MAX_ATTEMPTS) {
        console.error(`[retry] Falha definitiva em ${label}:`, err.message);
        throw err;
      }
      const delay = BASE_DELAY_MS * attempt;
      console.warn(`[retry] Tentativa ${attempt}/${MAX_ATTEMPTS} falhou em ${label}: ${err.message}. Retry em ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

module.exports = { withRetry };
