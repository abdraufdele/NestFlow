import { isRejected, walletRequest, type WalletProvider } from './wallet';
import { createPublicClient, custom, formatUnits, isAddress, type Address } from 'viem';
import { polygon } from 'viem/chains';
import { DOCUMENTED, resolveAaveConfig } from '../config/aave';
import { tokenAbi } from '../config/abi';
import { readPosition } from './aave';
export type Provider = WalletProvider;
export type Rows = Record<string, string>;
export function message(error: unknown): string {
  if (isRejected(error)) { console.error('Wallet request failed', error); return 'Rejected. The wallet request was declined. You can choose to try again.'; }
  const e = error as { message?: string; code?: unknown } | null;
  return `${e?.code === undefined ? '' : `Code ${String(e.code)}: `}${e?.message ?? String(error)}`;
}
export function bounded<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out; outcome unavailable. Refresh to retry reads.')), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
const reads = new Set(['eth_chainId', 'eth_accounts', 'eth_getBalance', 'eth_call', 'eth_getBlockByNumber', 'eth_getCode', 'eth_blockNumber']);
export function readOnlyProvider(provider: Provider): Provider {
  return { request: async args => {
    if (!reads.has(args.method)) throw new Error(`Read-only probe blocked ${args.method}`);
    return bounded(Promise.resolve().then(() => walletRequest(provider, args)));
  } };
}
export async function probe(injected?: Provider): Promise<Rows> {
  const rows: Rows = {
    provider: injected && typeof injected.request === 'function' ? 'Present (request function)' : 'window.ethereum unavailable',
    accounts: 'Unavailable: account read not completed', chainId: 'Unavailable: chain read not completed',
    eth_chainId: 'Unavailable: provider missing', eth_accounts: 'Unavailable: provider missing',
    eth_sendTransaction: 'Runtime support unverified: documented by Nimiq; intentionally never invoked. No safe documented introspection API.',
    USDT: 'Unavailable: requires Polygon and an account', POL: 'Unavailable: requires Polygon and an account',
    position: 'Unavailable: requires Polygon and an account',
  };
  if (!injected || typeof injected.request !== 'function') return rows;
  const provider = readOnlyProvider(injected);
  let account: Address | undefined;
  let polygonChain = false;
  await Promise.all([
    (async () => {
      try {
        const chain = await walletRequest(provider, { method: 'eth_chainId' });
        if (typeof chain !== 'string' || !/^0x[0-9a-f]+$/i.test(chain)) throw new Error('Invalid chainId response');
        polygonChain = BigInt(chain) === 137n;
        rows.chainId = `${chain} (${BigInt(chain)})${polygonChain ? ' Polygon' : ' — Wrong chain: Polygon 137 required; reads blocked'}`;
        rows.eth_chainId = 'Supported: valid response observed';
      } catch (e) { rows.eth_chainId = rows.chainId = `Failed: ${message(e)}`; }
    })(),
    (async () => {
      try {
        const accounts = await walletRequest(provider, { method: 'eth_accounts' });
        if (!Array.isArray(accounts) || !accounts.every(a => typeof a === 'string' && isAddress(a))) throw new Error('Invalid accounts response');
        account = accounts[0];
        rows.accounts = accounts.length ? `${accounts.join(', ')} (reading first account)` : 'Disconnected: no authorized accounts; use Connect';
        rows.eth_accounts = 'Supported: valid response observed';
      } catch (e) { rows.eth_accounts = rows.accounts = `Failed: ${message(e)}`; }
    })(),
  ]);
  if (!polygonChain || !account) return rows;
  const selected = account;
  const client = createPublicClient({ chain: polygon, transport: custom(provider, { retryCount: 0 }) });
  async function capture(label: string, read: () => Promise<string>) {
    try { rows[label] = await bounded(read()); } catch (e) { rows[label] = `Failed: ${message(e)}`; }
  }
  await Promise.all([
    capture('USDT', async () => `${formatUnits(await client.readContract({ address: DOCUMENTED.underlying, abi: tokenAbi, functionName: 'balanceOf', args: [selected] }), 6)} USDT/USDT0 (configured underlying token ${DOCUMENTED.underlying})`),
    capture('POL', async () => {
      const pol = await client.getBalance({ address: selected });
      return `${formatUnits(pol, 18)} POL${pol === 0n ? ' — Missing POL: gas required; no transactions available here' : ' — Gas sufficiency not estimated by this probe'}`;
    }),
    capture('position', async () => {
      const config = await resolveAaveConfig(client);
      const p = await readPosition(client, config, selected);
      return `${formatUnits(p.supplied, 6)} supplied USDT; debt base units: ${p.totalDebtBase}; collateral enabled: ${p.collateralEnabled}; block ${p.blockNumber}; ${new Date(Number(p.timestamp) * 1000).toISOString()}. Balance is not a withdrawability check.`;
    }),
  ]);
  // Hosts need not emit events. Recheck identity before publishing any balances.
  try {
    const [chain, accounts] = await Promise.all([walletRequest(provider, { method: 'eth_chainId' }), walletRequest(provider, { method: 'eth_accounts' })]);
    if (typeof chain !== 'string' || BigInt(chain) !== 137n || !Array.isArray(accounts) || accounts[0]?.toLowerCase() !== selected.toLowerCase()) throw new Error('Account or chain changed during reads; refresh');
  } catch (e) {
    for (const key of ['USDT', 'POL', 'position']) rows[key] = `Unavailable: ${message(e)}`;
  }
  return rows;
}
