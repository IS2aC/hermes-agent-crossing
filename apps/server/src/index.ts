import { hash, verify } from 'argon2';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

if (process.argv[2] === 'hash-password') {
  const password = process.argv[3];
  if (!password) throw new Error("Usage: node dist/index.js hash-password '<password>'");
  process.stdout.write(`${await hash(password)}\n`);
  process.exit(0);
}

const EnvSchema = z.object({ PORT: z.coerce.number().int().positive().default(8080), CROSSING_ADMIN_PASSWORD_HASH: z.string().min(1), CROSSING_SESSION_SECRET: z.string().min(32), CROSSING_CONFIG_PATH: z.string().default('/data/crossing.config.yaml'), LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace','silent']).default('info') });
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) throw new Error(`Configuration invalide: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
const config = parsed.data;
if (process.env.NODE_ENV !== 'development') {
  try { await verify(config.CROSSING_ADMIN_PASSWORD_HASH, 'configuration-validation-probe'); }
  catch { throw new Error('CROSSING_ADMIN_PASSWORD_HASH must be a valid Argon2 hash outside development'); }
}
try { parse(await readFile(config.CROSSING_CONFIG_PATH, 'utf8')); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error(`crossing.config.yaml invalide: ${(error as Error).message}`); }
const app = Fastify({ logger: { level: config.LOG_LEVEL, redact: ['*.password', '*.secret', '*.apiKey', 'req.headers.authorization', 'req.headers.cookie'] } });
app.get('/healthz', async () => ({ status: 'ok', service: 'crossing', timestamp: new Date().toISOString() }));
const here = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.resolve(here, '../../web/dist');
try { await app.register(fastifyStatic, { root: staticDir, wildcard: false }); }
catch { app.log.warn({ staticDir }, 'web build not found; serving health endpoint only'); }
app.setNotFoundHandler(async (_request, reply) => {
  try { return await reply.type('text/html').send(await readFile(path.join(staticDir, 'index.html'))); }
  catch { return reply.code(404).send({ error: 'Not Found' }); }
});
await app.listen({ port: config.PORT, host: '0.0.0.0' });
