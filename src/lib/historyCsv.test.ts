import { expect, it } from 'vitest';
import { historyCsv } from './historyCsv';
import type { History } from './history';
const hash = ('0x' + 'a'.repeat(64)) as `0x${string}`;
const data: History = { account: '0x1111111111111111111111111111111111111111', fromBlock: 1n, toBlock: 99n, observedAt: 1000n, supplied: 999n, externalTransfers: true, earnings: null, limitation: 'Incomplete, "window"', events: [{ action: 'supply', amount: 1234567n, blockNumber: 98n, blockHash: hash, txHash: hash, logIndex: 3, timestamp: 100n }] };
it('exports exact confirmed events with provenance and advice/coverage warnings, excluding balance and forecasts', () => {
  const csv = historyCsv(data);
  expect(csv).toContain('Not tax or accounting advice');
  expect(csv).toContain('Incomplete, ""window""');
  expect(csv).toContain('1.234567'); expect(csv).toContain(hash);
  expect(csv).toContain('External aToken transfers detected');
  expect(csv).not.toContain('999'); expect(csv).not.toContain('forecast_amount');
  expect(csv.split('\r\n').find(line => line.startsWith('"137"'))).toContain('"supply"');
});
it('escapes spreadsheet formula prefixes and produces a useful header for an empty window', () => {
  const csv = historyCsv({ ...data, limitation: '=HYPERLINK("bad")', events: [] });
  expect(csv).toContain("'=" ); expect(csv).toContain('amount_usdt');
  expect(csv.split('\r\n').filter(line => line.startsWith('"137"'))).toHaveLength(0);
});
