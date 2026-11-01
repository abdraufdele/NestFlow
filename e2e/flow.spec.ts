import { test, expect, type Page } from '@playwright/test';
import { installProvider, type MockOptions } from './provider';
async function open(page: Page, options: MockOptions = {}) {
  await installProvider(page, options); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
}
async function preview(page: Page) {
  await page.getByLabel('Keep in wallet (USDT)').fill('40');
  await page.getByRole('button', { name: 'Preview supply' }).click();
  await expect(page.getByText('Supply preview', { exact: true })).toBeVisible();
}
test('launch order, live split, separate approval/supply, partial withdrawal', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => (window as unknown as { mockState: { calls: string[] } }).mockState.calls.slice(0, 5))).toEqual(['eth_requestAccounts', 'eth_chainId', 'wallet_switchEthereumChain', 'eth_accounts', 'eth_chainId']);
  await page.getByLabel('Keep in wallet (USDT)').fill('40');
  await expect(page.getByTestId('proposed-wallet')).toHaveText('40 USDT');
  await expect(page.getByTestId('proposed-earning')).toHaveText('80 USDT');
  await preview(page);
  await page.getByRole('button', { name: 'Approve 60 USDT', exact: true }).click();
  await expect(page.getByText('Approval confirmed. No USDT supplied yet.')).toBeVisible();
  await expect(page.getByTestId('confirmed-earning')).toHaveText('20 USDT');
  await page.getByRole('button', { name: 'Supply 60 USDT', exact: true }).click();
  await expect(page.getByText('Supply confirmed.')).toBeVisible();
  await expect(page.getByTestId('confirmed-earning')).toHaveText('80 USDT');
  await page.getByLabel('Withdraw amount (USDT)').fill('10');
  await page.getByRole('button', { name: 'Check withdrawal' }).click();
  await expect(page.getByText(/Checks passed as of/)).toBeVisible();
  await page.getByRole('button', { name: 'Withdraw 10 USDT', exact: true }).click();
  await expect(page.getByText('Withdrawal confirmed.')).toBeVisible();
  await expect(page.getByTestId('confirmed-wallet')).toHaveText('50 USDT');
  expect(await page.evaluate(() => (window as unknown as { mockState: { writes: number } }).mockState.writes)).toBe(3);
});
for (const [name, options, message] of [
  ['missing POL', { pol: '0' }, 'Missing POL'],
  ['wrong chain', { wrongChain: true }, 'Wrong chain'],
  ['connect rejection', { rejectConnect: true }, 'Rejected'],
  ['switch rejection', { rejectSwitch: true }, 'Rejected'],
  ['stale read', { stale: true }, 'Current balances unavailable'],
  ['failed read', { failedRead: true }, 'Failed'],
  ['wrong decimals', { decimals: 18 }, 'decimals'],
] as [string, MockOptions, string][]) test(name, async ({ page }) => {
  await installProvider(page, options); await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: message }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Approve / })).toHaveCount(0);
});
test('provider missing is unavailable, never a zero balance', async ({ page }) => {
  await page.goto('/'); await expect(page.getByText(/Open in Nimiq Pay/)).toBeVisible();
  await expect(page.getByTestId('confirmed-wallet')).toHaveCount(0);
});
test('empty position and zero funds have designed empty states', async ({ page }) => {
  await open(page, { cash: '0', supplied: '0' });
  await expect(page.getByText('No supplied USDT yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Preview supply' }).click();
  await expect(page.getByText(/Enter a wallet target below/)).toBeVisible();
});
test('invalid amounts, decimals and holding period stay local', async ({ page }) => {
  await open(page);
  for (const value of ['-1', '1.0000001', '1e3', '', '121']) {
    await page.getByLabel('Keep in wallet (USDT)').fill(value);
    await page.getByRole('button', { name: 'Preview supply' }).click();
    await expect(page.locator('#preference-error')).not.toBeEmpty();
  }
  await page.getByLabel('Keep in wallet (USDT)').fill('40');
  await page.getByLabel('Holding period (days)').fill('0');
  await page.getByRole('button', { name: 'Preview supply' }).click();
  await expect(page.locator('#days-error')).not.toBeEmpty();
  await page.getByLabel('Withdraw amount (USDT)').fill('21');
  await page.getByRole('button', { name: 'Check withdrawal' }).click();
  await expect(page.getByText(/amount exceeds your supplied balance/)).toBeVisible();
  await page.getByLabel('Withdraw amount (USDT)').fill('0.0000001');
  await page.getByRole('button', { name: 'Check withdrawal' }).click();
  await expect(page.locator('#withdraw-error')).not.toBeEmpty();
});
test('restricted supply and withdrawal are blocked', async ({ page }) => {
  await open(page, { paused: true }); await preview(page);
  await expect(page.getByText(/reserve is paused/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Approve / })).toBeDisabled();
  await page.getByLabel('Withdraw amount (USDT)').fill('1');
  await page.getByRole('button', { name: 'Check withdrawal' }).click();
  await expect(page.locator('#withdraw-result')).toContainText('reserve is paused');
});
test('withdrawal liquidity and simulation failures', async ({ page }) => {
  await open(page, { liquidity: '0' });
  await page.getByLabel('Withdraw amount (USDT)').fill('1');
  await page.getByRole('button', { name: 'Check withdrawal' }).click();
  await expect(page.locator('#withdraw-result')).toContainText('reserve has insufficient USDT');
});
test('simulation failures do not send', async ({ page }) => {
  await open(page, { simulationFailed: true });
  await page.getByLabel('Withdraw amount (USDT)').fill('1');
  await page.getByRole('button', { name: 'Check withdrawal' }).click();
  await expect(page.locator('#withdraw-result')).toContainText('withdrawal simulation failed');
});
for (const kind of ['account', 'chain']) test(kind + ' change clears balances and previews', async ({ page }) => {
  await open(page); await preview(page);
  await page.evaluate(kind => (window as unknown as { mockChange: (kind: string) => void }).mockChange(kind), kind);
  await expect(page.getByText(/Account or chain changed/)).toBeVisible();
  await expect(page.getByTestId('confirmed-wallet')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Approve / })).toHaveCount(0);
});
test('eventless identity change detected before send', async ({ page }) => {
  await open(page, { noEvents: true }); await preview(page);
  await page.evaluate(() => (window as unknown as { mockChange: (s: string) => void }).mockChange('account'));
  await page.getByRole('button', { name: 'Approve 60 USDT', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /Account changed/ }).first()).toBeVisible();
});
test('rejection after approval leaves approval separate and retry explicit', async ({ page }) => {
  await open(page); await preview(page);
  await page.getByRole('button', { name: 'Approve 60 USDT', exact: true }).click();
  await expect(page.getByText('Approval confirmed. No USDT supplied yet.')).toBeVisible();
  await page.evaluate(() => { (window as unknown as { mockState: { rejectSend: boolean } }).mockState.rejectSend = true; });
  await page.getByRole('button', { name: 'Supply 60 USDT', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Rejected' }).first()).toBeVisible();
  await expect(page.getByTestId('confirmed-earning')).toHaveText('20 USDT');
});
test('pending/reload, duplicate click and receipt reconciliation never resend', async ({ page }) => {
  await open(page, { pending: true }); await preview(page);
  const approve = page.getByRole('button', { name: 'Approve 60 USDT', exact: true });
  await approve.dblclick({ force: true });
  await expect(page.getByRole('status').filter({ hasText: 'Submitted' }).first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { mockState: { writes: number } }).mockState.writes)).toBe(1);
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: /Unresolved approve/ })).toBeVisible();
  await preview(page); await expect(page.getByRole('button', { name: /^Supply / })).toBeDisabled();
});
test('receipt revert is failed, not confirmed', async ({ page }) => {
  await open(page, { reverted: true }); await preview(page);
  await page.getByRole('button', { name: 'Approve 60 USDT', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Failed: transaction reverted' }).first()).toBeVisible();
});
test('nonzero insufficient POL is caught by estimated cost preflight', async ({ page }) => {
  await open(page, { lowPol: true }); await preview(page);
  await expect(page.getByText(/Insufficient POL for estimated entry/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Approve / })).toBeDisabled();
});
test('refresh clears failed reads; keyboard and narrow layout work', async ({ page }) => {
  await open(page); await page.getByLabel('Spending preference slider').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Keep in wallet (USDT)')).not.toHaveValue('0');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Refresh balances' }).click();
  await expect(page.getByText('Confirmed balances')).toBeVisible();
});
