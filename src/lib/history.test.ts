import { expect, it, vi } from 'vitest';
import { zeroAddress, type PublicClient } from 'viem';
import { DOCUMENTED } from '../config/aave';
import { readHistory } from './history';
const account = '0x1111111111111111111111111111111111111111' as const;
const hash = ('0x' + 'a'.repeat(64)) as `0x${string}`;
function fixture(external = false) {
  const getLogs = vi.fn(async ({ event, fromBlock, toBlock }: { event: { name: string }; fromBlock: bigint; toBlock: bigint }) => {
    const base = { address: DOCUMENTED.pool, blockNumber: 99n, blockHash: hash, transactionHash: hash, logIndex: 1, removed: false };
    if (fromBlock > 99n || toBlock < 99n) return [];
    if (event.name === 'Supply') return [{ ...base, args: { reserve: DOCUMENTED.underlying, onBehalfOf: account, amount: 10_000_000n } }];
    if (event.name === 'Withdraw') return [{ ...base, logIndex: 2, args: { reserve: DOCUMENTED.underlying, user: account, amount: 2_000_000n } }];
    return external ? [{ ...base, address: DOCUMENTED.aToken, args: { from: account, to: DOCUMENTED.pool, value: 1n } }] : [{ ...base, address: DOCUMENTED.aToken, args: { from: zeroAddress, to: account, value: 10n } }];
  });
  return { getChainId: async () => 137, getBlock: vi.fn(async ({ blockNumber }: { blockNumber?: bigint } = {}) => ({ number: blockNumber ?? 101n, hash, timestamp: BigInt(Math.floor(Date.now()/1000)) })), getLogs, readContract: vi.fn(async () => 8_100_000n) };
}
it('uses confirmed on-chain logs and an independent balance, never journal or forecast', async () => {
  const client = fixture(); const result = await readHistory(client as unknown as PublicClient, account);
  expect(result.toBlock).toBe(100n);
  expect(result.events.map(e => [e.action, e.amount])).toEqual([['supply', 10_000_000n], ['withdraw', 2_000_000n]]);
  expect(result.supplied).toBe(8_100_000n);
  expect(result.earnings).toBeNull();
  expect(result.limitation).toMatch(/incomplete/i);
  expect(client.getLogs.mock.calls.every(([a]) => a.toBlock <= 100n)).toBe(true);
  expect(client.readContract.mock.calls[0]).toEqual([expect.objectContaining({ blockNumber: 100n })]);
});
it('flags external transfers rather than classifying them as earnings', async () => {
  const result = await readHistory(fixture(true) as unknown as PublicClient, account);
  expect(result.externalTransfers).toBe(true); expect(result.earnings).toBeNull();
});
it('fails closed on RPC errors and noncanonical log hashes', async () => {
  const client = fixture(); client.getLogs.mockRejectedValueOnce(new Error('RPC unavailable'));
  await expect(readHistory(client as unknown as PublicClient, account)).rejects.toThrow('RPC unavailable');
  const other = fixture(); other.getBlock.mockResolvedValue({ number: 100n, hash: '0x00' as typeof hash, timestamp: BigInt(Math.floor(Date.now()/1000)) });
  await expect(readHistory(other as unknown as PublicClient, account)).rejects.toThrow(/canonical/i);
});
