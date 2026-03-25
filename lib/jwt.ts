import crypto from 'crypto';

export interface JwtPayload {
  id: string;
  role: 'admin' | 'servidor';
  exp: number; //timestamp
}

const secret = process.env.JWT_SECRET || 'secret';

function base64url(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function encode(payload: object, secret: string, expiresInSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payloadStr = JSON.stringify({ ...payload, exp });
  const body = base64url(payloadStr);
  const data = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${signature}`;
}

function decode(token: string, secret: string): JwtPayload | null {
  const [headerB64, payloadB64, signature] = token.split('.');
  const data = `${headerB64}.${payloadB64}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  if (signature !== expectedSignature) return null;

  const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf-8');
  const payload: JwtPayload = JSON.parse(payloadJson);

  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}
// 2 horas .:. 7200 segundos
export function signJwt(payload: Omit<JwtPayload, 'exp'>, expiresIn = 7200): string {
  return encode(payload, secret, expiresIn);
}

export function verifyJwt(token: string): JwtPayload | null {
  return decode(token, secret);
}
