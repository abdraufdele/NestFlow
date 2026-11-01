import { test, expect } from '@playwright/test';
import { installProvider } from './provider';
test('production artifact reads balances but cannot approve, supply or withdraw', async ({ page }) => {
  await installProvider(page); await page.goto('/');
  await expect(page.getByText('Confirmed balances')).toBeVisible();
  await expect(page.getByText(/Mainnet transactions disabled in this build/)).toBeVisible();
  await page.getByLabel('Keep in wallet (USDT)').fill('40');
  await page.getByRole('button', { name: 'Preview supply' }).click();
  await expect(page.getByRole('button', { name: 'Approve 60 USDT', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Supply 60 USDT', exact: true })).toBeDisabled();
  await page.getByLabel('Withdraw amount (USDT)').fill('10');
  await page.getByRole('button', { name: 'Check withdrawal' }).click();
  await expect(page.getByText(/Checks passed as of/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Withdraw 10 USDT', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { mockState: { calls: string[] } }).mockState.calls.includes('eth_sendTransaction'))).toBe(false);
});
