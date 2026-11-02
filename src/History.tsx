import { useEffect, useState } from 'react';
import { downloadHistory } from './lib/historyCsv';
import type { Address } from 'viem';
import { formatAmount } from './lib/math';
import type { History as HistoryData } from './lib/history';
import type { WalletAdapter } from './lib/wallet';
export function History({ account, wallet }: { account: Address; wallet: WalletAdapter }) {
  const [data, setData] = useState<HistoryData>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void wallet.history(account).then(result => { if (active) setData(result); }, () => { if (active) setError('Confirmed history unavailable. RPC history may be limited. Refresh to retry; position and withdrawal access remain separate.'); });
    return () => { active = false; };
  }, [account, wallet, attempt]);
  return <section className="panel history-panel" aria-labelledby="history-heading"><h2 id="history-heading">Confirmed history</h2>
    <p>Only mined on-chain supplies and withdrawals with at least two confirmations appear here. Pending requests and approvals are separate in transaction recovery. Forecasts appear only in the supply preview.</p>
    {!data && !error && <p role="status">Loading confirmed events…</p>}
    {error && <><p role="alert">{error}</p><button onClick={() => { setError(''); setAttempt(attempt + 1); }}>Retry history</button></>}
    {data && <><p>Current supplied balance at confirmed block {data.toBlock.toString()}: <strong>{formatAmount(data.supplied, 6)} USDT</strong>. Read from the aToken contract; never inferred from this event list.</p>
      <p className="caption">Observed {new Date(Number(data.observedAt) * 1000).toLocaleString('en-GB')} · Polygon 137 · Blocks {data.fromBlock.toString()}–{data.toBlock.toString()} · Account {data.account}</p>
      <p className="warning">{data.limitation}</p><p>External aToken transfers: {data.externalTransfers ? 'detected in this window; these are not interest.' : 'none detected in this window; earlier transfers are unknown.'}</p>
      <button className="secondary" onClick={() => { try { downloadHistory(data); } catch { setError('CSV export unavailable in this browser. Try again.'); } }}>Export confirmed events CSV</button>
      <p>Reconstructed earnings: unavailable. Forecasts are estimates, separate from confirmed events.</p>
      {data.events.length === 0 ? <p>No confirmed supplies or withdrawals found in this window. This does not establish an empty lifetime history.</p> : <ol>{data.events.map(event => <li key={event.txHash + ':' + event.logIndex}>{event.action === 'supply' ? 'Supply' : 'Withdrawal'} · {formatAmount(event.amount, 6)} USDT · {new Date(Number(event.timestamp) * 1000).toLocaleString('en-GB')} · Block {event.blockNumber.toString()} · <a href={'https://polygonscan.com/tx/' + event.txHash}>Confirmed transaction</a></li>)}</ol>}
    </>}
  </section>;
}
