import { isAddressEqual, zeroAddress, type Address, type PublicClient } from 'viem';
import { dataAbi, poolAbi, providerAbi, tokenAbi } from './abi';

/** Provenance checked 2026-10-31:
 * https://aave.com/docs/resources/addresses (official registry entry point)
 * https://github.com/aave-dao/aave-address-book/blob/main/src/AaveV3Polygon.sol
 * The book calls this reserve USDT0. Identity is the address, NOT a symbol lookup.
 * Constants are verification anchors, never a substitute for on-chain resolution.
 */
export const DOCUMENTED = {
  provider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
  pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  dataProvider: '0x243Aa95cAC2a25651eda86e80bEe66114413c43b',
  underlying: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  aToken: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620',
  variableDebtToken: '0xfb00AC187a8Eb5AFAE4eACE434F493Eb62672df7',
} as const satisfies Record<string, Address>;
export interface AaveConfig {
  chainId: 137; provider: Address; pool: Address; dataProvider: Address; underlying: Address;
  aToken: Address; variableDebtToken: Address; decimals: 6; symbol: string;
  blockNumber: bigint; timestamp: bigint;
}
function same(actual: Address, expected: Address, label: string) {
  if (!isAddressEqual(actual, expected)) throw new Error(`Unverified ${label}: documented address mismatch`);
}
export async function resolveAaveConfig(client: PublicClient): Promise<AaveConfig> {
  if (await client.getChainId() !== 137) throw new Error('Polygon chain 137 required');
  const block = await client.getBlock();
  const blockNumber = block.number;
  if (blockNumber === null) throw new Error('No mined observation block');
  const [pool, dataProvider] = await Promise.all([
    client.readContract({ address: DOCUMENTED.provider, abi: providerAbi, functionName: 'getPool', blockNumber }),
    client.readContract({ address: DOCUMENTED.provider, abi: providerAbi, functionName: 'getPoolDataProvider', blockNumber }),
  ]);
  same(pool, DOCUMENTED.pool, 'Pool'); same(dataProvider, DOCUMENTED.dataProvider, 'data provider');
  const [poolProvider, dataProviderOwner, reserves, tokens, decimals, symbol, configuration] = await Promise.all([
    client.readContract({ address: pool, abi: poolAbi, functionName: 'ADDRESSES_PROVIDER', blockNumber }),
    client.readContract({ address: dataProvider, abi: dataAbi, functionName: 'ADDRESSES_PROVIDER', blockNumber }),
    client.readContract({ address: pool, abi: poolAbi, functionName: 'getReservesList', blockNumber }),
    client.readContract({ address: dataProvider, abi: dataAbi, functionName: 'getReserveTokensAddresses', args: [DOCUMENTED.underlying], blockNumber }),
    client.readContract({ address: DOCUMENTED.underlying, abi: tokenAbi, functionName: 'decimals', blockNumber }),
    client.readContract({ address: DOCUMENTED.underlying, abi: tokenAbi, functionName: 'symbol', blockNumber }),
    client.readContract({ address: dataProvider, abi: dataAbi, functionName: 'getReserveConfigurationData', args: [DOCUMENTED.underlying], blockNumber }),
  ]);
  same(poolProvider, DOCUMENTED.provider, 'Pool provider'); same(dataProviderOwner, DOCUMENTED.provider, 'data provider owner');
  if (!reserves.some(address => isAddressEqual(address, DOCUMENTED.underlying))) throw new Error('USDT reserve not listed');
  same(tokens[0], DOCUMENTED.aToken, 'aToken'); same(tokens[2], DOCUMENTED.variableDebtToken, 'debt token');
  if (decimals !== 6 || configuration[0] !== 6n) throw new Error('Unverified USDT decimals');
  if (symbol !== 'USDT' && symbol !== 'USDT0') throw new Error('Unverified USDT symbol');
  const [underlying, aTokenPool, aTokenDecimals] = await Promise.all([
    client.readContract({ address: tokens[0], abi: tokenAbi, functionName: 'UNDERLYING_ASSET_ADDRESS', blockNumber }),
    client.readContract({ address: tokens[0], abi: tokenAbi, functionName: 'POOL', blockNumber }),
    client.readContract({ address: tokens[0], abi: tokenAbi, functionName: 'decimals', blockNumber }),
  ]);
  same(underlying, DOCUMENTED.underlying, 'aToken underlying'); same(aTokenPool, pool, 'aToken Pool');
  if (aTokenDecimals !== 6) throw new Error('Unverified aToken decimals');
  for (const address of [DOCUMENTED.provider, pool, dataProvider, underlying, tokens[0], tokens[2]]) {
    if (isAddressEqual(address, zeroAddress)) throw new Error('Zero contract address');
    const code = await client.getCode({ address, blockNumber });
    if (!code || code === '0x') throw new Error(`Missing contract bytecode: ${address}`);
  }
  return { chainId: 137, provider: DOCUMENTED.provider, pool, dataProvider, underlying,
    aToken: tokens[0], variableDebtToken: tokens[2], decimals: 6, symbol, blockNumber, timestamp: block.timestamp };
}
