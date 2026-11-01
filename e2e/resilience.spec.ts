import { test, expect } from '@playwright/test';
import { installProvider } from './provider';
test('stale timer clears a previously valid snapshot', async ({ page }) => {
  await page.clock.install();
  await installProvider(page); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
  await page.clock.runFor(61_000);
  await expect(page.getByText(/Stale data. Refresh balances/)).toBeVisible();
  await expect(page.getByTestId('confirmed-wallet')).toHaveCount(0);
});
test('account change during slow reads cannot republish the old balance', async ({ page }) => {
  await installProvider(page, { slowRead: true }); await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'Reading balances' })).toBeVisible();
  await page.evaluate(() => (window as unknown as { mockChange: (s: string) => void }).mockChange('account'));
  await expect(page.getByText(/Account or chain changed/)).toBeVisible();
  await expect(page.getByTestId('confirmed-wallet')).toHaveCount(0);
  // Wait for one known outstanding read to finish; no old snapshot may appear.
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('confirmed-wallet')).toHaveCount(0);
});
test('RPC failure clears previous data, refresh recovers, no placeholder zero', async ({ page }) => {
  await installProvider(page); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
  await page.evaluate(() => { (window as unknown as { mockState: { failedRead: boolean } }).mockState.failedRead = true; });
  await page.getByRole('button', { name: 'Refresh balances' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Failed' })).toBeVisible();
  await expect(page.getByTestId('confirmed-wallet')).toHaveCount(0);
  await page.evaluate(() => { (window as unknown as { mockState: { failedRead: boolean } }).mockState.failedRead = false; });
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await expect(page.getByTestId('confirmed-wallet')).toHaveText('100 USDT');
});
test('IndexedDB unavailable disables actions with an honest recovery limitation', async ({ page }) => {
  await installProvider(page);
  await page.addInitScript(() => { indexedDB.open = () => { throw new Error('Storage denied'); }; });
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'IndexedDB unavailable' })).toBeVisible();
  await expect(page.getByTestId('confirmed-wallet')).toHaveCount(0);
});
test('approval 4001 rejection, no automatic retry or supply', async ({ page }) => {
  await installProvider(page, { rejectSend: true }); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
  await page.getByLabel('Keep in wallet (USDT)').fill('40');
  await page.getByRole('button', { name: 'Preview supply' }).click();
  await page.getByRole('button', { name: 'Approve 60 USDT', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Rejected' })).toBeVisible();
  await expect(page.getByTestId('confirmed-earning')).toHaveText('20 USDT');
  expect(await page.evaluate(() => (window as unknown as { mockState: { writes: number } }).mockState.writes)).toBe(0);
});
test('nonzero allowance requires two separate exact approval actions', async ({ page }) => {
  await installProvider(page, { allowance: '1' }); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
  await page.getByLabel('Keep in wallet (USDT)').fill('40');
  await page.getByRole('button', { name: 'Preview supply' }).click();
  await page.getByRole('button', { name: 'Reset approval to 0 USDT', exact: true }).click();
  await expect(page.getByText('Approval confirmed. No USDT supplied yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Supply 60 USDT', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Approve 60 USDT', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Supply 60 USDT', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { mockState: { writes: number } }).mockState.writes)).toBe(2);
});
test('frozen reserve blocks supply while an eligible withdrawal remains available', async ({ page }) => {
  await installProvider(page, { frozen: true }); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
  await page.getByRole('button', { name: 'Preview supply' }).click();
  await expect(page.getByText(/reserve is frozen/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Approve / })).toBeDisabled();
  await page.getByLabel('Withdraw amount (USDT)').fill('10');
  await page.getByRole('button', { name: 'Check withdrawal' }).click();
  await expect(page.getByText(/Checks passed as of/)).toBeVisible();
});
test('above-wallet preference suggests a separate withdrawal without moving a position', async ({ page }) => {
  await installProvider(page); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
  await page.getByLabel('Keep in wallet (USDT)').fill('110');
  await expect(page.getByText(/separate 10 USDT withdrawal/)).toBeVisible();
  await expect(page.getByTestId('confirmed-earning')).toHaveText('20 USDT');
  await expect(page.getByTestId('proposed-earning')).toHaveText('20 USDT');
});
test('tiny earnings warning and keyboard reduced-motion screenshot', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installProvider(page); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
  await page.getByLabel('Keep in wallet (USDT)').fill('99');
  await page.getByLabel('Holding period (days)').fill('1');
  await page.getByRole('button', { name: 'Preview supply' }).click();
  await expect(page.getByText(/Estimated earnings are negligible/)).toBeVisible();
  await expect(page.getByText(/Net earnings and fee break-even are unavailable/)).toBeVisible();
  await page.screenshot({ path: 'docs/m3-mobile.png', fullPage: true });
  await page.getByLabel('Spending preference slider').focus(); await page.keyboard.press('ArrowRight');
  expect(await page.getByLabel('Spending preference slider').evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.split-track > span')!).transitionDuration)).toBe('0s');

});
test('desktop layout and diagnostic sibling load without browser errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await installProvider(page); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
  await page.screenshot({ path: 'docs/m3-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Diagnostics', exact: true }).click();
  await expect(page.getByRole('heading', { name: /NestFlow host diagnostics/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('confirmed approval refreshes a previously unavailable supply fee estimate', async ({ page }) => {
  await installProvider(page); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
  await page.getByLabel('Keep in wallet (USDT)').fill('40');
  await page.getByRole('button', { name: 'Preview supply' }).click();
  await expect(page.locator('.details > div').filter({ hasText: 'Supply estimate' })).toContainText('Unavailable');
  await page.getByRole('button', { name: 'Approve 60 USDT', exact: true }).click();
  await expect(page.getByText('Approval confirmed. No USDT supplied yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Supply 60 USDT', exact: true })).toBeEnabled();
});
