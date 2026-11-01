import { isAddressEqual, parseAbi, zeroAddress, type PublicClient } from 'viem';
import { AAVE_SOURCES, DOCUMENTED, PRICE_ADDRESSES } from '../config/aave';
import type { PolQuote } from './math';
export const quoteAbi = parseAbi([
  'function getPriceOracle() view returns (address)',
  'function BASE_CURRENCY() view returns (address)',
  'function BASE_CURRENCY_UNIT() view returns (uint256)',
  'function getSourceOfAsset(address) view returns (address)',
  'function getAssetPrice(address) view returns (uint256)',
]);
export interface OracleQuote extends PolQuote { blockNumber: bigint; oracle: string; polSource: string; usdtSource: string }
/** Both USD prices at one block; ceil the ratio conservatively. Observation time
 * is the block time, not a guarantee about the source feed's update time. */
export async function readPolQuote(client: PublicClient): Promise<OracleQuote> {
  if (await client.getChainId() !== 137) throw new Error('Polygon chain 137 required');
  const block = await client.getBlock();
  if (block.number === null || Date.now() - Number(block.timestamp) * 1000 > 60_000) throw new Error('Stale quote observation');
  const blockNumber = block.number;
  const oracle = await client.readContract({ address: DOCUMENTED.provider, abi: quoteAbi, functionName: 'getPriceOracle', blockNumber });
  if (!isAddressEqual(oracle, PRICE_ADDRESSES.oracle)) throw new Error('Unverified oracle');
  const read = { address: oracle, abi: quoteAbi, blockNumber } as const;
  const [currency, unit, polSource, usdtSource, polPrice, usdtPrice] = await Promise.all([
    client.readContract({ ...read, functionName: 'BASE_CURRENCY' }),
    client.readContract({ ...read, functionName: 'BASE_CURRENCY_UNIT' }),
    client.readContract({ ...read, functionName: 'getSourceOfAsset', args: [PRICE_ADDRESSES.wpol] }),
    client.readContract({ ...read, functionName: 'getSourceOfAsset', args: [DOCUMENTED.underlying] }),
    client.readContract({ ...read, functionName: 'getAssetPrice', args: [PRICE_ADDRESSES.wpol] }),
    client.readContract({ ...read, functionName: 'getAssetPrice', args: [DOCUMENTED.underlying] }),
  ]);
  if (!isAddressEqual(currency, zeroAddress) || unit !== 100_000_000n || polPrice <= 0n || usdtPrice <= 0n || isAddressEqual(polSource, zeroAddress) || isAddressEqual(usdtSource, zeroAddress)) throw new Error('Unsupported oracle price source');
  return { usdtPerPol: (polPrice * 1_000_000n + usdtPrice - 1n) / usdtPrice,
    observedAt: block.timestamp, blockNumber, oracle, polSource, usdtSource, source: AAVE_SOURCES.oracle };
}
