import { afterEach, describe, expect, it, vi } from 'vitest';

import { readCookie } from './client';

/**
 * O token CSRF depende inteiramente desta leitura: se ela devolver o valor errado,
 * o header X-XSRF-TOKEN não bate com o cookie e TODA requisição mutável passa a
 * receber 403 — falha total e silenciosa do ponto de vista do usuário.
 */
function comCookies(valor: string) {
  vi.stubGlobal('document', { cookie: valor });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readCookie', () => {
  it('lê o cookie quando é o único', () => {
    comCookies('XSRF-TOKEN=abc123');
    expect(readCookie('XSRF-TOKEN')).toBe('abc123');
  });

  it('lê o cookie certo no meio de outros', () => {
    comCookies('auth-token=sessao; XSRF-TOKEN=abc123; outro=x');
    expect(readCookie('XSRF-TOKEN')).toBe('abc123');
  });

  it('não confunde com cookie de nome parecido', () => {
    // Busca por "startsWith" devolveria o valor errado aqui.
    comCookies('XSRF-TOKEN-OLD=obsoleto; XSRF-TOKEN=correto');
    expect(readCookie('XSRF-TOKEN')).toBe('correto');
  });

  it('preserva "=" dentro do valor', () => {
    // Token em base64 termina em "=" com frequência; split('=') puro o truncaria.
    comCookies('XSRF-TOKEN=YWJjZGVm==');
    expect(readCookie('XSRF-TOKEN')).toBe('YWJjZGVm==');
  });

  it('decodifica valor percent-encoded', () => {
    comCookies('XSRF-TOKEN=a%2Bb%2Fc');
    expect(readCookie('XSRF-TOKEN')).toBe('a+b/c');
  });

  it('devolve null quando o cookie não existe', () => {
    comCookies('auth-token=sessao');
    expect(readCookie('XSRF-TOKEN')).toBeNull();
  });

  it('devolve null quando não há cookie algum', () => {
    comCookies('');
    expect(readCookie('XSRF-TOKEN')).toBeNull();
  });

  it('devolve null no servidor, onde não existe document', () => {
    // O client é importado por código que roda em SSR; tocar em document ali
    // lançaria ReferenceError e derrubaria a renderização.
    vi.stubGlobal('document', undefined);
    expect(readCookie('XSRF-TOKEN')).toBeNull();
  });
});
