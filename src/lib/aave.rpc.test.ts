import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createPublicClient, createWalletClient, custom, decodeFunctionData, http, type Hash } from 'viem';
import { polygon } from 'viem/chains';
import { DOCUMENTED, resolveAaveConfig } from '../config/aave';
import { poolAbi, tokenAbi } from '../config/abi';
import { approve, supply, withdraw, readPosition, readReserveState, readAllowance, checkWithdrawEligibility, estimatePolCost, type ActionContext } from './aave';
import { openTxStore } from './txStore';
import { MAX_UINT256 } from './math';
const account = '0x1111111111111111111111111111111111111111';
const hash = `0x${'a'.repeat(64)}` as Hash;

/** Mock only external RPC/contract execution; use real viem wallet encoding and IndexedDB. */
async function fixture() {
  const state = { cash: 10_000_000n, supplied: 0n, allowance: 0n, pol: 10n ** 18n, paused: false, debt: 0n, collateral: false, failSimulation: false, changedAccount: false, reject: false, writes: 0, walletVersion: 'anvil/v1' };
  const client = createPublicClient({ chain: polygon, transport: http() });
  vi.spyOn(client, 'getChainId').mockResolvedValue(137);
  vi.spyOn(client, 'getBlockNumber').mockResolvedValue(101n);
  vi.spyOn(client, 'getBlock').mockResolvedValue({ number: 100n, timestamp: 1000n, hash } as Awaited<ReturnType<typeof client.getBlock>>);
  vi.spyOn(client, 'getCode').mockResolvedValue('0x1234');
  vi.spyOn(client, 'getBalance').mockImplementation(async () => state.pol);
  vi.spyOn(client, 'readContract').mockImplementation((async (args: { functionName: string; args?: readonly unknown[] }) => {
    const values: Record<string, unknown> = {
      getPool: DOCUMENTED.pool, getPoolDataProvider: DOCUMENTED.dataProvider, ADDRESSES_PROVIDER: DOCUMENTED.provider,
      getReservesList: [DOCUMENTED.underlying], getReserveTokensAddresses: [DOCUMENTED.aToken, DOCUMENTED.variableDebtToken, DOCUMENTED.variableDebtToken],
      decimals: 6, symbol: 'USDT0', UNDERLYING_ASSET_ADDRESS: DOCUMENTED.underlying, POOL: DOCUMENTED.pool,
      getReserveConfigurationData: [6n, 0n, 0n, 0n, 0n, false, true, false, true, false],
      getPaused: state.paused, getReserveCaps: [1000n, 1000n],
      getReserveData: [0n, 2n, 10_000_000n, 0n, 0n, 5n * 10n ** 25n, 0n, 0n, 0n, 10n ** 27n, 0n, 1000n],
      getReserveNormalizedIncome: 10n ** 27n,
      balanceOf: args.args?.[0] === DOCUMENTED.aToken ? 100_000_000n : state.cash,
      getUserReserveData: [state.supplied, 0n, 0n, 0n, 0n, 0n, 0n, 0n, state.collateral],
      getUserAccountData: [0n, state.debt, 0n, 0n, 0n, MAX_UINT256], allowance: state.allowance,
    };
    if (!(args.functionName in values)) throw new Error(`Unexpected read ${args.functionName}`);
    return values[args.functionName];
  }) as typeof client.readContract);
  vi.spyOn(client, 'simulateContract').mockImplementation((async (request: { functionName: string }) => {
    if (state.failSimulation) throw new Error('Contract reverted');
    return { request, result: request.functionName === 'approve' ? true : 0n };
  }) as unknown as typeof client.simulateContract);
  vi.spyOn(client, 'estimateContractGas').mockResolvedValue(100_000n);
  vi.spyOn(client, 'estimateFeesPerGas').mockResolvedValue({ maxFeePerGas: 2n, maxPriorityFeePerGas: 1n });
  vi.spyOn(client, 'getTransactionReceipt').mockResolvedValue({ status: 'success', blockNumber: 100n, blockHash: hash } as Awaited<ReturnType<typeof client.getTransactionReceipt>>);
  vi.spyOn(client, 'getTransaction').mockRejectedValue(new Error('Broadcast metadata not yet indexed'));
  vi.spyOn(client, 'request').mockResolvedValue('anvil/v1' as never);
  const wallet = createWalletClient({ chain: polygon, transport: custom({ request: async ({ method, params }) => {
    if (method === 'web3_clientVersion') return state.walletVersion;
    if (method === 'eth_accounts') return [state.changedAccount ? DOCUMENTED.pool : account];
    if (method === 'eth_chainId') return '0x89';
    if (method !== 'eth_sendTransaction') throw new Error(`Unexpected wallet method ${method}`);
    if (state.reject) throw { code: 4001, message: 'Rejected' };
    const transaction = (params as [{ data: `0x${string}`; to: string }])[0];
    const decoded = decodeFunctionData({ abi: [...tokenAbi, ...poolAbi], data: transaction.data });
    const args = decoded.args as readonly unknown[];
    if (decoded.functionName === 'approve') {
      if (transaction.to.toLowerCase() !== DOCUMENTED.underlying.toLowerCase() || args[0] !== DOCUMENTED.pool) throw new Error('Wrong approval destination');
      state.allowance = args[1] as bigint;
    } else {
      if (transaction.to.toLowerCase() !== DOCUMENTED.pool.toLowerCase() || args[0] !== DOCUMENTED.underlying || args[2] !== account) throw new Error('Wrong asset/receiver');
      const amount = args[1] === MAX_UINT256 ? state.supplied : args[1] as bigint;
      if (decoded.functionName === 'supply') {
        if (state.allowance < amount) throw new Error('No allowance');
        state.cash -= amount; state.supplied += amount; state.allowance -= amount;
      } else { state.cash += amount; state.supplied -= amount; }
    }
    state.writes++; return hash;
  } }) });
  const store = await openTxStore(`rpc-test-${crypto.randomUUID()}`);
  const context: ActionContext = { client, wallet, account, store, execution: 'local-fork' };
  return { state, client, context, store };
}

describe('viem actions and fresh preflight', () => {
  it('blocks a real Polygon wallet paired with an Anvil read client in local-fork mode', async () => {
    const { context, state, store } = await fixture(); state.walletVersion = 'bor/v1';
    await expect(approve(context, 1n)).rejects.toThrow('Anvil');
    expect(state.writes).toBe(0); store.close();
  });
  it('requires a confirmed zero reset before changing a nonzero approval', async () => {
    const { context, state, store } = await fixture(); state.allowance = 3n;
    await expect(approve(context, 10n)).rejects.toThrow('zero-reset');
    expect(state.allowance).toBe(3n);
    await approve(context, 0n); expect(state.allowance).toBe(0n);
    await approve(context, 10n); expect(state.allowance).toBe(10n); store.close();
  });
  it('encodes exact approve/supply/partial/full withdrawal and reconciles each receipt', async () => {
    const { context, state, client, store } = await fixture();
    const config = await resolveAaveConfig(client);
    await approve(context, 10_000_000n);
    expect(await readAllowance(client, config, account)).toBe(10_000_000n);
    expect((await readPosition(client, config, account)).supplied).toBe(0n);
    expect((await store.get(account, 137))?.status).toBe('submitted');
    await supply(context, 10_000_000n);
    expect(state.cash).toBe(0n); expect(state.supplied).toBe(10_000_000n);
    await withdraw(context, 4_000_000n); expect(state.cash).toBe(4_000_000n);
    await withdraw(context, MAX_UINT256); expect(state.cash).toBe(10_000_000n); expect(state.supplied).toBe(0n);
    expect(state.writes).toBe(4); store.close();
  });
  it('does not send when allowance, POL, reserve or simulation preflight fails', async () => {
    const { context, state, store } = await fixture();
    await expect(supply(context, 1n)).rejects.toThrow('approval');
    state.allowance = 10n; state.pol = 1n;
    await expect(supply(context, 1n)).rejects.toThrow('POL');
    state.pol = 10n ** 18n; state.paused = true;
    await expect(supply(context, 1n)).rejects.toThrow('paused');
    state.paused = false; state.failSimulation = true;
    await expect(supply(context, 1n)).rejects.toThrow('reverted');
    expect(state.writes).toBe(0); expect((await store.get(account, 137))?.status).toBe('idle'); store.close();
  });
  it('rejects stale wallet accounts and preserves wallet rejection state', async () => {
    const { context, state, store } = await fixture(); state.changedAccount = true;
    await expect(approve(context, 1n)).rejects.toThrow('account changed');
    state.changedAccount = false; state.reject = true;
    await expect(approve(context, 1n)).rejects.toBeDefined();
    expect((await store.get(account, 137))?.status).toBe('rejected'); expect(state.writes).toBe(0); store.close();
  });
  it('uses exact withdrawal simulation for a debt-backed collateral position', async () => {
    const { client, state, store } = await fixture(); const config = await resolveAaveConfig(client);
    state.supplied = 10n; state.debt = 1n; state.collateral = true; state.failSimulation = true;
    const result = await checkWithdrawEligibility(client, config, account, 1n);
    expect(result.requiresSimulation).toBe(true); expect(result.checksPassed).toBe(false);
    expect(result.reasons).toContain('withdraw-simulation-failed'); store.close();
  });
  it('reads treasury-inclusive cap, actual liquidity, timestamp and POL cost conservatively', async () => {
    const { client, store } = await fixture(); const config = await resolveAaveConfig(client);
    expect(await readReserveState(client, config)).toMatchObject({ totalSupplyWithTreasury: 10_000_002n, liquidity: 100_000_000n, supplyCap: 1_000_000_000n, blockNumber: 100n, timestamp: 1000n });
    expect(await estimatePolCost(client, 101n)).toEqual({ gas: 122n, feePerGas: 2n, polWei: 244n }); store.close();
  });
  it('propagates failed reads instead of manufacturing zero balances', async () => {
    const { client, store } = await fixture(); const config = await resolveAaveConfig(client);
    vi.mocked(client.readContract).mockRejectedValue(new Error('RPC read unavailable'));
    await expect(readPosition(client, config, account)).rejects.toThrow('RPC read unavailable'); store.close();
  });
});
