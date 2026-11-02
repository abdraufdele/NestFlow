import { expect, it, vi } from 'vitest';
import { zeroAddress, type PublicClient } from 'viem';
import { readPolQuote } from './quote';
import { DOCUMENTED, PRICE_ADDRESSES } from '../config/aave';
function mock(overrides: Record<string, unknown> = {}) {
  const readContract = vi.fn(async ({ functionName, args, address }: { functionName: string; args?: string[]; address?: string }) => {
    if (functionName in overrides) return overrides[functionName];
    if (functionName === 'getPriceOracle') return PRICE_ADDRESSES.oracle;
    // Distinct feed identities in this RPC fixture.
    if (functionName === 'getSourceOfAsset') return args?.[0] === PRICE_ADDRESSES.wpol ? PRICE_ADDRESSES.wpol : DOCUMENTED.underlying;
    if (functionName === 'latestRoundData' && address === DOCUMENTED.underlying && overrides.usdtUnsupported) throw new Error('latestRoundData unsupported');
    if (functionName === 'BASE_CURRENCY') return zeroAddress;
    if (functionName === 'BASE_CURRENCY_UNIT') return 100_000_000n;
    if (functionName === 'latestRoundData') return [1n, 100_000_000n, 1n, BigInt(Math.floor(Date.now()/1000)), 1n];
    if (functionName === 'getAssetPrice') return args?.[0] === PRICE_ADDRESSES.wpol ? 25_000_001n : 99_999_999n;
  });
  return { getChainId: async () => 137, getBlock: async () => ({ number: 100n, timestamp: BigInt(Math.floor(Date.now() / 1000)) }), readContract };
}
it('uses both asset prices at one observed block and rounds quote up', async () => {
  const client = mock(); const result = await readPolQuote(client as unknown as PublicClient);
  expect(result.usdtPerPol).toBe(250001n);
  expect(result.feedAgeWarnings).toEqual([]);
  expect(result.usdtUpdatedAt).toBeGreaterThan(0n);
  expect(client.readContract.mock.calls.every(([args]) => 'blockNumber' in args && args.blockNumber === 100n)).toBe(true);
});
it.each([{ getAssetPrice: 0n }, { getSourceOfAsset: zeroAddress }, { BASE_CURRENCY_UNIT: 1n }, { getPriceOracle: zeroAddress }])('rejects unsupported or unavailable price: %o', async overrides => {
  await expect(readPolQuote(mock(overrides) as unknown as PublicClient)).rejects.toThrow();
});

it.each([0n, BigInt(Math.floor(Date.now()/1000)) - 3601n, BigInt(Math.floor(Date.now()/1000)) + 100n])('rejects invalid or stale source update %s despite a fresh read block', async updatedAt => {
  await expect(readPolQuote(mock({ latestRoundData: [1n, 1n, 1n, updatedAt, 1n] }) as unknown as PublicClient)).rejects.toThrow(/feed/i);
});
it('rejects a feed whose latest round could not be read', async () => {
  const client = mock(); const original = client.readContract.getMockImplementation()!;
  client.readContract.mockImplementation(async args => { if (args.functionName === 'latestRoundData') throw new Error('feed unavailable'); return original(args); });
  await expect(readPolQuote(client as unknown as PublicClient)).rejects.toThrow(/feed/i);
});

it('keeps same-block oracle conversion available when USDT latestRoundData is unsupported, with explicit age metadata', async () => {
  const client = mock({ usdtUnsupported: true });
  const quote = await readPolQuote(client as unknown as PublicClient);
  expect(quote.usdtPerPol).toBe(250001n);
  expect(quote.usdtUpdatedAt).toBeNull();
  expect(quote.feedAgeWarnings).toEqual(['USDT price feed age unverified']);
  expect(client.readContract.mock.calls.every(([args]) => 'blockNumber' in args && args.blockNumber === 100n)).toBe(true);
});
it('still rejects a stale WPOL feed when USDT age is unverified', async () => {
  const client = mock({ usdtUnsupported: true });
  const original = client.readContract.getMockImplementation()!;
  client.readContract.mockImplementation(async args => args.functionName === 'latestRoundData' && args.address === PRICE_ADDRESSES.wpol
    ? [1n, 1n, 1n, BigInt(Math.floor(Date.now() / 1000)) - 3601n, 1n] : original(args));
  await expect(readPolQuote(client as unknown as PublicClient)).rejects.toThrow(/feed/i);
});
