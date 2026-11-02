import { isAddressEqual, parseAbi, zeroAddress, type PublicClient } from 'viem';
import { AAVE_SOURCES, DOCUMENTED, PRICE_ADDRESSES } from '../config/aave';
import type { PolQuote } from './math';
export const quoteAbi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function getPriceOracle() view returns (address)',
  'function BASE_CURRENCY() view returns (address)',
  'function BASE_CURRENCY_UNIT() view returns (uint256)',
  'function getSourceOfAsset(address) view returns (address)',
  'function getAssetPrice(address) view returns (uint256)',
]);
export const MAX_FEED_AGE_SECONDS = 3600n;
export interface OracleQuote extends PolQuote { polUpdatedAt: bigint; usdtUpdatedAt: bigint | null; feedAgeWarnings: string[]; blockNumber: bigint; oracle: string; polSource: string; usdtSource: string }
/** Both oracle prices and supported source timestamps at one block. WPOL
 * freshness is required; USDT without latestRoundData is explicitly unverified.
 * One-hour maximum is a
 * conservative product limit, not a claim about feed heartbeat guarantees.
 * Source interface: https://docs.chain.link/data-feeds/api-reference#latestrounddata */
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
  const [polRound, usdtRound] = await Promise.all([
    client.readContract({ address: polSource, abi: quoteAbi, functionName: 'latestRoundData', blockNumber }),
    // USDT adapters need not implement AggregatorV3. This optional timestamp
    // failure never substitutes for a failed oracle price read above.
    client.readContract({ address: usdtSource, abi: quoteAbi, functionName: 'latestRoundData', blockNumber }).catch(() => null),
  ]);
  for (const [roundId, answer, , updatedAt, answeredInRound] of usdtRound ? [polRound, usdtRound] : [polRound]) {
    if (roundId === 0n || answer <= 0n || answeredInRound < roundId || updatedAt === 0n || updatedAt > block.timestamp || block.timestamp - updatedAt > MAX_FEED_AGE_SECONDS) throw new Error('Stale or invalid price feed update');
  }
  return { polUpdatedAt: polRound[3], usdtUpdatedAt: usdtRound?.[3] ?? null,
    feedAgeWarnings: usdtRound ? [] : ['USDT price feed age unverified'],
    usdtPerPol: (polPrice * 1_000_000n + usdtPrice - 1n) / usdtPrice,
    observedAt: block.timestamp, blockNumber, oracle, polSource, usdtSource, source: AAVE_SOURCES.oracle };
}
