import { test, expect } from '@playwright/test';
import { installProvider } from './provider';
test('confirmed history separates balances, empty window, forecasts and earnings without sends', async ({ page }) => {
  await installProvider(page); await page.goto('/history');
  const history = page.getByRole('region', { name: 'Confirmed history' });
  await expect(history).toContainText('20 USDT');
  await expect(history).toContainText('Incomplete lifetime history');
  await expect(history).toContainText('Reconstructed earnings: unavailable');
  await expect(history).toContainText('No confirmed supplies or withdrawals found in this window');
  const downloadPromise = page.waitForEvent('download');
  await history.getByRole('button', { name: 'Export confirmed events CSV' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('nestflow-confirmed-events.csv');
  expect(await page.evaluate(() => (window as unknown as { mockState: { writes: number } }).mockState.writes)).toBe(0);
});
test('history failure preserves withdrawal access and retry', async ({ page }) => {
  await installProvider(page, { historyFailed: true }); await page.goto('/history');
  await expect(page.getByRole('alert')).toContainText('Confirmed history unavailable');
  await expect(page.getByRole('button', { name: 'Retry history' })).toBeEnabled();
  await page.getByLabel('Withdraw amount (USDT)').fill('1');
  await page.getByRole('button', { name: 'Check withdrawal', exact: true }).click();
  await expect(page.locator('#withdraw-result')).toContainText('Checks passed as of');
});
