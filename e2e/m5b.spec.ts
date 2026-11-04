import { test, expect } from '@playwright/test';
import { installProvider } from './provider';
for (const width of [320, 1120]) for (const route of ['/', '/history', '/independent-exit', '/diagnostics']) {
  test(`Design and accessibility review ${route} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await installProvider(page, { historyEvents: true }); await page.goto(route);
    await expect(page.getByRole('heading').first()).toBeVisible();
    if (route !== '/diagnostics') await expect(page.getByText('Confirmed balances', { exact: true })).toBeVisible();
    if (route === '/history') await expect(page.getByRole('link', { name: 'Confirmed transaction' }).first()).toBeVisible();
    if (route === '/') {
      await page.getByRole('button', { name: 'Preview supply', exact: true }).click();
      await expect(page.getByText('Supply preview', { exact: true })).toBeVisible();
      await page.getByLabel('Withdraw amount (USDT)').fill('1');
      await page.getByRole('button', { name: 'Check withdrawal', exact: true }).click();
      await expect(page.locator('#withdraw-result')).toContainText('Checks passed as of');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const button of await page.getByRole('button').all()) {
      const box = await button.boundingBox(); if (box) expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: `docs/m5b-${route.replaceAll('/', '') || 'overview'}-${width}.png`, fullPage: true });
  });
}
test('Design and accessibility review disconnected primary, keyboard focus and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 }); await page.goto('/');
  const connect = page.getByRole('button', { name: 'Connect wallet' });
  await expect(connect).not.toHaveClass(/secondary/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Room to spend.');
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to balances' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Skip to balances' })).toHaveCSS('outline-style', 'solid');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(connect).toHaveCSS('transition-duration', '0s');
  await page.screenshot({ path: 'docs/m5b-disconnected.png', fullPage: true });
});
test('Design and accessibility review error and empty states remain readable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await installProvider(page, { historyFailed: true, cash: '0', supplied: '0' }); await page.goto('/history');
  await expect(page.getByRole('alert')).toContainText('Confirmed history unavailable');
  await expect(page.getByText('No supplied USDT yet.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/m5b-error-empty.png', fullPage: true });
});
