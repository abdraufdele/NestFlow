import { test, expect } from '@playwright/test';
import { installProvider, type MockOptions } from './provider';
for (const [name, options, detail, passed] of [
  ['liquidity', { liquidity: '0' }, 'Reserve liquidity: 0 USDT', false],
  ['paused', { paused: true }, 'withdrawals are blocked', false],
  ['frozen', { frozen: true }, 'Frozen status alone does not block', true],
  ['debt and collateral', { debtCollateral: true, simulationFailed: true }, 'collateral supports outstanding debt', false],
] as [string, MockOptions, string, boolean][]) test('timestamped diagnostic: ' + name, async ({ page }) => {
  await installProvider(page, options); await page.goto('/');
  await page.getByLabel('Withdraw amount (USDT)').fill('1');
  await page.getByRole('button', { name: 'Check withdrawal', exact: true }).click();
  await expect(page.locator('#withdraw-result')).toContainText(detail);
  await expect(page.locator('#withdraw-result')).toContainText(passed ? 'Checks passed as of' : 'Checks failed as of');
  if (!passed) await expect(page.getByRole('button', { name: 'Withdraw 1 USDT', exact: true })).toBeDisabled();
});
test('manual shortfall handles covered, partial, insufficient and invalid amounts without sending', async ({ page }) => {
  await installProvider(page); await page.goto('/');
  const input = page.getByLabel('Desired payment (USDT)'); const result = page.locator('#shortfall-result');
  await input.fill('100'); await expect(result).toContainText('No withdrawal needed');
  await input.fill('110'); await expect(result).toContainText('Payment shortfall: 10 USDT');
  await expect(result).toContainText('Amount to check for withdrawal: 10 USDT');
  await expect(page.getByRole('button', { name: 'Review suggested withdrawal' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Check shortfall withdrawal', exact: true }).click();
  await expect(result).toContainText('Suggested withdrawal: 10 USDT');
  await page.getByRole('button', { name: 'Review suggested withdrawal' }).click();
  await expect(page.getByLabel('Withdraw amount (USDT)')).toHaveValue('10');
  await expect(page.getByRole('button', { name: 'Withdraw 10 USDT', exact: true })).toHaveCount(0);
  await input.fill('130'); await expect(result).toContainText('Remaining shortfall after that withdrawal: 10 USDT');
  for (const value of ['-1', '1.0000001', '1e3']) { await input.fill(value); await expect(result).toContainText('Enter a nonnegative amount'); }
  expect(await page.evaluate(() => (window as unknown as { mockState: { writes: number } }).mockState.writes)).toBe(0);
});
for (const options of [{ paused: true }, { pol: '0' }, { supplied: '0' }, { liquidity: '0' }]) test('shortfall respects restrictions ' + JSON.stringify(options), async ({ page }) => {
  await installProvider(page, options); await page.goto('/');
  await page.getByLabel('Desired payment (USDT)').fill('110');
  await expect(page.getByRole('button', { name: 'Review suggested withdrawal' })).toHaveCount(0);
  await expect(page.locator('#shortfall-result')).toContainText('10 USDT');
});
test('preferences survive reload and reset explicitly', async ({ page }) => {
  await installProvider(page); await page.goto('/');
  await page.getByLabel('Keep in wallet (USDT)').fill('40'); await page.getByLabel('Holding period (days)').fill('90');
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('nestflow-preferences'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const value = await new Promise<{ days: string }>(resolve => { const r = db.transaction('planning').objectStore('planning').get('inputs'); r.onsuccess = () => resolve(r.result); }); db.close(); return value?.days;
  })).toBe('90');
  await page.reload(); await expect(page.getByLabel('Keep in wallet (USDT)')).toHaveValue('40'); await expect(page.getByLabel('Holding period (days)')).toHaveValue('90');
  await page.evaluate(() => (window as unknown as { mockChange: (kind: string) => void }).mockChange('account'));
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  await expect(page.getByLabel('Keep in wallet (USDT)')).toHaveValue('40');
  await expect(page.getByLabel('Holding period (days)')).toHaveValue('90');
  await page.getByRole('button', { name: 'Reset planning preferences' }).click();
  await expect(page.getByLabel('Keep in wallet (USDT)')).toHaveValue('0');
  await page.reload(); await expect(page.getByLabel('Holding period (days)')).toHaveValue('30');
});
test('independent exit works without a provider and lists sourced contracts', async ({ page }) => {
  await page.goto('/independent-exit');
  await expect(page.getByRole('heading', { name: 'Exit independently through Aave' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aave withdrawal instructions' })).toHaveAttribute('href', 'https://aave.com/help/supplying/withdraw-tokens');
  await expect(page.locator('.exit-addresses')).toContainText('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
  await expect(page.locator('ol')).toContainText('Never share or export a seed phrase');
  await page.screenshot({ path: 'docs/m4-independent-exit.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('quote enables estimates and quote failure leaves withdrawals usable', async ({ page }) => {
  await installProvider(page, { allowance: '100000000' }); await page.goto('/');
  await page.getByRole('button', { name: 'Preview supply', exact: true }).click();
  await expect(page.getByText(/Aave oracle POL\/USDT estimate/)).toContainText('0.25 USDT per POL');
  await expect(page.getByText(/Aave oracle POL\/USDT estimate/)).toContainText('Net return estimate:');
});
test('unavailable quote keeps net unavailable without blocking exit', async ({ page }) => {
  await installProvider(page, { quoteUnavailable: true }); await page.goto('/');
  await page.getByRole('button', { name: 'Preview supply', exact: true }).click();
  await expect(page.getByText(/No POL\/USDT conversion quote/)).toBeVisible();
  await page.getByLabel('Withdraw amount (USDT)').fill('1'); await page.getByRole('button', { name: 'Check withdrawal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Withdraw 1 USDT', exact: true })).toBeEnabled();
});
test('rejection is friendly without a raw code and diagnostics link is absent in bundled build', async ({ page }) => {
  await installProvider(page, { rejectConnect: true }); await page.goto('/');
  await expect(page.getByRole('status').first()).toContainText('Rejected');
  await expect(page.getByRole('status').first()).not.toContainText('4001');
  await expect(page.getByRole('link', { name: 'Diagnostics', exact: true })).toHaveCount(0);
});
test('no stale notice before a connected session; expiration after connection is visible', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('status').first()).not.toContainText('Stale data');
  await installProvider(page); await page.reload();
  await expect(page.getByText('Confirmed balances', { exact: true })).toBeVisible();
  await page.clock.runFor(61_000);
  await expect(page.getByRole('status').first()).toContainText('Stale data');
});

for (const mode of ['repriced', 'cancelled', 'wrong-nonce'] as const) test('replacement recovery: ' + mode, async ({ page }) => {
  await installProvider(page, { pending: true, replacementMode: mode }); await page.goto('/');
  await page.getByLabel('Keep in wallet (USDT)').fill('40');
  await page.getByRole('button', { name: 'Preview supply', exact: true }).click();
  await page.getByRole('button', { name: 'Approve 60 USDT', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reconcile replacement' })).toBeEnabled();
  await page.getByRole('button', { name: 'Reset planning preferences' }).click();
  await expect(page.getByLabel('Replacement transaction hash')).toBeVisible();
  await page.getByLabel('Replacement transaction hash').fill('0x' + 'c'.repeat(64));
  await page.getByRole('button', { name: 'Reconcile replacement' }).click();
  if (mode === 'wrong-nonce') {
    await expect(page.getByRole('status').first()).toContainText('Unverified replacement');
    await expect(page.getByLabel('Replacement transaction hash')).toBeVisible();
  } else {
    await expect(page.getByRole('status').first()).toContainText('Replacement reconciled');
    await expect(page.getByLabel('Transaction recovery')).toContainText(mode === 'repriced' ? 'approve: confirmed' : 'approve: rejected');
  }
  expect(await page.evaluate(() => (window as unknown as { mockState: { writes: number } }).mockState.writes)).toBe(1);
});

test('shortfall does not suggest a withdrawal that fails debt/collateral simulation', async ({ page }) => {
  await installProvider(page, { debtCollateral: true, simulationFailed: true }); await page.goto('/');
  await page.getByLabel('Desired payment (USDT)').fill('110');
  await page.getByRole('button', { name: 'Check shortfall withdrawal', exact: true }).click();
  await expect(page.locator('#shortfall-result')).toContainText('Checks failed as of');
  await expect(page.locator('#shortfall-result')).toContainText('Debt/collateral constraints');
  await expect(page.getByRole('button', { name: 'Review suggested withdrawal' })).toHaveCount(0);
});

test('normal aToken interest accrual does not block a fresh shortfall suggestion', async ({ page }) => {
  await installProvider(page); await page.goto('/');
  await page.getByLabel('Desired payment (USDT)').fill('110');
  await page.evaluate(() => { (window as unknown as { mockState: { supplied: string } }).mockState.supplied = '20000001'; });
  await page.getByRole('button', { name: 'Check shortfall withdrawal', exact: true }).click();
  await expect(page.locator('#shortfall-result')).toContainText('Suggested withdrawal: 10 USDT');
  await expect(page.getByRole('button', { name: 'Review suggested withdrawal' })).toBeVisible();
});
