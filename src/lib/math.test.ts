import { describe, expect, it } from 'vitest';
import { parseAmount, formatAmount, spendingSplit, supplyableAmount, earningsScenario, feeBreakEvenDays, paymentShortfall, MAX_UINT256, costPreview } from './math';

describe('bigint money boundaries', () => {
  it.each([[0, '1', 1n], [6, '1.000001', 1_000_001n], [18, '0.000000000000000001', 1n]])('parses %i decimals exactly', (decimals, text, expected) => {
    expect(parseAmount(text, decimals)).toBe(expected);
    expect(parseAmount(formatAmount(expected, decimals), decimals)).toBe(expected);
  });
  it('handles zero, maximum, and rejects excess precision without rounding up', () => {
    expect(parseAmount('0', 6)).toBe(0n);
    expect(parseAmount(MAX_UINT256.toString(), 0)).toBe(MAX_UINT256);
    for (const value of ['-1', '1e6', 'NaN', '', ' 1', '0.0000001']) expect(() => parseAmount(value, 6)).toThrow();
    expect(() => parseAmount((MAX_UINT256 + 1n).toString(), 0)).toThrow();
  });
  it('splits wallet funds without counting existing supplied funds as new supply', () => {
    expect(spendingSplit(300_000_000n, 100_000_000n, 50_000_000n)).toEqual({ wallet: 100_000_000n, supply: 200_000_000n, earningAfter: 250_000_000n, withdrawalNeeded: 0n });
    expect(spendingSplit(20n, 50n, 100n)).toEqual({ wallet: 20n, supply: 0n, earningAfter: 100n, withdrawalNeeded: 30n });
    expect(supplyableAmount(10n, 3n, 2n)).toBe(5n);
    expect(supplyableAmount(1n, 5n, 2n)).toBe(0n);
    expect(() => supplyableAmount(-1n, 0n)).toThrow();
  });
  it('floors simple APR earnings and preserves signed net estimates', () => {
    expect(earningsScenario(1_000_000_000n, 500n, 365n, 2_000_000n)).toEqual({ gross: 50_000_000n, net: 48_000_000n });
    expect(earningsScenario(1n, 1n, 1n, 2n)).toEqual({ gross: 0n, net: -2n });
    expect(earningsScenario(MAX_UINT256, 10_000n, 365n).gross).toBe(MAX_UINT256);
    expect(earningsScenario(0n, 0n, 0n).gross).toBe(0n);
  });
  it('rounds break-even days up and returns null when earnings cannot cover fees', () => {
    expect(feeBreakEvenDays(1_000_000_000n, 500n, 1_000_000n)).toBe(8n);
    expect(feeBreakEvenDays(0n, 500n, 1n)).toBeNull();
    expect(feeBreakEvenDays(10n, 0n, 1n)).toBeNull();
    expect(feeBreakEvenDays(0n, 0n, 0n)).toBe(0n);
  });
  it('calculates the uncovered payment and eligible withdrawal separately', () => {
    expect(paymentShortfall(50n, 20n, 10n)).toEqual({ shortfall: 30n, withdrawal: 10n, remaining: 20n });
    expect(paymentShortfall(20n, 50n, 100n)).toEqual({ shortfall: 0n, withdrawal: 0n, remaining: 0n });
  });
  it('keeps POL costs separate unless an explicit quote is supplied', () => {
    expect(costPreview([2n, 3n], 4n)).toEqual({ entryPolWei: 5n, exitPolWei: 4n, totalPolWei: 9n, totalUsdt: null, quote: null });
    expect(costPreview([1n], 0n, { usdtPerPol: 1_000_000n, source: 'fixture', observedAt: 10n }).totalUsdt).toBe(1n);
  });
});
