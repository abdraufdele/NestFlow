import { useEffect, useRef, useState } from 'react';
import { formatAmount, parseAmount, paymentShortfall } from './lib/math';
import type { WalletAdapter, WalletSnapshot } from './lib/wallet';
const usdt = (value: bigint) => formatAmount(value, 6) + ' USDT';
export function Shortfall({ data, choose, check }: { data: WalletSnapshot; choose: (amount: string) => void; check: WalletAdapter['eligibility'] }) {
  const [payment, setPayment] = useState('');
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState<Awaited<ReturnType<WalletAdapter['eligibility']>>>();
  const [error, setError] = useState('');
  const generation = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => () => { generation.current++; }, []);
  async function checkCandidate(value: bigint) {
    if (inFlight.current) return;
    const version = ++generation.current;
    inFlight.current = true; setChecking(true); setError(''); setChecked(undefined);
    try {
      const result = await check(data.account, value);
      if (version !== generation.current) return;
      if (result.position.wallet !== data.position.wallet) { setError('Balances changed. Refresh balances and calculate again.'); return; }
      // Fresh eligibility covers the supplied amount; aToken interest accrual is normal.
      setChecked(result);
    } catch { if (version === generation.current) setError('Withdrawal checks unavailable. Refresh balances before trying again.'); }
    finally { inFlight.current = false; setChecking(false); }
  }
  let amount: bigint | undefined;
  try { amount = parseAmount(payment, 6); } catch { /* An invalid manual amount is unavailable, never zero. */ }
  const result = amount === undefined ? undefined : paymentShortfall(amount, data.position.wallet, data.position.supplied < data.reserve.liquidity ? data.position.supplied : data.reserve.liquidity);
  const restricted = data.reserve.paused || !data.reserve.active || data.position.polWei === 0n;
  return <section className="panel" aria-labelledby="shortfall-heading"><h2 id="shortfall-heading">Plan a separate payment</h2>
    <p>Enter a payment amount manually. NestFlow does not detect payments or send them.</p>
    <label htmlFor="payment">Desired payment (USDT)</label><input id="payment" inputMode="decimal" value={payment} aria-invalid={payment !== '' && amount === undefined} aria-describedby="shortfall-result" onChange={e => { generation.current++; setPayment(e.target.value); setChecked(undefined); setError(''); }} />
    <div id="shortfall-result" aria-live="polite">{result ? <><p>Wallet balance: {usdt(data.position.wallet)}. Payment shortfall: {usdt(result.shortfall)}.</p>
      {result.shortfall === 0n ? <p>Your wallet covers this amount. No withdrawal needed.</p> : restricted ? <p className="warning">Withdrawal suggestion unavailable: {data.reserve.paused ? 'the reserve is paused.' : !data.reserve.active ? 'the reserve is inactive.' : 'POL is needed for gas.'} Check withdrawal diagnostics below.</p> : result.withdrawal > 0n ? <><p>Amount to check for withdrawal: {usdt(result.withdrawal)}. Subject to fresh gas, simulation and debt/collateral checks.{data.position.totalDebtBase > 0n && data.position.collateralEnabled ? ' Your supplied collateral supports debt; the amount may be limited to preserve your account health.' : ''}</p><p>Remaining shortfall after that withdrawal: {usdt(result.remaining)}.</p><button className="secondary" disabled={checking} onClick={() => void checkCandidate(result.withdrawal)}>{checking ? 'Checking withdrawal…' : 'Check shortfall withdrawal'}</button>
      {checked && <><p>{checked.checksPassed ? 'Checks passed as of ' : 'Checks failed as of '}{new Date(Number(checked.timestamp) * 1000).toLocaleString('en-GB')}. {checked.checksPassed ? 'Suggested withdrawal: ' + usdt(checked.amount) + '. Review again before sending.' : checked.reasons.includes('withdraw-simulation-failed') && checked.position.totalDebtBase > 0n && checked.position.collateralEnabled ? 'Debt/collateral constraints or other contract conditions prevent this amount. Try a smaller amount in withdrawal diagnostics.' : 'This amount is currently blocked. See withdrawal diagnostics; no withdrawal is suggested.'}</p>{checked.checksPassed && <button className="secondary" onClick={() => choose(formatAmount(checked.amount, 6))}>Review suggested withdrawal</button>}</>}
      {error && <p className="warning">{error}</p>}</> : <p className="warning">No USDT available to suggest: supplied balance or reserve liquidity is zero. Payment shortfall remains {usdt(result.shortfall)}.</p>}
      <p className="caption">Observed {new Date(Number(data.position.timestamp) * 1000).toLocaleString('en-GB')}. Withdrawal and payment remain separate actions. No funds move from this calculator.</p></> : <p>{payment ? 'Enter a nonnegative amount with at most 6 decimals.' : 'Enter an amount to compare with your confirmed wallet balance.'}</p>}</div>
  </section>;
}
