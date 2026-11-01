import { expect, it, vi } from 'vitest';
import { zeroAddress, type PublicClient } from 'viem';
import { readPolQuote } from './quote';
import { PRICE_ADDRESSES } from '../config/aave';
function mock(overrides: Record<string, unknown> = {}) {
  const readContract = vi.fn(async ({ functionName, args }: { functionName: string; args?: string[] }) => {
    if (functionName in overrides) return overrides[functionName];
    if (functionName === 'getPriceOracle' || functionName === 'getSourceOfAsset') return PRICE_ADDRESSES.oracle;
    if (functionName === 'BASE_CURRENCY') return zeroAddress;
    if (functionName === 'BASE_CURRENCY_UNIT') return 100_000_000n;
    if (functionName === 'getAssetPrice') return args?.[0] === PRICE_ADDRESSES.wpol ? 25_000_001n : 99_999_999n;
  });
  return { getChainId: async () => 137, getBlock: async () => ({ number: 100n, timestamp: BigInt(Math.floor(Date.now() / 1000)) }), readContract };
}
it('uses both asset prices at one observed block and rounds quote up', async () => {
  const client = mock(); const result = await readPolQuote(client as unknown as PublicClient);
  expect(result.usdtPerPol).toBe(250001n);
  expect(client.readContract.mock.calls.every(([args]) => 'blockNumber' in args && args.blockNumber === 100n)).toBe(true);
});
it.each([{ getAssetPrice: 0n }, { getSourceOfAsset: zeroAddress }, { BASE_CURRENCY_UNIT: 1n }, { getPriceOracle: zeroAddress }])('rejects unsupported or unavailable price: %o', async overrides => {
  await expect(readPolQuote(mock(overrides) as unknown as PublicClient)).rejects.toThrow();
});
