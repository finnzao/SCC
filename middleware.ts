import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/invite',
  '/cadastro',
  '/ativar-conta',
  '/setup',
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/img')) return true;
  if (pathname.startsWith('/public')) return true;
  const ext = pathname.split('.').pop();
  if (ext && ['ico', 'png', 'jpg', 'jpeg', 'svg', 'css', 'js', 'woff', 'woff2', 'ttf', 'map'].includes(ext)) return true;
  return false;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Decodifica uma string base64url para bytes.
 *
 * O retorno é tipado explicitamente como `Uint8Array<ArrayBuffer>` (e não o
 * `Uint8Array<ArrayBufferLike>` inferido por `new Uint8Array(length)`) porque
 * a Web Crypto API (`crypto.subtle.verify`, `.digest`, etc.) exige `BufferSource`
 * apoiado em `ArrayBuffer` — `SharedArrayBuffer` não é um `ArrayBuffer` válido
 * para essas chamadas. Alocar via `new ArrayBuffer(n)` e envolver com `Uint8Array`
 * garante esse tipo na origem, sem casts espalhados pelos pontos de uso.
 */
function base64UrlParaBytes(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const comPadding = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
  const binario = atob(comPadding);
  const buffer = new ArrayBuffer(binario.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/**
 * Verifica assinatura HS256 + expiração. Antes daqui só se checava se o cookie EXISTIA,
 * então `document.cookie='auth-token=x'` no console já liberava o /dashboard.
 *
 * O algoritmo é fixado em HS256 e o campo `alg` do cabeçalho NUNCA é usado para escolher
 * a verificação — é assim que se evita algorithm confusion (`alg: none`, troca HS/RS).
 * Web Crypto é nativo no runtime Edge: nenhuma dependência nova.
 */
async function tokenValido(token: string, secret: string): Promise<boolean> {
  const partes = token.split('.');
  if (partes.length !== 3) return false;
  const [cabecalho, payload, assinatura] = partes;

  try {
    if (JSON.parse(decoder.decode(base64UrlParaBytes(cabecalho)))?.alg !== 'HS256') return false;

    const chave = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const assinaturaConfere = await crypto.subtle.verify(
      'HMAC',
      chave,
      base64UrlParaBytes(assinatura),
      encoder.encode(`${cabecalho}.${payload}`),
    );
    if (!assinaturaConfere) return false;

    const { exp } = JSON.parse(decoder.decode(base64UrlParaBytes(payload)));
    return typeof exp === 'number' && exp * 1000 > Date.now();
  } catch {
    return false; // token malformado é token inválido
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname) || isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.redirect(new URL('/login', req.url));

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Fail-closed de propósito: sem o segredo não há o que verificar, e degradar para
      // "deixa passar" recriaria em silêncio exatamente a falha que este arquivo corrige.
      console.error('[middleware] JWT_SECRET não configurado — /dashboard bloqueado.');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (!(await tokenValido(token, secret))) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};