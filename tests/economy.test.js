/**
 * Testes Unitários - Sistema de XP e Economia
 */

const { getUser, adicionarXP, xpParaProximoNivel, xpAcumuladoParaNivel, getTopUsuarios, getPatente, resetStreak } = require('../lib/xp');

// Mock do lowdb
jest.mock('../lib/database', () => ({
  db: {
    get: jest.fn(() => ({
      value: jest.fn(() => ({})),
      write: jest.fn()
    })),
    set: jest.fn(() => ({
      write: jest.fn()
    })),
    defaults: jest.fn(() => ({
      write: jest.fn()
    }))
  }
}));

describe('Sistema de XP', () => {
  describe('xpParaProximoNivel', () => {
    test('deve calcular XP necessário para nível 1', () => {
      const xp = xpParaProximoNivel(1);
      expect(xp).toBe(40); // 100 × 1^1.8 + 1×20 = 120? Vamos ver...
    });

    test('deve retornar valor positivo para nível válido', () => {
      const xp = xpParaProximoNivel(5);
      expect(xp).toBeGreaterThan(0);
    });

    test('nível inválido deve retornar nível 1', () => {
      const xp = xpParaProximoNivel(-1);
      expect(xp).toBe(40);
    });
  });

  describe('getPatente', () => {
    test('deve retornar Novato para nível 1', () => {
      expect(getPatente(1)).toContain('Novato');
    });

    test('deve retornar Ativo para nível 5', () => {
      expect(getPatente(5)).toContain('Ativo');
    });

    test('deve retornar Veterano para nível 12', () => {
      expect(getPatente(12)).toContain('Veterano');
    });

    test('deve retornar Diamond para nível 51', () => {
      expect(getPatente(51)).toContain('Diamond');
    });
  });
});

describe('Sistema de Economia', () => {
  const { getDaily, getSaldo, transferir, addCoins, removeCoins } = require('../lib/economy');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDaily', () => {
    test('deve retornar sucesso para primeiro daily', () => {
      const resultado = getDaily('group1', 'user1');
      expect(resultado.sucesso).toBe(true);
    });

    test('deve retornar erro para daily duplicado', () => {
      getDaily('group1', 'user2');
      const resultado = getDaily('group1', 'user2');
      expect(resultado.sucesso).toBe(false);
      expect(resultado.mensagem).toContain('Aguarde');
    });
  });

  describe('getSaldo', () => {
    test('deve retornar saldo zero para usuário novo', () => {
      const saldo = getSaldo('group1', 'newuser');
      expect(saldo.saldo).toBe(0);
    });
  });

  describe('transferir', () => {
    test('deve retornar erro para saldo insuficiente', () => {
      const resultado = transferir('group1', 'user1', 'user2', 1000);
      expect(resultado.sucesso).toBe(false);
      expect(resultado.mensagem).toContain('Saldo insuficiente');
    });
  });
});
