import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
export interface Session { csrf: string }
export function createSession(secret: string, csrf: string): string {
  const payload = Buffer.from(JSON.stringify({ csrf, expires: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
export function readSession(token: string | undefined, secret: string): Session | undefined {
  if (!token) return undefined;
  const [payload, signature] = token.split('.'); if (!payload || !signature) return undefined;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let actual: Buffer; try { actual = Buffer.from(signature, 'base64url'); } catch { return undefined; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return undefined;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { csrf: string; expires: number }; return data.expires > Date.now() ? { csrf: data.csrf } : undefined; } catch { return undefined; }
}
export function setSessionCookie(reply: FastifyReply, token: string, secure: boolean): void {
  reply.header('set-cookie', `crossing_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure ? '; Secure' : ''}`);
}
export function sessionFromRequest(request: FastifyRequest, secret: string): Session | undefined {
  const cookie = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('crossing_session='));
  return readSession(cookie?.slice('crossing_session='.length), secret);
}
