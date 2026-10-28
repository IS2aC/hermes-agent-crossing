import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('mock fixtures', () => {
  it('loads valid response fixtures from the contract', async () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const health = JSON.parse(await readFile(path.join(root, 'fixtures/api_health_noauth.json'), 'utf8')) as Record<string, unknown>;
    expect(health).toBeTypeOf('object');
  });
});
