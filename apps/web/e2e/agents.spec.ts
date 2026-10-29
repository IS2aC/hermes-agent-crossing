import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const states = ['working', 'thinking', 'idle', 'meeting', 'blocked', 'waiting_approval', 'down', 'degraded'] as const;

test('renders all agent states and writes screenshots for the eight-state review artifact', async ({ page }) => {
  await mkdir('../../test-results/agent-states', { recursive: true });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(1200);
  for (const state of states) {
    await page.evaluate((nextState) => {
      window.dispatchEvent(new CustomEvent('crossing:snapshot', { detail: { agents: [{ id: 'e2e-agent', name: 'E2E Agent', state: nextState }] } }));
    }, state);
    await page.waitForTimeout(150);
    await expect(page.locator('canvas')).toBeVisible();
    await page.screenshot({ path: `../../test-results/agent-states/${state}.png`, fullPage: true });
  }
});
