import { test, type Page } from '@playwright/test';
import { encodeFunctionResult, toFunctionSelector, type Abi } from 'viem';
import { quoteAbi } from '../src/lib/quote';
import { DOCUMENTED, PRICE_ADDRESSES } from '../src/config/aave';
import { providerAbi, poolAbi, tokenAbi, dataAbi } from '../src/config/abi';

export interface MockOptions {
  historyFailed?: boolean;
  replacementMode?: 'repriced' | 'cancelled' | 'wrong-nonce';
  pol?: string; cash?: string; supplied?: string; allowance?: string;
  rejectConnect?: boolean; rejectSwitch?: boolean; wrongChain?: boolean; stale?: boolean;
  failedRead?: boolean; decimals?: number; paused?: boolean; frozen?: boolean;
  liquidity?: string; pending?: boolean; reverted?: boolean; rejectSend?: boolean;
  debtCollateral?: boolean; quoteUnavailable?: boolean; simulationFailed?: boolean; lowPol?: boolean; noEvents?: boolean; slowRead?: boolean;
}
export async function installProvider(page: Page, options: MockOptions = {}) {
  const ray = 10n ** 27n;
  const values: Record<string, unknown> = {
    getPriceOracle: PRICE_ADDRESSES.oracle, BASE_CURRENCY: '0x0000000000000000000000000000000000000000', BASE_CURRENCY_UNIT: 100_000_000n, getSourceOfAsset: PRICE_ADDRESSES.oracle, getAssetPrice: 100_000_000n,
    getPool: DOCUMENTED.pool, getPoolDataProvider: DOCUMENTED.dataProvider, ADDRESSES_PROVIDER: DOCUMENTED.provider,
    getReservesList: [DOCUMENTED.underlying], getReserveTokensAddresses: [DOCUMENTED.aToken, DOCUMENTED.variableDebtToken, DOCUMENTED.variableDebtToken],
    decimals: options.decimals ?? 6, symbol: 'USDT0', UNDERLYING_ASSET_ADDRESS: DOCUMENTED.underlying, POOL: DOCUMENTED.pool,
    getReserveConfigurationData: [6n, 0n, 0n, 0n, 0n, false, true, false, true, options.frozen ?? false],
    getPaused: options.paused ?? false, getReserveCaps: [0n, 0n],
    getReserveData: [0n, 0n, 100_000_000n, 0n, 0n, ray / 20n, 0n, 0n, 0n, ray, 0n, 0n],
    getReserveNormalizedIncome: ray, getUserAccountData: [100_000_000n, options.debtCollateral ? 50_000_000n : 0n, 0n, 0n, 0n, 10n ** 30n],
    approve: true, supply: undefined, withdraw: 1n,
  };
  const replies: Record<string, { name: string; value: string }> = {};
  for (const abi of [providerAbi, poolAbi, tokenAbi, dataAbi, quoteAbi] as Abi[]) {
    for (const item of abi) {
      if (item.type !== 'function') continue;
      const name = item.name;
      if (name in values) replies[toFunctionSelector(item)] = { name, value: encodeFunctionResult({ abi, functionName: name, result: values[name] }) };
      else replies[toFunctionSelector(item)] = { name, value: '0x' };
    }
  }
  await page.addInitScript(({ options, replies, addresses }) => {
    const account = '0x1111111111111111111111111111111111111111';
    const hash = '0x' + 'a'.repeat(64); const blockHash = '0x' + 'b'.repeat(64);
    const state = {
      account, chain: '0x1', cash: options.cash ?? '100000000', supplied: options.supplied ?? '20000000',
      allowance: options.allowance ?? '0', writes: 0, calls: [] as string[], rejectSend: options.rejectSend ?? false,
      pending: options.pending ?? false, failedRead: options.failedRead ?? false, slowRead: options.slowRead ?? false,
    };
    const listeners: Record<string, (() => void)[]> = {};
    const word = (v: string | bigint) => BigInt(v).toString(16).padStart(64, '0');
    const tuple = (...v: (string | bigint)[]) => '0x' + v.map(word).join('');
    const timestamp = () => '0x' + Math.floor(Date.now() / 1000 - (options.stale ? 120 : 0)).toString(16);
    const tx = { hash, from: account, to: addresses.pool as string, input: '0x', value: '0x0', nonce: '0x0', blockHash, blockNumber: '0x64', transactionIndex: '0x0', gas: '0x186a0', gasPrice: '0x77359400', type: '0x0', v: '0x1b', r: hash, s: hash };
    const block = () => ({
      number: '0x64', hash: blockHash, parentHash: blockHash, timestamp: timestamp(), nonce: '0x0000000000000000',
      difficulty: '0x0', totalDifficulty: '0x0', size: '0x1', gasLimit: '0x1c9c380', gasUsed: '0x0',
      miner: account, extraData: '0x', transactions: [], uncles: [], baseFeePerGas: '0x3b9aca00',
      logsBloom: '0x' + '0'.repeat(512), receiptsRoot: hash, stateRoot: hash, transactionsRoot: hash, sha3Uncles: hash,
    });
    const provider = {
      on: (event: string, fn: () => void) => { (listeners[event] ??= []).push(fn); },
      removeListener: (event: string, fn: () => void) => { listeners[event] = (listeners[event] ?? []).filter(x => x !== fn); },
      request: async ({ method, params }: { method: string; params?: unknown }) => {
        state.calls.push(method);
        if (method === 'eth_requestAccounts') { if (options.rejectConnect) throw { code: 4001, message: 'Connection rejected' }; return [state.account]; }
        if (method === 'eth_accounts') return [state.account];
        if (method === 'eth_chainId') return state.chain;
        if (method === 'wallet_switchEthereumChain') {
          if (options.rejectSwitch) throw { code: 4001, message: 'Switch rejected' };
          if (!options.wrongChain) state.chain = '0x89'; return null;
        }
        if (method === 'web3_clientVersion') return 'anvil/e2e';
        if (method === 'eth_getBlockByNumber') { const requested = (params as string[])[0]; return { ...block(), number: requested === 'latest' ? '0x65' : requested }; }
        if (method === 'eth_getLogs') { if (options.historyFailed) throw new Error('History unavailable'); return []; }
        if (method === 'eth_blockNumber') return '0x65';
        if (method === 'eth_getCode') return '0x1234';
        if (method === 'eth_getBalance') return '0x' + BigInt(options.lowPol ? '1' : options.pol ?? '1000000000000000000').toString(16);
        if (method === 'eth_estimateGas') {
          const call = (params as { data: string }[])[0];
          if (replies[call.data.slice(0, 10)]?.name === 'approve') {
            const amount = BigInt('0x' + call.data.slice(74, 138));
            if (amount > 0n && BigInt(state.allowance) > 0n) throw new Error('Reset allowance before exact approval');
          }
          if (replies[call.data.slice(0, 10)]?.name === 'supply') {
            const amount = BigInt('0x' + call.data.slice(74, 138));
            if (BigInt(state.allowance) < amount) throw new Error('Supply estimation needs allowance');
          }
          return '0x186a0';
        }
        if (method === 'eth_maxPriorityFeePerGas' || method === 'eth_gasPrice') return '0x77359400';
        if (method === 'eth_getTransactionByHash') {
          const requested = (params as string[])[0];
          return requested === '0x' + 'c'.repeat(64) ? { ...tx, hash: requested, nonce: options.replacementMode === 'wrong-nonce' ? '0x1' : tx.nonce, input: options.replacementMode === 'cancelled' ? '0x' : tx.input } : tx;
        }
        if (method === 'eth_getTransactionReceipt') {
          const requested = (params as string[])[0];
          if (state.pending && requested !== '0x' + 'c'.repeat(64)) return null;
          return { transactionHash: requested, transactionIndex: '0x0', blockHash, blockNumber: '0x64', from: account, to: addresses.pool, cumulativeGasUsed: '0x186a0', gasUsed: '0x186a0', contractAddress: null, logs: [], logsBloom: '0x' + '0'.repeat(512), status: options.reverted ? '0x0' : '0x1', effectiveGasPrice: '0x77359400', type: '0x0' };
        }
        if (method === 'eth_call' || method === 'eth_sendTransaction') {
          const call = (params as { data: string; to: string }[])[0]; const entry = replies[call.data.slice(0, 10)];
          if (!entry) throw new Error('Unsupported mock call ' + call.data);
          if (state.slowRead && method === 'eth_call') await new Promise(r => setTimeout(r, 600));
          if (options.quoteUnavailable && entry.name === 'getPriceOracle') throw new Error('Quote unavailable');
          if (state.failedRead && method === 'eth_call') throw new Error('RPC unavailable');
          const words = call.data.slice(10).match(/.{64}/g) ?? [];
          if (method === 'eth_sendTransaction') {
            if (state.rejectSend) throw { code: 4001, message: 'Request rejected' };
            state.writes++;
            const amount = BigInt('0x' + words[1]);
            if (!options.reverted) {
              if (entry.name === 'approve') state.allowance = amount.toString();
              if (entry.name === 'supply') { state.cash = (BigInt(state.cash) - amount).toString(); state.supplied = (BigInt(state.supplied) + amount).toString(); state.allowance = (BigInt(state.allowance) - amount).toString(); }
              if (entry.name === 'withdraw') { state.cash = (BigInt(state.cash) + amount).toString(); state.supplied = (BigInt(state.supplied) - amount).toString(); }
            }
            tx.input = call.data; tx.to = call.to; return hash;
          }
          if (options.simulationFailed && ['supply', 'withdraw'].includes(entry.name)) throw new Error('Simulation reverted');
          if (entry.name === 'getAssetPrice') return tuple(call.data.slice(-40).toLowerCase() === '0d500b1d8e8ef31e21c99d1db9a6444d3adf1270' ? 25_000_000n : 100_000_000n);
          if (entry.name === 'balanceOf' && call.to.toLowerCase() === addresses.aToken.toLowerCase()) return tuple(state.supplied);
          if (entry.name === 'balanceOf') return tuple(call.data.slice(-40).toLowerCase() === addresses.aToken.slice(2).toLowerCase() ? options.liquidity ?? '1000000000' : state.cash);
          if (entry.name === 'allowance') return tuple(state.allowance);
          if (entry.name === 'getUserReserveData') return tuple(state.supplied, 0n, 0n, 0n, 0n, 0n, 0n, 0n, options.debtCollateral ? 1n : 0n);
          return entry.value;
        }
        throw new Error('Unsupported mock method ' + method);
      },
    };
    Object.assign(window, { ethereum: provider, mockState: state, mockChange: (kind: string) => {
      if (kind === 'account') state.account = '0x2222222222222222222222222222222222222222';
      else state.chain = '0x1';
      if (!options.noEvents) (listeners[kind === 'account' ? 'accountsChanged' : 'chainChanged'] ?? []).forEach(fn => fn());
    } });
  }, { options, replies, addresses: DOCUMENTED });
}

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  console.log('Mock failure state', await page.evaluate(() => {
    const state = (window as unknown as { mockState?: { calls: string[]; writes: number } }).mockState;
    return { calls: state?.calls.slice(-15), writes: state?.writes, status: document.querySelector('[role="status"]')?.textContent };
  }).catch(() => 'page unavailable'));
});
