import { describe, expect, it, vi } from 'vitest';
import { assertFundedTestAmount, createWalletAdapter, isRejected, walletRequest, type WalletProvider } from './wallet';
const account = '0x1111111111111111111111111111111111111111';
describe('M3 wallet boundary', () => {
  it('connects then switches then rereads identity, on every launch', async () => {
    const calls: string[] = []; let chain = '0x1';
    const provider: WalletProvider = { request: async ({ method }) => {
      calls.push(method);
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [account];
      if (method === 'wallet_switchEthereumChain') { chain = '0x89'; return null; }
      if (method === 'eth_chainId') return chain;
      throw new Error(method);
    } };
    const wallet = createWalletAdapter(provider);
    expect(await wallet.connect()).toEqual({ account, chainId: 137 });
    expect(calls).toEqual(['eth_requestAccounts', 'eth_chainId', 'wallet_switchEthereumChain', 'eth_accounts', 'eth_chainId']);
    calls.length = 0; await wallet.connect();
    expect(calls[0]).toBe('eth_requestAccounts');
  });
  it('does not trust a resolved switch or disconnected reread', async () => {
    const provider: WalletProvider = { request: async ({ method }) =>
      method === 'eth_chainId' ? '0x1' : method === 'wallet_switchEthereumChain' ? null : [account] };
    await expect(createWalletAdapter(provider).connect()).rejects.toThrow('Wrong chain');
    provider.request = async ({ method }) => method === 'eth_accounts' ? [] : method === 'eth_chainId' ? '0x89' : [account];
    await expect(createWalletAdapter(provider).connect()).rejects.toThrow('Disconnected');
  });
  it('blocks real-provider sends before any wallet request', async () => {
    let calls = 0;
    const wallet = createWalletAdapter({ request: async () => { calls++; return null; } });
    await expect(wallet.transact('approve', 1n, account, () => {})).rejects.toThrow('Mainnet transactions disabled');
    expect(calls).toBe(0);
  });
  it('classifies native and wrapped 4001 rejection', () => {
    expect(isRejected({ code: 4001 })).toBe(true);
    expect(isRejected({ cause: { cause: { code: 4001 } } })).toBe(true);
    expect(isRejected({ code: -32000 })).toBe(false);
  });
});


it('bounds stalled read RPC without treating a native dialog as cancelled', async () => {
  vi.useFakeTimers();
  try {
    let failure: unknown;
    void walletRequest({ request: () => new Promise(() => {}) }, { method: 'eth_chainId' }).catch(error => { failure = error; });
    await vi.advanceTimersByTimeAsync(15001);
    expect(failure).toMatchObject({ message: expect.stringContaining('Timed out') });
  } finally { vi.useRealTimers(); }
});

it('enforces the funded-test 5 USDT hard cap, including full-balance sentinels', () => {
  expect(() => assertFundedTestAmount(0n)).not.toThrow();
  expect(() => assertFundedTestAmount(5_000_000n)).not.toThrow();
  for (const amount of [-1n, 5_000_001n, (1n << 256n) - 1n]) expect(() => assertFundedTestAmount(amount)).toThrow('5 USDT');
});
