import { describe, it, expect, vi } from 'vitest';
import { probe, bounded, readOnlyProvider, message } from './diagnostics';
const account = '0x1111111111111111111111111111111111111111';
describe('host diagnostics safety and failures', () => {
  it('shows missing injection without fabricating balances', async () => {
    const rows = await probe();
    expect(rows.provider).toContain('unavailable');
    expect(rows.USDT).toContain('Unavailable');
  });
  it('checks reads independently and never calls send or signature methods', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_chainId') throw Object.assign(new Error('unsupported'), { code: -32601 });
      if (method === 'eth_accounts') return [account];
      throw new Error('unexpected call');
    });
    const rows = await probe({ request });
    expect(rows.eth_chainId).toContain('-32601');
    expect(rows.eth_accounts).toContain('Supported');
    expect(rows.accounts).toContain(account);
    expect(rows.eth_sendTransaction).toContain('unverified');
    expect(request.mock.calls.map(([arg]) => arg.method).sort()).toEqual(['eth_accounts', 'eth_chainId']);
  });
  it('blocks every wallet mutation at the read transport boundary', async () => {
    const request = vi.fn();
    const provider = readOnlyProvider({ request });
    await expect(provider.request({ method: 'eth_sendTransaction' })).rejects.toThrow('Read-only');
    await expect(provider.request({ method: 'personal_sign' })).rejects.toThrow('Read-only');
    expect(request).not.toHaveBeenCalled();
  });
  it('reports wrong chain and malformed accounts visibly', async () => {
    const rows = await probe({ request: async ({ method }) => method === 'eth_chainId' ? '0x1' : ['bad'] });
    expect(rows.chainId).toContain('Wrong chain');
    expect(rows.eth_accounts).toContain('Invalid');
    expect(rows.position).toContain('Unavailable');
  });
  it('treats an empty account list as disconnected, not a zero position', async () => {
    const rows = await probe({ request: async ({ method }) => method === 'eth_chainId' ? '0x89' : [] });
    expect(rows.accounts).toContain('Disconnected');
    expect(rows.position).toContain('Unavailable');
  });
  it('bounds a hung host call', async () => {
    await expect(bounded(new Promise(() => {}), 5)).rejects.toThrow('Timed out');
  });
});

it('keeps successful balances when Aave configuration RPC fails and flags missing POL', async () => {
  const methods: string[] = [];
  const rows = await probe({ request: async ({ method }) => {
    methods.push(method);
    if (method === 'eth_chainId') return '0x89';
    if (method === 'eth_accounts') return [account];
    if (method === 'eth_getBalance') return '0x0';
    if (method === 'eth_call') return `0x${(1234567n).toString(16).padStart(64, '0')}`;
    throw new Error('host block RPC unavailable');
  } });
  expect(rows.USDT).toContain('1.234567 USDT');
  expect(rows.POL).toContain('Missing POL');
  expect(rows.position).toContain('host block RPC unavailable');
  expect(methods).not.toContain('eth_sendTransaction');
});

it('discards balances if the host changes account during reads', async () => {
  let calls = 0;
  const rows = await probe({ request: async ({ method }) => {
    if (method === 'eth_chainId') return '0x89';
    if (method === 'eth_accounts') return ++calls === 1 ? [account] : [];
    if (method === 'eth_getBalance') return '0x0';
    if (method === 'eth_call') return `0x${'0'.repeat(64)}`;
    throw new Error('unavailable');
  } });
  expect(rows.USDT).toContain('Account or chain changed');
  expect(rows.POL).toContain('Account or chain changed');
});

it('keeps rejection codes in logs and friendly text in diagnostic read errors', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const error = { code: 4001, message: 'Rejected raw 4001' };
  try {
    expect(message(error)).toContain('declined');
    expect(message(error)).not.toContain('4001');
    expect(log).toHaveBeenCalledWith('Wallet request failed', error);
  } finally { log.mockRestore(); }
});
