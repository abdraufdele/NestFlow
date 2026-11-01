import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';
import { openTxStore } from './txStore';
const account = '0x1111111111111111111111111111111111111111';
const hash = `0x${'a'.repeat(64)}` as const;
function rpc() {
  const client = createPublicClient({ chain: polygon, transport: http() });
  vi.spyOn(client, 'getChainId').mockResolvedValue(137);
  vi.spyOn(client, 'getTransaction').mockRejectedValue(new Error('Transaction not yet indexed'));
  vi.spyOn(client, 'getTransactionReceipt').mockResolvedValue({ status: 'success', blockNumber: 5n, blockHash: hash, transactionHash: hash } as Awaited<ReturnType<typeof client.getTransactionReceipt>>);
  vi.spyOn(client, 'getBlock').mockResolvedValue({ hash } as Awaited<ReturnType<typeof client.getBlock>>);
  vi.spyOn(client, 'getBlockNumber').mockResolvedValue(6n);
  return client;
}
async function store() { return openTxStore(`test-${crypto.randomUUID()}`); }
describe('durable transaction recovery', () => {
  it('rechecks previously confirmed receipts on reopen and blocks a later reorganization', async () => {
    const dbName = `test-${crypto.randomUUID()}`, client = rpc();
    const first = await openTxStore(dbName); await first.reconcile(client, account, 137);
    const record = await first.begin(account, 137, 'supply', 1n); await first.submit(record, async () => hash);
    await first.reconcile(client, account, 137); first.close();
    const reopened = await openTxStore(dbName);
    vi.mocked(client.getBlock).mockResolvedValue({ hash: `0x${'b'.repeat(64)}` } as Awaited<ReturnType<typeof client.getBlock>>);
    await reopened.reconcile(client, account, 137);
    expect((await reopened.get(account, 137))?.status).toBe('unknown');
    await expect(reopened.begin(account, 137, 'supply', 1n)).rejects.toThrow('unresolved'); reopened.close();
  });
  it.each(['repriced', 'cancelled'] as const)('reconciles a verified %s replacement without confusing action success', async kind => {
    const journal = await store(), client = rpc(); await journal.reconcile(client, account, 137);
    const originalHash = hash, replacementHash = `0x${'c'.repeat(64)}` as const;
    const record = await journal.begin(account, 137, 'supply', 1n); await journal.submit(record, async () => originalHash);
    const original = { hash: originalHash, from: account, to: account, input: '0x1234', value: 0n, nonce: 5 } as unknown as Awaited<ReturnType<typeof client.getTransaction>>;
    vi.spyOn(client, 'getTransaction').mockResolvedValue(original);
    expect(await journal.captureTransaction(client, account, 137)).toBe(true);
    vi.mocked(client.getTransactionReceipt).mockRejectedValue(new Error('Original replaced'));
    await journal.reconcile(client, account, 137);
    vi.mocked(client.getTransaction).mockResolvedValue({ ...original, hash: replacementHash, input: kind === 'cancelled' ? '0x' : '0x1234' });
    await journal.reconcileReplacement(client, account, 137, replacementHash);
    await journal.captureTransaction(client, account, 137);
    await journal.reconcileReplacement(client, account, 137, replacementHash);
    vi.mocked(client.getTransactionReceipt).mockResolvedValue({ status: 'success', blockNumber: 5n, blockHash: hash, transactionHash: replacementHash } as Awaited<ReturnType<typeof client.getTransactionReceipt>>);
    await journal.reconcile(client, account, 137);
    expect(await journal.get(account, 137)).toMatchObject({ status: kind === 'repriced' ? 'confirmed' : 'rejected', txHash: replacementHash, originalTxHash: originalHash, locked: false });
    expect((await journal.begin(account, 137, 'withdraw', 1n)).status).toBe('idle'); journal.close();
  });
  it('refuses unproven replacement hashes and preserves the unknown lock', async () => {
    const journal = await store(), client = rpc(); await journal.reconcile(client, account, 137);
    const record = await journal.begin(account, 137, 'supply', 1n); await journal.submit(record, async () => hash);
    const transaction = { hash, from: account, to: account, input: '0x1234', value: 0n, nonce: 5 } as unknown as Awaited<ReturnType<typeof client.getTransaction>>;
    vi.spyOn(client, 'getTransaction').mockResolvedValue(transaction); await journal.captureTransaction(client, account, 137);
    vi.mocked(client.getTransaction).mockResolvedValue({ ...transaction, hash: `0x${'c'.repeat(64)}`, nonce: 6 });
    await expect(journal.reconcileReplacement(client, account, 137, `0x${'c'.repeat(64)}`)).rejects.toThrow('replacement');
    expect((await journal.get(account, 137))?.locked).toBe(true); journal.close();
  });
  it('does not steal an active preflight during reconciliation', async () => {
    const journal = await store(), client = rpc(); await journal.reconcile(client, account, 137);
    const record = await journal.begin(account, 137, 'supply', 1n);
    await journal.reconcile(client, account, 137);
    await expect(journal.begin(account, 137, 'withdraw', 1n)).rejects.toThrow('unresolved');
    await journal.cancelPreflight(record);
    expect((await journal.begin(account, 137, 'withdraw', 1n)).status).toBe('idle'); journal.close();
  });
  it('disables actions when IndexedDB is denied', async () => {
    const opening = vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new Error('Storage denied'); });
    try { await expect(openTxStore('denied')).rejects.toThrow('Actions disabled'); }
    finally { opening.mockRestore(); }
  });
  it('never invokes the wallet if the awaiting-signature record cannot be persisted', async () => {
    const journal = await store(), client = rpc(); await journal.reconcile(client, account, 137);
    const record = await journal.begin(account, 137, 'supply', 1n);
    const original = IDBObjectStore.prototype.put;
    const writing = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if ((value as { status?: string }).status === 'awaiting-signature') throw new Error('Storage full');
      return original.call(this, value, key);
    });
    let walletRequests = 0;
    try { await expect(journal.submit(record, async () => { walletRequests++; return hash; })).rejects.toThrow('Storage full'); }
    finally { writing.mockRestore(); }
    expect(walletRequests).toBe(0); journal.close();
  });
  it('retains the broadcast hash as unknown if submitted-state persistence fails', async () => {
    const journal = await store(), client = rpc(); await journal.reconcile(client, account, 137);
    const record = await journal.begin(account, 137, 'supply', 1n);
    const original = IDBObjectStore.prototype.put;
    const writing = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if ((value as { status?: string }).status === 'submitted') throw new Error('Storage full');
      return original.call(this, value, key);
    });
    try { await expect(journal.submit(record, async () => hash)).rejects.toThrow('do not retry'); }
    finally { writing.mockRestore(); }
    expect(await journal.get(account, 137)).toMatchObject({ txHash: hash, status: 'unknown', locked: true });
    await journal.reconcile(client, account, 137);
    expect((await journal.get(account, 137))?.status).toBe('confirmed'); journal.close();
  });
  it('permits only one wallet request when the same attempt is submitted twice concurrently', async () => {
    const journal = await store(), client = rpc(); await journal.reconcile(client, account, 137);
    const record = await journal.begin(account, 137, 'approve', 1n);
    let walletRequests = 0;
    const send = async () => { walletRequests++; return hash; };
    const results = await Promise.allSettled([journal.submit(record, send), journal.submit(record, send)]);
    expect(walletRequests).toBe(1);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1); journal.close();
  });
  it('requires reconciliation and guards duplicate clicks atomically across instances', async () => {
    const dbName = `test-${crypto.randomUUID()}`;
    const first = await openTxStore(dbName), second = await openTxStore(dbName);
    await expect(first.begin(account, 137, 'supply', 10n)).rejects.toThrow('reconcile');
    await first.reconcile(rpc(), account, 137); await second.reconcile(rpc(), account, 137);
    const results = await Promise.allSettled([first.begin(account, 137, 'supply', 10n), second.begin(account, 137, 'supply', 10n)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    first.close(); second.close();
  });
  it('stores hash immediately, reconciles after reopening, and keeps approval separate from supply', async () => {
    const dbName = `test-${crypto.randomUUID()}`; const first = await openTxStore(dbName);
    await first.reconcile(rpc(), account, 137);
    const record = await first.begin(account, 137, 'approve', 10n);
    await first.submit(record, async () => hash); first.close();
    const reopened = await openTxStore(dbName);
    expect((await reopened.get(account, 137))?.status).toBe('submitted');
    await reopened.reconcile(rpc(), account, 137);
    expect(await reopened.get(account, 137)).toMatchObject({ action: 'approve', status: 'confirmed', txHash: hash });
    expect((await reopened.begin(account, 137, 'supply', 10n)).status).toBe('idle');
    reopened.close();
  });
  it('keeps timeout, missing receipt, replacement and orphaned signature uncertain', async () => {
    const journal = await store(), client = rpc(); await journal.reconcile(client, account, 137);
    const record = await journal.begin(account, 137, 'withdraw', 10n);
    await expect(journal.submit(record, async () => { throw new Error('timeout after broadcast'); })).rejects.toThrow();
    await journal.reconcile(client, account, 137);
    expect((await journal.get(account, 137))?.status).toBe('unknown');
    await expect(journal.begin(account, 137, 'withdraw', 10n)).rejects.toThrow('unresolved'); journal.close();
  });
  it('reconciles reverted receipts and user rejection without misreporting confirmation', async () => {
    const journal = await store(), client = rpc(); await journal.reconcile(client, account, 137);
    let record = await journal.begin(account, 137, 'approve', 10n);
    await expect(journal.submit(record, async () => { throw { code: 4001 }; })).rejects.toBeDefined();
    expect((await journal.get(account, 137))?.status).toBe('rejected');
    record = await journal.begin(account, 137, 'approve', 10n); await journal.submit(record, async () => hash);
    vi.mocked(client.getTransactionReceipt).mockResolvedValue({ status: 'reverted', blockNumber: 5n, blockHash: hash } as Awaited<ReturnType<typeof client.getTransactionReceipt>>);
    await journal.reconcile(client, account, 137);
    expect((await journal.get(account, 137))?.status).toBe('reverted'); journal.close();
  });
  it('does not unlock unconfirmed or reorganized receipts, or read another chain', async () => {
    const journal = await store(), client = rpc(); await journal.reconcile(client, account, 137);
    const record = await journal.begin(account, 137, 'supply', 10n); await journal.submit(record, async () => hash);
    vi.mocked(client.getBlockNumber).mockResolvedValue(5n);
    await journal.reconcile(client, account, 137);
    expect((await journal.get(account, 137))?.status).toBe('submitted');
    vi.mocked(client.getBlockNumber).mockResolvedValue(6n);
    vi.mocked(client.getBlock).mockResolvedValue({ hash: `0x${'b'.repeat(64)}` } as Awaited<ReturnType<typeof client.getBlock>>);
    await journal.reconcile(client, account, 137);
    expect((await journal.get(account, 137))?.status).toBe('unknown');
    await expect(journal.reconcile(client, account, 1)).rejects.toThrow('chain');
    expect(await journal.get(account, 1)).toBeUndefined(); journal.close();
  });
  it('leaves submitted hashes unresolved on RPC errors', async () => {
    const journal = await store(), client = rpc(); await journal.reconcile(client, account, 137);
    const record = await journal.begin(account, 137, 'supply', 1n); await journal.submit(record, async () => hash);
    vi.mocked(client.getTransactionReceipt).mockRejectedValue(new Error('RPC down'));
    await journal.reconcile(client, account, 137);
    expect((await journal.get(account, 137))?.status).toBe('unknown');
    await expect(journal.begin(account, 137, 'supply', 1n)).rejects.toThrow('unresolved'); journal.close();
  });
});
