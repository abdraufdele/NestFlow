import { createPublicClient, createWalletClient, custom, isAddress, type Address, type EIP1193Provider, type Hash } from 'viem';
import { polygon } from 'viem/chains';
import { resolveAaveConfig } from '../config/aave';
import { poolAbi, tokenAbi } from '../config/abi';
import { approve, supply, withdraw, readPosition, readReserveState, readAllowance, estimatePolCost, checkWithdrawEligibility } from './aave';
import { readHistory } from './history';
import { readPolQuote, type OracleQuote } from './quote';
import { openTxStore, type TxAction, type TxRecord } from './txStore';

/** Shared EIP-1193 boundary for the installed host and test transports. */
export interface WalletProvider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, callback: () => void): void;
  removeListener?(event: string, callback: () => void): void;
}
export function getInjectedProvider(): WalletProvider | undefined {
  return typeof window === 'undefined' ? undefined : (window as Window & { ethereum?: WalletProvider }).ethereum;
}
export function walletRequest(provider: WalletProvider, args: { method: string; params?: unknown }) {
  const result = Promise.resolve().then(() => provider.request(args));
  // Never time out a native dialog: a timeout cannot cancel permission or broadcast.
  if (['eth_requestAccounts', 'wallet_switchEthereumChain', 'personal_sign', 'eth_sendTransaction'].includes(args.method)) return result;
  return new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out reading wallet state. Refresh to retry reads.')), 15000);
    result.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export function injectedWallet(provider?: EIP1193Provider) {
  const injected = provider ?? getInjectedProvider();
  if (!injected) throw new Error('Injected window.ethereum provider unavailable');
  return createWalletClient({ chain: polygon, transport: custom(injected, { retryCount: 0 }) });
}
export function isRejected(error: unknown): boolean {
  const seen = new Set<unknown>();
  while (error && typeof error === 'object' && !seen.has(error)) {
    seen.add(error);
    const e = error as { code?: number; cause?: unknown };
    if (e.code === 4001) return true;
    error = e.cause;
  }
  return false;
}
export interface Identity { account: Address; chainId: 137 }
export type WalletSnapshot = Awaited<ReturnType<ReturnType<typeof createWalletAdapter>['read']>>;
export type FeePreview = { approval: bigint | null; supply: bigint | null; exit: bigint | null };
export interface WalletAdapter {
  transactionsEnabled: boolean;
  connect(): Promise<Identity>;
  identity(): Promise<Identity>;
  read(account: Address): Promise<{
    account: Address; config: Awaited<ReturnType<typeof resolveAaveConfig>>;
    position: Awaited<ReturnType<typeof readPosition>>; reserve: Awaited<ReturnType<typeof readReserveState>>;
    allowance: bigint; record?: TxRecord; quote?: OracleQuote;
  }>;
  history(account: Address): ReturnType<typeof readHistory>;
  replacement(account: Address, hash: Hash): Promise<TxRecord | undefined>;
  fees(account: Address, amount: bigint, allowance: bigint): Promise<FeePreview>;
  eligibility(account: Address, amount: bigint): ReturnType<typeof checkWithdrawEligibility>;
  transact(action: TxAction, amount: bigint, account: Address, submitted: (hash: Hash) => void): Promise<TxRecord | undefined>;
  sign(account: Address, message: string): Promise<unknown>;
  subscribe(invalidate: () => void): () => void;
}
export function assertFundedTestAmount(amount: bigint) {
  if (amount < 0n || amount > 5_000_000n) throw new Error('Funded test is capped at 5 USDT per action.');
}
export function createWalletAdapter(provider: WalletProvider, options: { localTest?: boolean; pollMs?: number; polls?: number } = {}): WalletAdapter {
  // Real sends require an explicit private build opt-in; public builds default off.
  // E2E mode still verifies Anvil on both transports before every send.
  const localExecution = import.meta.env.MODE === 'e2e' && options.localTest === true;
  const fundedBuild = import.meta.env.VITE_ENABLE_FUNDED_TEST_SENDS === 'true';
  const transactionsEnabled = localExecution || fundedBuild;
  const transport = { request: (args: { method: string; params?: unknown }) => walletRequest(provider, args) };
  const client = createPublicClient({ chain: polygon, transport: custom(transport, { retryCount: 0 }), cacheTime: 0, pollingInterval: 500 });
  const wallet = injectedWallet(transport as EIP1193Provider);
  let journal: ReturnType<typeof openTxStore> | undefined;
  const store = () => journal ??= openTxStore();
  async function identity(): Promise<Identity> {
    const accounts = await walletRequest(provider, { method: 'eth_accounts' });
    const chain = await walletRequest(provider, { method: 'eth_chainId' });
    if (!Array.isArray(accounts) || !accounts.length) throw new Error('Disconnected. Connect your wallet again.');
    if (typeof accounts[0] !== 'string' || !isAddress(accounts[0])) throw new Error('Invalid wallet account');
    if (typeof chain !== 'string' || !/^0x[0-9a-f]+$/i.test(chain) || BigInt(chain) !== 137n) throw new Error('Wrong chain. Polygon 137 required. Connect again to request a switch.');
    return { account: accounts[0], chainId: 137 };
  }
  async function assertAccount(account: Address) {
    if ((await identity()).account.toLowerCase() !== account.toLowerCase()) throw new Error('Account changed. Refresh before continuing.');
  }
  const adapter: WalletAdapter = {
    transactionsEnabled,
    async connect() {
      await walletRequest(provider, { method: 'eth_requestAccounts' });
      const chain = await walletRequest(provider, { method: 'eth_chainId' });
      if (chain !== '0x89') await walletRequest(provider, { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] });
      return identity(); // Native switch resolution alone is not authoritative.
    },
    identity,
    async read(account) {
      await assertAccount(account);
      const record = await (await store()).reconcile(client, account, 137);
      const config = await resolveAaveConfig(client);
      const position = await readPosition(client, config, account);
      const [reserve, allowance] = await Promise.all([
        readReserveState(client, config, position.blockNumber), readAllowance(client, config, account, position.blockNumber),
      ]);
      const quote = await readPolQuote(client).catch(() => undefined);
      await assertAccount(account);
      if (Date.now() - Number(position.timestamp) * 1000 > 60_000) throw new Error('Stale data. Refresh before continuing.');
      return { account, config, position, reserve, allowance, record, quote };
    },
    async history(account) {
      await assertAccount(account);
      const result = await readHistory(client, account);
      await assertAccount(account);
      return result;
    },
    async replacement(account, hash) {
      await assertAccount(account);
      const journal = await store();
      await journal.reconcile(client, account, 137);
      const result = await journal.reconcileReplacement(client, account, 137, hash);
      await assertAccount(account);
      return result;
    },
    async fees(account, amount, allowance) {
      await assertAccount(account);
      const config = await resolveAaveConfig(client);
      async function estimate(request: Parameters<typeof client.estimateContractGas>[0]) {
        try { return (await estimatePolCost(client, await client.estimateContractGas(request))).polWei; }
        catch { return null; }
      }
      const [approval, entry, exit] = await Promise.all([
        allowance >= amount ? Promise.resolve(0n) : estimate({ account, address: config.underlying, abi: tokenAbi, functionName: 'approve', args: [config.pool, allowance > 0n ? 0n : amount] }),
        estimate({ account, address: config.pool, abi: poolAbi, functionName: 'supply', args: [config.underlying, amount, account, 0] }),
        estimate({ account, address: config.pool, abi: poolAbi, functionName: 'withdraw', args: [config.underlying, amount, account] }),
      ]);
      await assertAccount(account);
      return { approval, supply: entry, exit };
    },
    async eligibility(account, amount) {
      await assertAccount(account);
      const config = await resolveAaveConfig(client);
      const result = await checkWithdrawEligibility(client, config, account, amount);
      await assertAccount(account);
      return result;
    },
    async transact(action, amount, account, submitted) {
      if (!transactionsEnabled) throw new Error('Mainnet transactions disabled. Not verified on device.');
      if (!localExecution) assertFundedTestAmount(amount);
      await assertAccount(account);
      const journal = await store();
      const context = { client, wallet, account, store: journal, execution: localExecution ? 'local-fork' as const : 'explicit-mainnet' as const };
      const hash = await ({ approve, supply, withdraw })[action](context, amount);
      submitted(hash);
      for (let i = 0; i < (options.polls ?? 12); i++) {
        await assertAccount(account);
        const record = await journal.reconcile(client, account, 137);
        if (record && !record.locked) return record;
        await new Promise(resolve => setTimeout(resolve, options.pollMs ?? 500));
      }
      return journal.get(account, 137); // Unknown/pending stays locked. No automatic retry.
    },
    sign: (account, message) => walletRequest(provider, { method: 'personal_sign', params: [message, account] }),
    subscribe(invalidate) {
      provider.on?.('accountsChanged', invalidate); provider.on?.('chainChanged', invalidate);
      return () => { provider.removeListener?.('accountsChanged', invalidate); provider.removeListener?.('chainChanged', invalidate); };
    },
  };
  return adapter;
}
