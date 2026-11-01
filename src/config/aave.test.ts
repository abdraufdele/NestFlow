import { describe, expect, it, vi } from 'vitest';
import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';
import { resolveAaveConfig, DOCUMENTED } from './aave';

function fixture(overrides: Record<string, unknown> = {}) {
  const client = createPublicClient({ chain: polygon, transport: http() });
  vi.spyOn(client, 'getChainId').mockResolvedValue(137);
  vi.spyOn(client, 'getBlock').mockResolvedValue({ number: 123n, timestamp: 100n } as Awaited<ReturnType<typeof client.getBlock>>);
  vi.spyOn(client, 'getCode').mockResolvedValue('0x1234');
  const values: Record<string, unknown> = {
    getPool: DOCUMENTED.pool, getPoolDataProvider: DOCUMENTED.dataProvider,
    ADDRESSES_PROVIDER: DOCUMENTED.provider, getReservesList: [DOCUMENTED.underlying],
    getReserveTokensAddresses: [DOCUMENTED.aToken, '0x0000000000000000000000000000000000000000', DOCUMENTED.variableDebtToken],
    decimals: 6, symbol: 'USDT0', UNDERLYING_ASSET_ADDRESS: DOCUMENTED.underlying, POOL: DOCUMENTED.pool,
    getReserveConfigurationData: [6n, 0n, 0n, 0n, 0n, false, true, false, true, false], ...overrides,
  };
  vi.spyOn(client, 'readContract').mockImplementation((async (args: { functionName: string }) => values[args.functionName]) as typeof client.readContract);
  return client;
}
describe('configuration identity', () => {
  it('resolves Pool separately from the allowlisted token and checks metadata', async () => {
    const config = await resolveAaveConfig(fixture());
    expect(config.decimals).toBe(6);
    expect(config.symbol).toBe('USDT0');
    expect(config.blockNumber).toBe(123n);
  });
  it.each([
    { decimals: 18 }, { UNDERLYING_ASSET_ADDRESS: DOCUMENTED.pool }, { POOL: DOCUMENTED.provider },
    { getReservesList: [] }, { getPool: DOCUMENTED.underlying }, { symbol: 'FAKE' },
    { getReserveTokensAddresses: [DOCUMENTED.underlying, DOCUMENTED.pool, DOCUMENTED.variableDebtToken] },
  ])('fails closed for mismatched identity %j', async overrides => {
    await expect(resolveAaveConfig(fixture(overrides))).rejects.toThrow();
  });
  it('rejects wrong chain and missing bytecode', async () => {
    const client = fixture(); vi.mocked(client.getChainId).mockResolvedValue(1);
    await expect(resolveAaveConfig(client)).rejects.toThrow('Polygon');
    vi.mocked(client.getChainId).mockResolvedValue(137); vi.mocked(client.getCode).mockResolvedValue('0x');
    await expect(resolveAaveConfig(client)).rejects.toThrow('bytecode');
  });
});
