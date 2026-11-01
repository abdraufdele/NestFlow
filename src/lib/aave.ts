import { isAddressEqual, type Address, type Hash, type PublicClient, type WalletClient } from 'viem';
import { polygon } from 'viem/chains';
import { dataAbi, poolAbi, tokenAbi } from '../config/abi';
import { resolveAaveConfig, type AaveConfig } from '../config/aave';
import { MAX_UINT256 } from './math';
import type { TxAction, TxStore } from './txStore';
const RAY = 10n ** 27n;
export interface Observation { blockNumber: bigint; timestamp: bigint }
export interface Position extends Observation {
  wallet: bigint; supplied: bigint; polWei: bigint; totalDebtBase: bigint; totalCollateralBase: bigint;
  healthFactor: bigint; collateralEnabled: boolean;
}
export interface ReserveState extends Observation {
  active: boolean; frozen: boolean; paused: boolean; supplyCap: bigint; borrowCap: bigint;
  totalSupplyWithTreasury: bigint; liquidity: bigint; liquidityRateRay: bigint;
}
async function observation(client: PublicClient, blockNumber?: bigint): Promise<Observation> {
  if (await client.getChainId() !== 137) throw new Error('Polygon chain 137 required');
  const block = await client.getBlock(blockNumber === undefined ? {} : { blockNumber });
  if (block.number === null) throw new Error('Mined block required');
  return { blockNumber: block.number, timestamp: block.timestamp };
}
export async function readPosition(client: PublicClient, config: AaveConfig, account: Address, blockNumber?: bigint): Promise<Position> {
  const observed = await observation(client, blockNumber);
  const [wallet, polWei, user, data] = await Promise.all([
    client.readContract({ address: config.underlying, abi: tokenAbi, functionName: 'balanceOf', args: [account], blockNumber: observed.blockNumber }),
    client.getBalance({ address: account, blockNumber: observed.blockNumber }),
    client.readContract({ address: config.dataProvider, abi: dataAbi, functionName: 'getUserReserveData', args: [config.underlying, account], blockNumber: observed.blockNumber }),
    client.readContract({ address: config.pool, abi: poolAbi, functionName: 'getUserAccountData', args: [account], blockNumber: observed.blockNumber }),
  ]);
  return { ...observed, wallet, supplied: user[0], polWei, totalDebtBase: data[1], totalCollateralBase: data[0], healthFactor: data[5], collateralEnabled: user[8] };
}
export async function readReserveState(client: PublicClient, config: AaveConfig, blockNumber?: bigint): Promise<ReserveState> {
  const observed = await observation(client, blockNumber);
  const args = [config.underlying] as const;
  const [flags, paused, caps, data, liquidity, normalizedIncome] = await Promise.all([
    client.readContract({ address: config.dataProvider, abi: dataAbi, functionName: 'getReserveConfigurationData', args, blockNumber: observed.blockNumber }),
    client.readContract({ address: config.dataProvider, abi: dataAbi, functionName: 'getPaused', args, blockNumber: observed.blockNumber }),
    client.readContract({ address: config.dataProvider, abi: dataAbi, functionName: 'getReserveCaps', args, blockNumber: observed.blockNumber }),
    client.readContract({ address: config.dataProvider, abi: dataAbi, functionName: 'getReserveData', args, blockNumber: observed.blockNumber }),
    client.readContract({ address: config.underlying, abi: tokenAbi, functionName: 'balanceOf', args: [config.aToken], blockNumber: observed.blockNumber }),
    client.readContract({ address: config.pool, abi: poolAbi, functionName: 'getReserveNormalizedIncome', args, blockNumber: observed.blockNumber }),
  ]);
  if (flags[0] !== BigInt(config.decimals)) throw new Error('Reserve decimals changed');
  const unit = 10n ** BigInt(config.decimals);
  // Unminted treasury aTokens consume supply cap too. Round conservatively upward.
  const treasury = (data[1] * normalizedIncome + RAY - 1n) / RAY;
  return { ...observed, active: flags[8], frozen: flags[9], paused, supplyCap: caps[1] * unit,
    borrowCap: caps[0] * unit, totalSupplyWithTreasury: data[2] + treasury, liquidity, liquidityRateRay: data[5] };
}
function common(amount: bigint, position: Position, reserve: ReserveState) {
  const reasons: string[] = [];
  if (amount <= 0n || amount > MAX_UINT256) reasons.push('invalid-amount');
  if (!reserve.active) reasons.push('reserve-inactive');
  if (reserve.paused) reasons.push('reserve-paused');
  if (position.polWei === 0n) reasons.push('insufficient-POL');
  return reasons;
}
export function evaluateSupply(amount: bigint, position: Position, reserve: ReserveState) {
  const reasons = common(amount, position, reserve);
  if (reserve.frozen) reasons.push('reserve-frozen');
  if (amount > position.wallet) reasons.push('wallet-balance');
  if (reserve.supplyCap !== 0n && amount + reserve.totalSupplyWithTreasury > reserve.supplyCap) reasons.push('supply-cap');
  return { amount, reasons };
}
export function evaluateWithdraw(requested: bigint, position: Position, reserve: ReserveState) {
  const amount = requested === MAX_UINT256 ? position.supplied : requested;
  const reasons = common(amount, position, reserve);
  if (amount > position.supplied) reasons.push('position-balance');
  if (amount > reserve.liquidity) reasons.push('reserve-liquidity');
  return { amount, reasons, requiresSimulation: position.totalDebtBase > 0n && position.collateralEnabled };
}
export function approvalSteps(allowance: bigint, amount: bigint): bigint[] {
  if (allowance < 0n || amount <= 0n || amount >= MAX_UINT256) throw new Error('Exact finite approval required');
  return allowance >= amount ? [] : allowance === 0n ? [amount] : [0n, amount];
}
export async function readAllowance(client: PublicClient, config: AaveConfig, account: Address, blockNumber?: bigint) {
  if (await client.getChainId() !== 137) throw new Error('Polygon chain 137 required');
  return client.readContract({ address: config.underlying, abi: tokenAbi, functionName: 'allowance', args: [account, config.pool], ...(blockNumber === undefined ? {} : { blockNumber }) });
}
async function snapshot(client: PublicClient, config: AaveConfig, account: Address) {
  const observed = await observation(client);
  const [position, reserve] = await Promise.all([readPosition(client, config, account, observed.blockNumber), readReserveState(client, config, observed.blockNumber)]);
  return { position, reserve, ...observed };
}
export async function checkSupplyEligibility(client: PublicClient, config: AaveConfig, account: Address, amount: bigint) {
  const state = await snapshot(client, config, account);
  return { ...state, ...evaluateSupply(amount, state.position, state.reserve), checksPassed: evaluateSupply(amount, state.position, state.reserve).reasons.length === 0, simulation: 'required-before-send' as const };
}
export async function checkWithdrawEligibility(client: PublicClient, config: AaveConfig, account: Address, amount: bigint) {
  const state = await snapshot(client, config, account);
  const result = evaluateWithdraw(amount, state.position, state.reserve);
  if (result.reasons.length === 0) {
    try { await client.simulateContract({ address: config.pool, abi: poolAbi, functionName: 'withdraw', args: [config.underlying, amount, account], account, blockNumber: state.blockNumber }); }
    catch { result.reasons.push('withdraw-simulation-failed'); }
  }
  return { ...state, ...result, checksPassed: result.reasons.length === 0 };
}
export interface ActionContext {
  client: PublicClient; wallet: WalletClient; account: Address; store: TxStore;
  /** Required by the caller. A local-fork context also verifies Anvil before any wallet request. */
  execution: 'local-fork' | 'explicit-mainnet';
}
async function assertWallet(context: ActionContext) {
  const { client, wallet, account } = context;
  if (await client.getChainId() !== 137 || await wallet.getChainId() !== 137) throw new Error('Polygon chain 137 required');
  const addresses = await wallet.getAddresses();
  if (!addresses[0] || !isAddressEqual(addresses[0], account)) throw new Error('Wallet account changed');
  if (context.execution === 'local-fork') {
    const [readerVersion, senderVersion] = await Promise.all([
      client.request({ method: 'web3_clientVersion' }), wallet.transport.request({ method: 'web3_clientVersion' }),
    ]);
    if (typeof senderVersion !== 'string' || !senderVersion.toLowerCase().includes('anvil') || !readerVersion.toLowerCase().includes('anvil')) throw new Error('Local fork execution requires Anvil on both reader and wallet transports');
  } else if (context.execution !== 'explicit-mainnet') throw new Error('Explicit mainnet authorization required');
}
/** Gas limit padded 20%, multiplied by maxFeePerGas (or legacy gasPrice), all POL wei. */
export async function estimatePolCost(client: PublicClient, gasEstimate: bigint) {
  const fees = await client.estimateFeesPerGas();
  const gas = (gasEstimate * 120n + 99n) / 100n;
  const feePerGas = fees.maxFeePerGas ?? fees.gasPrice;
  if (feePerGas === undefined) throw new Error('Gas price unavailable');
  return { gas, feePerGas, polWei: gas * feePerGas };
}
async function execute(context: ActionContext, action: TxAction, amount: bigint): Promise<Hash> {
  await assertWallet(context);
  await context.store.reconcile(context.client, context.account, 137);
  const attempt = await context.store.begin(context.account, 137, action, amount);
  let send: () => Promise<Hash>;
  try {
    // Re-resolve before each action, and use fresh account/reserve observations.
    const config = await resolveAaveConfig(context.client);
    const { client, wallet, account } = context;
    let gasEstimate: bigint;
    let rawSend: (gas: bigint) => Promise<Hash>;
    if (action === 'approve') {
      if (amount < 0n || amount >= MAX_UINT256) throw new Error('Exact finite approval required');
      const allowance = await readAllowance(client, config, account);
      if (amount > 0n && allowance !== 0n) throw new Error('Confirm a zero-reset approval before exact approval');
      const simulation = await client.simulateContract({ address: config.underlying, abi: tokenAbi, functionName: 'approve', args: [config.pool, amount], account });
      if (simulation.result !== true) throw new Error('Token refused approval');
      gasEstimate = await client.estimateContractGas(simulation.request);
      rawSend = gas => wallet.writeContract({ ...simulation.request, account, chain: polygon, gas });
    } else if (action === 'supply') {
      const eligibility = await checkSupplyEligibility(client, config, account, amount);
      if (!eligibility.checksPassed) throw new Error(eligibility.reasons.join(', '));
      if (await readAllowance(client, config, account) < amount) throw new Error('Confirm exact approval before supply');
      const simulation = await client.simulateContract({ address: config.pool, abi: poolAbi, functionName: 'supply', args: [config.underlying, amount, account, 0], account });
      gasEstimate = await client.estimateContractGas(simulation.request);
      rawSend = gas => wallet.writeContract({ ...simulation.request, account, chain: polygon, gas });
    } else {
      const eligibility = await checkWithdrawEligibility(client, config, account, amount);
      if (!eligibility.checksPassed) throw new Error(eligibility.reasons.join(', '));
      const simulation = await client.simulateContract({ address: config.pool, abi: poolAbi, functionName: 'withdraw', args: [config.underlying, amount, account], account });
      gasEstimate = await client.estimateContractGas(simulation.request);
      rawSend = gas => wallet.writeContract({ ...simulation.request, account, chain: polygon, gas });
    }
    const cost = await estimatePolCost(client, gasEstimate);
    if (await client.getBalance({ address: account }) < cost.polWei) throw new Error('Insufficient POL for estimated transaction cost');
    await assertWallet(context); // detect chain/account changes during async preflight
    send = () => rawSend(cost.gas);
  } catch (error) { await context.store.cancelPreflight(attempt); throw error; }
  const hash = await context.store.submit(attempt, send);
  await context.store.captureTransaction(context.client, context.account, 137);
  return hash;
}
/** Each call is one separately confirmed action; zero-reset is a separate approve(0). */
export const approve = (context: ActionContext, exactAmount: bigint) => execute(context, 'approve', exactAmount);
export const supply = (context: ActionContext, amount: bigint) => execute(context, 'supply', amount);
export const withdraw = (context: ActionContext, amount: bigint) => execute(context, 'withdraw', amount);
