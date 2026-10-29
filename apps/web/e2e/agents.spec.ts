import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const states = ['working', 'thinking', 'idle', 'meeting', 'blocked', 'waiting_approval', 'down', 'degraded'] as const;
const ICONS: Partial<Record<(typeof states)[number], string>> = { blocked: '!', waiting_approval: '?', down: '✕' };

interface WorldAgent { id: string; name: string; state: string; icon: string; alpha: number; onScreen: boolean }
type World = { agents: () => WorldAgent[]; focus: (id: string) => void };

const worldAgents = (page: Page) => page.evaluate(() => (window as unknown as { __crossingWorld: World }).__crossingWorld.agents());
const agent = async (page: Page, id: string) => (await worldAgents(page)).find((a) => a.id === id);
const snapshot = (page: Page, detail: unknown) => page.evaluate((d) => window.dispatchEvent(new CustomEvent('crossing:snapshot', { detail: d })), detail);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => '__crossingWorld' in window)).toBe(true);
});

test('starts with the demo crew in distinct states', async ({ page }) => {
  const crew = await worldAgents(page);
  expect(crew.map((a) => a.name)).toEqual(['Mira', 'Atlas', 'Nova', 'Quinn', 'Echo', 'Sage']);
  expect(new Set(crew.map((a) => a.state)).size).toBe(6);
});

test('renders all eight agent states with the right markers', async ({ page }) => {
  await mkdir('../../test-results/agent-states', { recursive: true });
  await snapshot(page, { agents: [{ id: 'e2e-agent', name: 'E2E Agent', state: 'working' }] });
  await expect.poll(() => agent(page, 'e2e-agent')).toMatchObject({ name: 'E2E Agent', state: 'working' });
  await page.evaluate(() => (window as unknown as { __crossingWorld: World }).__crossingWorld.focus('e2e-agent'));

  for (const state of states) {
    await snapshot(page, { agents: [{ id: 'e2e-agent', name: 'E2E Agent', state }] });
    await expect.poll(() => agent(page, 'e2e-agent')).toMatchObject({ state, icon: ICONS[state] ?? '', alpha: state === 'degraded' ? 0.6 : 1, onScreen: true });
    await page.screenshot({ path: `../../test-results/agent-states/${state}.png` });
  }
});

test('ignores invalid snapshot rows without disturbing existing agents', async ({ page }) => {
  await snapshot(page, { agents: [{ id: 'e2e-agent', state: 'blocked' }] });
  await expect.poll(() => agent(page, 'e2e-agent')).toMatchObject({ state: 'blocked' });
  const before = (await worldAgents(page)).length;
  await snapshot(page, { agents: [{ id: 'e2e-agent', state: 'exploded' }, { state: 'working' }] });
  await snapshot(page, 'not-a-snapshot');
  expect(await agent(page, 'e2e-agent')).toMatchObject({ state: 'blocked' });
  expect((await worldAgents(page)).length).toBe(before);
});

test('accepts the compact status map form', async ({ page }) => {
  await snapshot(page, { status: { atlas: 'down' } });
  await expect.poll(() => agent(page, 'atlas')).toMatchObject({ state: 'down', icon: '✕' });
});
