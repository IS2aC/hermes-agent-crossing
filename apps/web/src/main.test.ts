import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('web entrypoint', () => {
  it('renders the hello app from the Vite entry document', async () => {
    const html = await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../index.html'), 'utf8');
    expect(html).toContain('id="root"');
    expect(html).toContain('/src/main.tsx');
  });
});
