/**
 * Cache para Gemini API
 * 
 * Evita requisições repetidas à API do Gemini.
 * Cache expira após 5 minutos.
 */

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function get(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() - item.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return item.data;
}

function set(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function clear() {
  cache.clear();
}

function size() {
  return cache.size;
}

module.exports = { get, set, clear, size };
