import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';
import { resolveAaveConfig } from '../src/config/aave';
const url = process.env.POLYGON_RPC_URL;
if (!url) { console.error('Set POLYGON_RPC_URL to a Polygon HTTPS RPC URL; no transaction is sent.'); process.exit(1); }
try {
  const config = await resolveAaveConfig(createPublicClient({ chain: polygon, transport: http(url, { retryCount: 1, timeout: 20_000 }) }));
  console.log(JSON.stringify(config, (_, value: unknown) => typeof value === 'bigint' ? value.toString() : value, 2));
} catch (error) {
  // RPC errors can include credential-bearing URLs. Keep CLI output credential-free.
  console.error('Configuration verification failed. Check RPC connectivity, Polygon chain and the documented addresses.');
  console.error(error instanceof Error ? error.name : 'Unknown error'); process.exitCode = 1;
}
