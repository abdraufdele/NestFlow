import { describe, expect, it } from 'vitest';
import { injectedWallet } from './wallet';
import type { EIP1193Provider } from 'viem';
describe('injected provider construction', () => {
  it('reports a missing injected provider instead of silently selecting another wallet', () => {
    expect(() => injectedWallet()).toThrow('provider unavailable');
  });
  it('uses only the supplied EIP-1193 provider for account and chain reads', async () => {
    const request = async ({ method }: { method: string }) => {
      if (method === 'eth_chainId') return '0x89';
      if (method === 'eth_accounts') return ['0x1111111111111111111111111111111111111111'];
      throw new Error('Unexpected provider method');
    };
    const wallet = injectedWallet({ request: request as EIP1193Provider['request'], on: () => undefined, removeListener: () => undefined });
    expect(await wallet.getChainId()).toBe(137);
    expect(await wallet.getAddresses()).toEqual(['0x1111111111111111111111111111111111111111']);
  });
});
