import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { isAddress, isAddressEqual, type Address, type Hash, type Hex, type PublicClient } from 'viem';
export type TxStatus = 'idle' | 'awaiting-signature' | 'submitted' | 'confirmed' | 'reverted' | 'rejected' | 'unknown';
export type TxAction = 'approve' | 'supply' | 'withdraw';
export interface TxRecord {
  scope: string; id: string; account: Address; chainId: number; action: TxAction; amount: bigint;
  status: TxStatus; txHash?: Hash; locked: boolean; updatedAt: number;
  nonce?: number; to?: Address | null; input?: Hex; value?: bigint;
  originalTxHash?: Hash; replacementKind?: 'repriced' | 'cancelled-or-replaced';
}
interface JournalDB extends DBSchema { attempts: { key: string; value: TxRecord } }
const terminal = new Set<TxStatus>(['confirmed', 'reverted', 'rejected']);
function namespace(account: Address, chainId: number) {
  if (!isAddress(account) || !Number.isSafeInteger(chainId) || chainId < 1) throw new Error('Invalid account/chain');
  return `${chainId}:${account.toLowerCase()}`;
}
function userRejected(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; cause?: unknown };
  return value.code === 4001 || (value.cause !== error && userRejected(value.cause));
}
export class TxStore {
  private ready = new Set<string>();
  constructor(private db: IDBPDatabase<JournalDB>) {}
  close() { this.db.close(); this.ready.clear(); }
  async get(account: Address, chainId: number) { return this.db.get('attempts', namespace(account, chainId)); }
  /** Reconcile on load BEFORE begin/retry. Two confirmations, plus canonical-block check. */
  async reconcile(client: PublicClient, account: Address, chainId: number): Promise<TxRecord | undefined> {
    const scope = namespace(account, chainId); this.ready.delete(scope);
    if (await client.getChainId() !== chainId) throw new Error('RPC chain mismatch');
    await this.captureTransaction(client, account, chainId);
    const record = await this.db.get('attempts', scope);
    if (record && (!terminal.has(record.status) || record.txHash)) {
      let status: TxStatus = record.status;
      if (record.txHash) {
        try {
          const receipt = await client.getTransactionReceipt({ hash: record.txHash });
          const [block, head] = await Promise.all([
            client.getBlock({ blockNumber: receipt.blockNumber }), client.getBlockNumber({ cacheTime: 0 }),
          ]);
          status = block.hash !== receipt.blockHash ? 'unknown'
            : head < receipt.blockNumber + 1n ? 'submitted'
            : receipt.status !== 'success' ? 'reverted'
            : record.replacementKind === 'cancelled-or-replaced' ? 'rejected' : 'confirmed';
        } catch {
          // Missing, replaced, dropped, timed out and unreadable are never safe to retry.
          status = 'unknown';
        }
      } else if (record.status === 'awaiting-signature') status = 'unknown';
      const next = { ...record, status, locked: status === 'idle' ? record.locked : !terminal.has(status), updatedAt: Math.max(Date.now(), record.updatedAt + 1) };
      // Do not let a slow read overwrite a newer tab's submission.
      const transaction = this.db.transaction('attempts', 'readwrite');
      const current = await transaction.store.get(scope);
      if (current?.id === record.id && current.updatedAt === record.updatedAt && current.status === record.status) await transaction.store.put(next);
      await transaction.done;
    }
    this.ready.add(scope);
    return this.db.get('attempts', scope);
  }
  /** Atomic IndexedDB read/write transaction provides cross-tab duplicate protection. */
  async begin(account: Address, chainId: number, action: TxAction, amount: bigint): Promise<TxRecord> {
    const scope = namespace(account, chainId);
    if (!this.ready.has(scope)) throw new Error('Must reconcile receipts before retry');
    if (amount < 0n) throw new Error('Invalid amount');
    const transaction = this.db.transaction('attempts', 'readwrite');
    const current = await transaction.store.get(scope);
    if (current?.locked) { await transaction.done; throw new Error('An unresolved transaction blocks this account/chain'); }
    const record: TxRecord = { scope, id: crypto.randomUUID(), account, chainId, action, amount, status: 'idle', locked: true, updatedAt: Date.now() };
    await transaction.store.put(record); await transaction.done; return record;
  }
  private async update(record: TxRecord, changes: Partial<TxRecord>, expectedStatus?: TxStatus) {
    const transaction = this.db.transaction('attempts', 'readwrite');
    const current = await transaction.store.get(record.scope);
    if (current?.id !== record.id || !current.locked || (expectedStatus !== undefined && current.status !== expectedStatus)) { await transaction.done; throw new Error('Stale transaction attempt'); }
    const next = { ...current, ...changes, updatedAt: Math.max(Date.now(), current.updatedAt + 1) };
    await transaction.store.put(next); await transaction.done; return next;
  }
  /** Only use before a wallet request; preflight failure cannot have broadcast anything. */
  async cancelPreflight(record: TxRecord) {
    const current = await this.get(record.account, record.chainId);
    if (current?.status !== 'idle') throw new Error('Cannot cancel a potentially broadcast transaction');
    await this.update(record, { locked: false }, 'idle');
  }
  /** Best-effort observation after broadcast. Failure NEVER unlocks or changes success state. */
  async captureTransaction(client: PublicClient, account: Address, chainId: number): Promise<boolean> {
    try {
      if (await client.getChainId() !== chainId) return false;
      const record = await this.get(account, chainId);
      if (!record?.txHash || !record.locked) return false;
      // Keep the ORIGINAL action fingerprint through any number of speed-ups/cancellations.
      if (record.nonce !== undefined && record.input !== undefined && record.value !== undefined) return true;
      const transaction = await client.getTransaction({ hash: record.txHash });
      if (!isAddressEqual(transaction.from, account) || transaction.hash.toLowerCase() !== record.txHash.toLowerCase()) return false;
      await this.update(record, { nonce: transaction.nonce, to: transaction.to, input: transaction.input, value: transaction.value }, record.status);
      return true;
    } catch { return false; }
  }
  /** Explicit recovery for a wallet-provided speed-up/cancel hash. Same sender AND nonce
   * prove replacement; same destination/calldata/value prove the original action ran.
   * A different call can release the original action only after canonical confirmation.
   */
  async reconcileReplacement(client: PublicClient, account: Address, chainId: number, replacementHash: Hash) {
    if (await client.getChainId() !== chainId) throw new Error('RPC chain mismatch');
    const record = await this.get(account, chainId);
    if (!record?.locked || !record.txHash || record.nonce === undefined || record.input === undefined || record.value === undefined) throw new Error('Cannot prove replacement: original transaction metadata unavailable');
    const replacement = await client.getTransaction({ hash: replacementHash });
    if (!isAddressEqual(replacement.from, account) || replacement.nonce !== record.nonce || replacement.hash.toLowerCase() !== replacementHash.toLowerCase()) throw new Error('Unverified replacement sender/nonce/hash');
    const identical = replacement.to?.toLowerCase() === record.to?.toLowerCase()
      && replacement.input.toLowerCase() === record.input.toLowerCase() && replacement.value === record.value;
    await this.update(record, { txHash: replacementHash, originalTxHash: record.originalTxHash ?? record.txHash,
      replacementKind: identical ? 'repriced' : 'cancelled-or-replaced', status: 'submitted' }, record.status);
    return this.reconcile(client, account, chainId);
  }
  async submit(record: TxRecord, send: () => Promise<Hash>): Promise<Hash> {
    const current = await this.get(record.account, record.chainId);
    if (current?.id !== record.id || current.status !== 'idle') throw new Error('Stale transaction attempt');
    await this.update(record, { status: 'awaiting-signature' }, 'idle'); // atomic claim before wallet call
    let hash: Hash | undefined;
    try {
      hash = await send();
      await this.update(record, { status: 'submitted', txHash: hash }); // approval still is not supply
      return hash;
    } catch (error) {
      try { await this.update(record, { status: userRejected(error) && !hash ? 'rejected' : 'unknown', locked: !userRejected(error) || !!hash, ...(hash ? { txHash: hash } : {}) }); }
      catch { /* Existing awaiting-signature record still blocks recovery. Never claim durability. */ }
      if (hash) throw new Error(`Broadcast ${hash}, but journal update failed; do not retry`, { cause: error });
      throw error;
    }
  }
}
export async function openTxStore(name = 'nestflow-transactions'): Promise<TxStore> {
  try {
    const db = await openDB<JournalDB>(name, 1, { upgrade(database) { database.createObjectStore('attempts', { keyPath: 'scope' }); } });
    return new TxStore(db);
  } catch (error) { throw new Error('IndexedDB unavailable; transaction recovery cannot be persisted. Actions disabled.', { cause: error }); }
}
