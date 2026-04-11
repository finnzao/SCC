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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname) || isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
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
