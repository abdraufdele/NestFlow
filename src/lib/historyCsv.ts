import { DOCUMENTED } from '../config/aave';
import { formatAmount } from './math';
import type { History } from './history';
// Quote every cell; neutralize spreadsheet formulas even in future free-text fields.
const cell = (value: string) => '"' + (/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
export function historyCsv(history: History): string {
  const rows: string[][] = [
    ['NestFlow confirmed on-chain events. Not tax or accounting advice.'],
    [history.limitation],
    [history.externalTransfers ? 'External aToken transfers detected; they are not interest.' : 'No external aToken transfers detected in this window; earlier transfers unknown.'],
    ['Coverage blocks', history.fromBlock.toString(), history.toBlock.toString(), 'Observation timestamp (Unix seconds)', history.observedAt.toString(), 'Account', history.account, 'Polygon chain', '137'],
    ['chain_id', 'account', 'pool', 'underlying', 'action', 'amount_usdt', 'amount_base_units', 'block_number', 'block_hash', 'transaction_hash', 'log_index', 'timestamp_utc'],
    ...history.events.map(event => ['137', history.account, DOCUMENTED.pool, DOCUMENTED.underlying, event.action, formatAmount(event.amount, 6), event.amount.toString(), event.blockNumber.toString(), event.blockHash, event.txHash, event.logIndex.toString(), new Date(Number(event.timestamp) * 1000).toISOString()]),
  ];
  return rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
export function downloadHistory(history: History) {
  const url = URL.createObjectURL(new Blob([historyCsv(history)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'nestflow-confirmed-events.csv';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
