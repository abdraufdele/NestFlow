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
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/m5a-history.png', fullPage: true });
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

test('stale WPOL feed makes POL quote, net and break-even unavailable but allows withdrawal checks', async ({ page }) => {
  await installProvider(page, { staleFeed: true, usdtFeedUnsupported: true }); await page.goto('/');
  await page.getByRole('button', { name: 'Preview supply', exact: true }).click();
  await expect(page.getByText(/No POL\/USDT conversion quote/)).toContainText('Net earnings and fee break-even are unavailable');
  await page.getByLabel('Withdraw amount (USDT)').fill('1');
  await page.getByRole('button', { name: 'Check withdrawal', exact: true }).click();
  await expect(page.locator('#withdraw-result')).toContainText('Checks passed as of');
});

test('lazy diagnostics loads with the existing provider', async ({ page }) => {
  await installProvider(page); await page.goto('/diagnostics');
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page.getByText('Loading screen…')).toHaveCount(0);
});
test('failed history chunk offers reload while withdrawal checks remain usable', async ({ page }) => {
  await installProvider(page);
  await page.route('**/assets/History-*.js', route => route.abort());
  await page.goto('/history');
  await expect(page.getByRole('alert')).toContainText('This screen could not load');
  await page.getByLabel('Withdraw amount (USDT)').fill('1');
  await page.getByRole('button', { name: 'Check withdrawal', exact: true }).click();
  await expect(page.locator('#withdraw-result')).toContainText('Checks passed as of');
});

test('confirmed Pool events render exact amounts and the Polygon explorer link', async ({ page }) => {
  await installProvider(page, { historyEvents: true }); await page.goto('/history');
  const history = page.getByRole('region', { name: 'Confirmed history' });
  await expect(history.locator('li').nth(0)).toContainText('Supply');
  await expect(history.locator('li').nth(0)).toContainText('10 USDT');
  await expect(history.locator('li').nth(1)).toContainText('Withdrawal');
  await expect(history.locator('li').nth(1)).toContainText('2 USDT');
  await expect(history.getByRole('link', { name: 'Confirmed transaction' }).first()).toHaveAttribute('href', 'https://polygonscan.com/tx/0x' + 'a'.repeat(64));
});

for (const usdtFeedUnsupported of [true, false]) test(`quote restores net and break-even with USDT unsupported=${usdtFeedUnsupported}`, async ({ page }) => {
  await installProvider(page, { usdtFeedUnsupported, allowance: '100000000' }); await page.goto('/');
  await page.getByRole('button', { name: 'Preview supply', exact: true }).click();
  const quote = page.getByText(/Aave oracle POL\/USDT estimate/);
  await expect(quote).toContainText('0.25 USDT per POL');
  // Fixture fees: 0.000384 POL supply + exit = 0.000192 USDT, rounded up.
  await expect(quote).toContainText('Net return estimate: 0.410766 USDT');
  await expect(quote).toContainText('Fee break-even estimate: 1 days');
  if (usdtFeedUnsupported) await expect(quote).toContainText('USDT price feed age unverified');
  else await expect(quote).not.toContainText('USDT price feed age unverified');
  if (usdtFeedUnsupported) {
    await page.setViewportSize({ width: 320, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'docs/pol-quote-age-unverified.png', fullPage: true });
  }
});
test('zero oracle price keeps quote unavailable despite unverified USDT age', async ({ page }) => {
  await installProvider(page, { zeroQuotePrice: true, usdtFeedUnsupported: true }); await page.goto('/');
  await page.getByRole('button', { name: 'Preview supply', exact: true }).click();
  await expect(page.getByText(/No POL\/USDT conversion quote/)).toBeVisible();
});
