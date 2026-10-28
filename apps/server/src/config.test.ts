import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('server configuration requirements', () => {
  const required = z.object({ CROSSING_ADMIN_PASSWORD_HASH: z.string().min(1), CROSSING_SESSION_SECRET: z.string().min(32) });
  it('rejects missing credentials', () => expect(required.safeParse({}).success).toBe(false));
  it('accepts configured secrets', () => expect(required.safeParse({ CROSSING_ADMIN_PASSWORD_HASH: 'hash', CROSSING_SESSION_SECRET: 'a'.repeat(32) }).success).toBe(true));
});
