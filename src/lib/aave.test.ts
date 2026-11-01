import { describe, expect, it } from 'vitest';
import { evaluateSupply, evaluateWithdraw, approvalSteps } from './aave';
import { MAX_UINT256 } from './math';
import type { Position, ReserveState } from './aave';
const reserve: ReserveState = { blockNumber: 1n, timestamp: 1n, active: true, frozen: false, paused: false, supplyCap: 100n, borrowCap: 80n, totalSupplyWithTreasury: 90n, liquidity: 50n, liquidityRateRay: 0n };
const position: Position = { blockNumber: 1n, timestamp: 1n, wallet: 100n, supplied: 20n, polWei: 100n, totalDebtBase: 0n, totalCollateralBase: 0n, healthFactor: MAX_UINT256, collateralEnabled: false };
describe('action-specific eligibility', () => {
  it('blocks frozen supply but permits frozen withdrawal', () => {
    expect(evaluateSupply(1n, position, { ...reserve, frozen: true }).reasons).toContain('reserve-frozen');
    expect(evaluateWithdraw(1n, position, { ...reserve, frozen: true }).reasons).toEqual([]);
  });
  it('enforces cap at the exact boundary including treasury', () => {
    expect(evaluateSupply(10n, position, reserve).reasons).toEqual([]);
    expect(evaluateSupply(11n, position, reserve).reasons).toContain('supply-cap');
    expect(evaluateSupply(100n, position, { ...reserve, supplyCap: 0n }).reasons).toEqual([]);
  });
  it('does not apply borrow caps to withdrawal or treat liquidity as the position balance', () => {
    expect(evaluateWithdraw(21n, position, reserve).reasons).toContain('position-balance');
    expect(evaluateWithdraw(20n, position, { ...reserve, liquidity: 19n }).reasons).toContain('reserve-liquidity');
    expect(evaluateWithdraw(MAX_UINT256, position, reserve).amount).toBe(20n);
  });
  it('requires exact simulation when collateral supports existing debt', () => {
    expect(evaluateWithdraw(1n, { ...position, totalDebtBase: 1n, collateralEnabled: true }, reserve).requiresSimulation).toBe(true);
    expect(evaluateWithdraw(1n, { ...position, totalDebtBase: 1n }, reserve).requiresSimulation).toBe(false);
  });
  it('rejects zero, overflow, inactive, paused, insufficient balances and POL', () => {
    expect(evaluateSupply(0n, position, reserve).reasons).toContain('invalid-amount');
    expect(evaluateSupply(MAX_UINT256 + 1n, position, reserve).reasons).toContain('invalid-amount');
    expect(evaluateSupply(101n, position, reserve).reasons).toContain('wallet-balance');
    expect(evaluateWithdraw(1n, position, { ...reserve, active: false, paused: true }).reasons).toEqual(['reserve-inactive', 'reserve-paused']);
    expect(evaluateSupply(1n, { ...position, polWei: 0n }, reserve).reasons).toContain('insufficient-POL');
  });
  it('plans exact approvals and a separate zero reset when needed', () => {
    expect(approvalSteps(0n, 10n)).toEqual([10n]);
    expect(approvalSteps(3n, 10n)).toEqual([0n, 10n]);
    expect(approvalSteps(10n, 10n)).toEqual([]);
    expect(approvalSteps(20n, 10n)).toEqual([]);
    expect(() => approvalSteps(0n, MAX_UINT256)).toThrow();
  });
});
