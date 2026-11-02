import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createPublicClient, createWalletClient, http, parseAbi, type Address, type PublicClient } from 'viem';
import { polygon } from 'viem/chains';
import 'fake-indexeddb/auto';
import { resolveAaveConfig } from '../src/config/aave';
import { poolAbi, tokenAbi } from '../src/config/abi';
import { approve, supply, withdraw, readPosition, readAllowance } from '../src/lib/aave';
import { readHistory } from '../src/lib/history';
import { readPolQuote } from '../src/lib/quote';
import { openTxStore } from '../src/lib/txStore';
import { formatAmount, MAX_UINT256 } from '../src/lib/math';

const missing = ['forge', 'anvil'].filter(tool => spawnSync(tool, ['--version'], { stdio: 'ignore', windowsHide: true }).status !== 0);
if (missing.length) console.error(`Missing ${missing.join(', ')}. Install Foundry (forge and anvil): https://getfoundry.sh/introduction/installation/ and add its bin directory to PATH.`);
if (!process.env.POLYGON_RPC_URL) console.error('Set POLYGON_RPC_URL to a Polygon RPC endpoint with fork/archive access.');
if (missing.length || !process.env.POLYGON_RPC_URL) process.exit(1);
const rpc = process.env.POLYGON_RPC_URL;
let anvil: ChildProcess | undefined;
const journal = await openTxStore(`fork-${Date.now()}`);
try {
  const port = await new Promise<number>((resolve, reject) => {
    const server = createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => typeof address === 'object' && address ? resolve(address.port) : reject(new Error('No local port'))); });
  });
  const local = `http://127.0.0.1:${port}`;
  const args = ['--host', '127.0.0.1', '--port', port.toString(), '--chain-id', '137', '--fork-url', rpc, '--silent'];
  if (process.env.POLYGON_FORK_BLOCK) {
    if (!/^\d+$/.test(process.env.POLYGON_FORK_BLOCK)) throw new Error('Invalid POLYGON_FORK_BLOCK');
    args.push('--fork-block-number', process.env.POLYGON_FORK_BLOCK);
  }
  // No shell interpolation; do not print credential-bearing RPC URL or child logs.
  anvil = spawn('anvil', args, { stdio: 'ignore', windowsHide: true });
  let startupError = false; anvil.on('error', () => { startupError = true; });
  const startupClient = createPublicClient({ chain: polygon, transport: http(local, { retryCount: 0, timeout: 2000 }), cacheTime: 0 });
  let started = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (startupError || anvil.exitCode !== null) throw new Error('Anvil failed to start');
    try { if (await startupClient.getChainId() === 137) { started = true; break; } } catch { /* bounded startup retry */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!started) throw new Error('Anvil startup timed out');
  // Fork reads lazily fetch upstream state and can exceed the short startup probe deadline.
  const client = createPublicClient({ chain: polygon, transport: http(local, { retryCount: 1, timeout: 30_000 }), cacheTime: 0 });
  const config = await resolveAaveConfig(client);
  console.log(`Verified Polygon config at fork block ${config.blockNumber}, reserve ${config.symbol}, decimals ${config.decimals}`);
  // Real quote must succeed; never turn a failed/rate-limited fork read into a pass.
  let usdtTimestampError: unknown;
  const observedClient = { ...client, readContract: async (args: Parameters<PublicClient['readContract']>[0]) => {
    try { return await client.readContract(args); }
    catch (error) {
      if (args.functionName === 'latestRoundData') {
        const message = error instanceof Error ? error.message : String(error);
        if (/429|rate.?limit|too many requests|quota|compute units/i.test(message)) { usdtTimestampError = new Error('RPC rate-limited source timestamp read; fork verification cannot pass.'); throw usdtTimestampError; }
        usdtTimestampError = error;
      }
      throw error;
    }
  } } as unknown as PublicClient;
  const quote = await readPolQuote(observedClient);
  // Optional USDT timestamp errors are labeled, but upstream rate limits are not
  // evidence of an unsupported interface and must be reported as a failed run.
  if (usdtTimestampError instanceof Error && /429|rate.?limit|too many requests|quota|compute units/i.test(usdtTimestampError.message)) throw usdtTimestampError;
  assert(quote.usdtPerPol > 0n);
  assert.deepEqual(quote.feedAgeWarnings, quote.usdtUpdatedAt === null ? ['USDT price feed age unverified'] : []);
  console.log(`Actual on-chain WPOL/USDT quote: ${quote.usdtPerPol} USDT base units/POL = ${formatAmount(quote.usdtPerPol, 6)} USDT/POL; block ${quote.blockNumber}; WPOL updated ${quote.polUpdatedAt}; USDT updated ${quote.usdtUpdatedAt ?? 'unverified'}; ${quote.feedAgeWarnings.join('; ') || 'both feed ages verified'}`);
  // Controlled timestamp scenarios reuse real fork oracle/config/price reads.
  // They are policy tests, not claims that both deployed feeds expose timestamps.
  function scenarioClient(scenario: 'wpol-stale' | 'usdt-unverified' | 'both-fresh'): PublicClient {
    return { ...client, readContract: async (args: Parameters<PublicClient['readContract']>[0]) => {
      if (args.functionName === 'latestRoundData') {
        const isPol = args.address?.toLowerCase() === quote.polSource.toLowerCase();
        if (!isPol && scenario !== 'both-fresh') throw new Error('USDT latestRoundData unsupported in scenario');
        const updated = scenario === 'wpol-stale' && isPol ? quote.observedAt - 3601n : quote.observedAt;
        return [1n, 1n, 1n, updated, 1n];
      }
      return client.readContract(args);
    } } as unknown as PublicClient;
  }
  await assert.rejects(readPolQuote(scenarioClient('wpol-stale')), /feed/i);
  const unverified = await readPolQuote(scenarioClient('usdt-unverified'));
  assert.equal(unverified.usdtPerPol, quote.usdtPerPol);
  assert.equal(unverified.usdtUpdatedAt, null);
  assert.deepEqual(unverified.feedAgeWarnings, ['USDT price feed age unverified']);
  const fresh = await readPolQuote(scenarioClient('both-fresh'));
  assert.equal(fresh.usdtPerPol, quote.usdtPerPol);
  assert.deepEqual(fresh.feedAgeWarnings, []);
  assert.equal(fresh.usdtUpdatedAt, quote.observedAt);
  console.log('PASS: fork-backed timestamp scenarios: WPOL stale unavailable; USDT unverified available with label; both fresh available without label');
  const result = spawnSync('forge', ['test', '--fork-url', local, '--match-path', 'test/PolygonFork.t.sol', '-vv'], {
    env: { ...process.env, FORK_USDT: config.underlying, FORK_ATOKEN: config.aToken, FORK_POOL: config.pool },
    encoding: 'utf8', windowsHide: true, timeout: 240_000,
  });
  // Only local RPC is used by Forge; redact upstream URL if a tool echoes its environment.
  console.log(`${result.stdout ?? ''}${result.stderr ?? ''}`.replaceAll(rpc, '[RPC redacted]'));
  if (result.status !== 0) throw new Error('Foundry Polygon fork test failed');

  // Exercise the actual TS library against the same real contracts on Anvil too.
  const accounts = await client.transport.request({ method: 'eth_accounts' }) as Address[];
  const account = accounts[0];
  if (!account) throw new Error('Anvil has no unlocked test account');
  const admin = (method: string, params: unknown[]) => client.transport.request({ method, params });
  await admin('anvil_setBalance', [account, '0x8ac7230489e80000']);
  await admin('anvil_impersonateAccount', [account]);
  await admin('anvil_impersonateAccount', [config.aToken]);
  await admin('anvil_setBalance', [config.aToken, '0x8ac7230489e80000']);
  const fixtureWallet = createWalletClient({ chain: polygon, transport: http(local), account: config.aToken });
  const historyFromBlock = (await client.getBlockNumber({ cacheTime: 0 })) + 1n;
  const funding = await fixtureWallet.writeContract({ address: config.underlying, abi: parseAbi(['function transfer(address,uint256) returns (bool)']), functionName: 'transfer', args: [account, 10_000_000n] });
  await client.waitForTransactionReceipt({ hash: funding });
  const wallet = createWalletClient({ chain: polygon, transport: http(local), account });
  const context = { client, wallet, account, store: journal, execution: 'local-fork' as const };
  async function confirm(hash: `0x${string}`) {
    await client.waitForTransactionReceipt({ hash }); await admin('anvil_mine', ['0x1']);
    const record = await journal.reconcile(client, account, 137);
    if (record?.status !== 'confirmed') throw new Error('TS action was not confirmed');
  }
  await confirm(await approve(context, 10_000_000n));
  if (await readAllowance(client, config, account) !== 10_000_000n) throw new Error('Approval amount mismatch');
  if ((await readPosition(client, config, account)).supplied !== 0n) throw new Error('Approval changed position');
  await confirm(await supply(context, 10_000_000n));
  const supplied = (await readPosition(client, config, account)).supplied;
  if (supplied < 9_999_999n || supplied > 10_000_001n) throw new Error('Supplied balance mismatch');
  await confirm(await withdraw(context, 5_000_000n));
  await confirm(await withdraw(context, MAX_UINT256));
  if ((await readPosition(client, config, account)).supplied !== 0n) throw new Error('Full withdrawal left aToken balance');
  const cash = await client.readContract({ address: config.underlying, abi: tokenAbi, functionName: 'balanceOf', args: [account] });
  const income = await client.readContract({ address: config.pool, abi: poolAbi, functionName: 'getReserveNormalizedIncome', args: [config.underlying] });
  // Mint floor + partial burn ceil + final balance floor lose less than 2*index/RAY+1.
  // Integer loss is at most ceil(2*index/RAY); any accrued interest only increases cash.
  const roundingBudget = (2n * income + 10n ** 27n - 1n) / 10n ** 27n;
  if (cash < 10_000_000n - roundingBudget) throw new Error('Round-trip USDT exceeds protocol rounding loss');
  const history = await readHistory(client, account, historyFromBlock);
  if (history.events.filter(e => e.action === 'supply').length !== 1 || history.events.filter(e => e.action === 'withdraw').length !== 2 || history.supplied !== 0n || history.earnings !== null) throw new Error('Confirmed event history mismatch');
  console.log(`PASS: confirmed Pool history (one supply, two withdrawals), independent zero balance and unavailable earnings through block ${history.toBlock}`);
  console.log('PASS: viem approve / supply / partial and full withdraw / journal reconciliation on Anvil');
} catch (error) {
  console.error(error instanceof Error ? error.message.replaceAll(rpc, '[RPC redacted]') : 'Fork test failed'); process.exitCode = 1;
} finally { journal.close(); anvil?.kill(); }
