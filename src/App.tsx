import { useEffect, useRef, useState } from 'react';
import { IndependentExit } from './IndependentExit';
import { Shortfall } from './Shortfall';
import { loadPreferences, savePreferences, resetPreferences } from './lib/preferences';
import { approvalSteps, evaluateSupply } from './lib/aave';
import { costPreview, feeBreakEvenDays, earningsScenario, formatAmount, parseAmount, spendingSplit } from './lib/math';
import { createWalletAdapter, getInjectedProvider, isRejected, type FeePreview, type WalletAdapter, type WalletSnapshot } from './lib/wallet';
import type { TxAction } from './lib/txStore';
import logo from './assets/nestflow-logo.png';
import './styles.css';

const usdt = (v: bigint) => formatAmount(v, 6) + ' USDT';
const pol = (v: bigint | null) => v === null ? 'Unavailable' : formatAmount(v, 18) + ' POL';
const explanations: Record<string, string> = {
  'invalid-amount': 'Enter a valid amount above zero.',
  'reserve-inactive': 'The reserve is inactive.',
  'reserve-paused': 'The reserve is paused.',
  'insufficient-POL': 'POL is needed for network fees.',
  'reserve-frozen': 'The reserve is frozen for new supplies.',
  'wallet-balance': 'The amount exceeds your wallet balance.',
  'supply-cap': 'The reserve has insufficient supply capacity.',
  'position-balance': 'The amount exceeds your supplied balance.',
  'reserve-liquidity': 'The reserve has insufficient USDT available for this withdrawal.',
  'withdraw-simulation-failed': 'The withdrawal simulation failed. Account constraints or reserve conditions may prevent it.',
};
const explain = (reason: string) => explanations[reason] ?? 'A required check failed. Refresh before continuing.';
type Preview = { amount: bigint; fees: FeePreview };
type ExitCheck = { amount: bigint; reasons: string[]; timestamp: bigint; details: string[] };
export function App() {
  const [resetting, setResetting] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferenceNotice, setPreferenceNotice] = useState('');
  const [replacementHash, setReplacementHash] = useState('');
  const connectedSession = useRef(false);
  const skipSave = useRef(false);
  const preferenceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [data, setData] = useState<WalletSnapshot>();
  const [status, setStatus] = useState('Connect your wallet to read current balances.');
  const [busy, setBusy] = useState(false);
  const [transactionsEnabled, setTransactionsEnabled] = useState(false);
  const [preference, setPreference] = useState('0');
  const [days, setDays] = useState('30');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [errors, setErrors] = useState({ preference: '', days: '', withdraw: '' });
  const [preview, setPreview] = useState<Preview>();
  const [exit, setExit] = useState<ExitCheck>();
  const adapter = useRef<WalletAdapter | undefined>(undefined);
  const generation = useRef(0);
  const locked = useRef(false);
  const unsubscribe = useRef<(() => void) | undefined>(undefined);
  function clear() { setData(undefined); setPreview(undefined); setExit(undefined); }
  function invalidate(text = 'Account or chain changed. Connect again for fresh balances.') {
    generation.current++; clear(); setWithdrawAmount(''); setStatus(text);
  }
  function fail(error: unknown) {
    const e = error as { shortMessage?: string; message?: string };
    console.error('Wallet request failed', error);
    if (!connectedSession.current && /stale/i.test(e?.message ?? '')) { setStatus('Current balances unavailable. Refresh to read a recent block.'); return; }
    setStatus(isRejected(error) ? 'Rejected. The wallet request was declined. You can choose to try again.' : 'Failed: ' + (e?.shortMessage ?? e?.message ?? String(error)));
  }
  async function connect() {
    if (locked.current) return;
    locked.current = true; setBusy(true); clear(); setStatus('Connecting… Check the native wallet dialog.');
    const version = ++generation.current;
    try {
      unsubscribe.current?.();
      const provider = getInjectedProvider();
      if (!provider) throw new Error('Open in Nimiq Pay to connect. No injected wallet provider is available.');
      const wallet = createWalletAdapter(provider, { localTest: import.meta.env.MODE === 'e2e' });
      adapter.current = wallet; setTransactionsEnabled(wallet.transactionsEnabled);
      // Subscribe after native launch requests: a chain switch can legitimately emit events.
      const identity = await wallet.connect();
      if (version !== generation.current) return;
      unsubscribe.current = wallet.subscribe(() => invalidate());
      setStatus('Reading balances and checking the reserve…');
      const result = await wallet.read(identity.account);
      if (version !== generation.current) return;
      connectedSession.current = true; setData(result); setWithdrawAmount(''); setErrors({ preference: '', days: '', withdraw: '' });
      setStatus(result.record?.locked ? 'Unresolved ' + result.record.action + ': ' + result.record.status + '. Refresh to reconcile; do not resend.' : 'Connected. Balances read from Polygon.');
    } catch (error) { if (version === generation.current) fail(error); }
    finally { locked.current = false; setBusy(false); }
  }
  useEffect(() => {
    let mounted = true; void Promise.resolve().then(() => { if (mounted) void connect(); });
    const onVisibility = () => { if (document.visibilityState === 'hidden' && connectedSession.current && !locked.current) invalidate('Stale data after leaving the app. Connect again for fresh balances.'); };
    document.addEventListener('visibilitychange', onVisibility);
    // Invalidate every outstanding response, including requests made after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { mounted = false; generation.current++; unsubscribe.current?.(); document.removeEventListener('visibilitychange', onVisibility); };
    // The launch sequence runs once per mount, never from stored account/chain state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => invalidate('Stale data. Refresh balances before continuing.'), Math.max(0, Number(data.position.timestamp) * 1000 + 60_000 - Date.now()));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    let active = true;
    void loadPreferences().then(value => { if (active) { setPreference(value.preference); setDays(value.days); } })
      .catch(() => { if (active) setPreferenceNotice('Preferences cannot be restored. Planning inputs will remain in this session.'); })
      .finally(() => { if (active) setPreferencesReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    if (skipSave.current) { skipSave.current = false; return; }
    const timer = preferenceTimer.current = setTimeout(() => { void savePreferences({ preference, days }).catch(() => setPreferenceNotice('Preferences could not be saved. Keep a note of your planning inputs.')); }, 150);
    return () => clearTimeout(timer);
  }, [preference, days, preferencesReady, resetVersion]);
  async function resetPlanning() {
    if (resetting) return;
    setResetting(true);
    clearTimeout(preferenceTimer.current);
    try { await resetPreferences(); skipSave.current = true; setResetVersion(value => value + 1); setPreference('0'); setDays('30'); setPreview(undefined); setPreferenceNotice('Planning preferences reset. Transaction recovery records retained.'); }
    catch { setPreferenceNotice('Preferences could not be reset. Try again when local storage is available.'); }
    finally { setResetting(false); }
  }
  async function reconcileReplacement() {
    if (locked.current || !data || !adapter.current) return;
    if (!/^0x[0-9a-fA-F]{64}$/.test(replacementHash)) { setStatus('Enter a valid replacement transaction hash from your wallet.'); return; }
    const version = generation.current;
    locked.current = true; setBusy(true);
    try {
      await adapter.current.replacement(data.account, replacementHash as `0x${string}`);
      const fresh = await adapter.current.read(data.account);
      if (version === generation.current) { setData(fresh); setPreview(undefined); setExit(undefined); setStatus('Replacement reconciled. Review the transaction recovery status.'); }
    } catch (error) { if (version === generation.current) fail(error); }
    finally { locked.current = false; setBusy(false); }
  }

  let target = 0n; let validPreference = true;
  try { target = parseAmount(preference, 6); if (data && target > data.position.wallet + data.position.supplied) validPreference = false; }
  catch { validPreference = false; }
  const split = data && validPreference ? spendingSplit(data.position.wallet, target, data.position.supplied) : undefined;
  const total = data ? data.position.wallet + data.position.supplied : 0n;
  const walletPercent = split && total > 0n ? Number(split.wallet * 10_000n / total) / 100 : 0;
  const steps = preview && data ? approvalSteps(data.allowance, preview.amount) : [];
  const reasons = preview && data ? evaluateSupply(preview.amount, data.position, data.reserve).reasons : [];
  const entryCost = preview && preview.fees.approval !== null && preview.fees.supply !== null && steps.length <= 1
    ? preview.fees.approval * BigInt(steps.length > 0 ? 1 : 0) + preview.fees.supply : null;
  const knownEntryCost = preview ? (preview.fees.approval ?? 0n) * BigInt(steps.length > 0 ? 1 : 0) + (preview.fees.supply ?? 0n) : 0n;
  const shortGas = data && data.position.polWei < knownEntryCost;
  const blocked = busy || !!data?.record?.locked || !transactionsEnabled || reasons.length > 0 || !!shortGas;
  const aprBps = data ? data.reserve.liquidityRateRay * 10_000n / 10n ** 27n : 0n;
  const holdingDays = /^[1-9][0-9]{0,3}$/.test(days) && BigInt(days) <= 3650n ? BigInt(days) : 0n;
  const gross = preview ? earningsScenario(preview.amount, aprBps, holdingDays).gross : 0n;

  const costs = preview && entryCost !== null && preview.fees.exit !== null ? costPreview([entryCost], preview.fees.exit, data?.quote) : undefined;
  const net = costs?.totalUsdt != null ? gross - costs.totalUsdt : null;
  const breakEven = costs?.totalUsdt != null && preview ? feeBreakEvenDays(preview.amount, aprBps, costs.totalUsdt) : null;
  const signedUsdt = (value: bigint) => (value < 0n ? '-' : '') + usdt(value < 0n ? -value : value);

  async function makePreview() {
    if (locked.current || !data || !adapter.current) return;
    const newErrors = { ...errors, preference: '', days: '' };
    if (!validPreference) newErrors.preference = 'Enter a nonnegative amount with at most 6 decimals, within your total USDT.';
    else if (!split || split.supply === 0n) newErrors.preference = 'Enter a wallet target below your wallet balance to preview supply.';
    if (holdingDays === 0n) newErrors.days = 'Enter a whole number from 1 to 3650 days.';
    setErrors(newErrors); setPreview(undefined);
    if (newErrors.preference || newErrors.days) {
      document.getElementById(newErrors.preference ? 'preference' : 'days')?.focus(); return;
    }
    const version = generation.current;
    locked.current = true; setBusy(true); setStatus('Estimating transaction costs…');
    try {
      const amount = split!.supply;
      const fees = await adapter.current.fees(data.account, amount, data.allowance);
      if (version === generation.current) { setPreview({ amount, fees }); setStatus('Preview ready. No funds moved.'); }
    } catch (error) { if (version === generation.current) { clear(); fail(error); } }
    finally { locked.current = false; setBusy(false); }
  }
  async function checkExit() {
    if (locked.current || !data || !adapter.current) return;
    setExit(undefined);
    let amount: bigint;
    try { amount = parseAmount(withdrawAmount, 6); if (amount === 0n) throw new Error(); }
    catch { setErrors({ ...errors, withdraw: 'Enter an amount above zero with at most 6 decimals.' }); document.getElementById('withdraw')?.focus(); return; }
    setErrors({ ...errors, withdraw: '' }); locked.current = true; setBusy(true); setStatus('Checking withdrawal eligibility…');
    const version = generation.current;
    try {
      const result = await adapter.current.eligibility(data.account, amount);
      if (version === generation.current) {
        setExit({ amount, reasons: result.reasons, timestamp: result.timestamp, details: [
          result.reserve.paused ? 'The reserve is paused: withdrawals are blocked until the pause is lifted.' : 'The reserve is not paused.',
          result.reserve.frozen ? 'The reserve is frozen for new supply. Frozen status alone does not block withdrawals.' : 'The reserve is not frozen.',
          'Reserve liquidity: ' + usdt(result.reserve.liquidity) + '. Supplied balance: ' + usdt(result.position.supplied) + '. Liquidity can limit the amount available now.',
          result.position.totalDebtBase > 0n && result.position.collateralEnabled ? 'Your collateral supports outstanding debt. Withdrawal can be limited by account health; a smaller amount may succeed. ' + (result.reasons.includes('withdraw-simulation-failed') ? 'The withdrawal simulation failed; debt/collateral or other contract constraints may prevent this amount.' : 'Simulation is run when preliminary checks permit.') : 'No debt-backed collateral restriction was observed for this reserve.',
          result.reasons.length === 0 ? 'Withdrawal simulation passed for this amount. Gas is estimated again before sending.' : 'Checks failed. Simulation is skipped when preliminary checks already block withdrawal; otherwise a failed simulation is reported. Gas is estimated again before any send.',
        ] });
        setStatus(result.checksPassed ? 'Withdrawal checks completed. Review before withdrawing.' : 'Withdrawal unavailable for this amount.');
      }
    } catch (error) { if (version === generation.current) { clear(); fail(error); } }
    finally { locked.current = false; setBusy(false); }
  }
  async function transact(action: TxAction, amount: bigint) {
    if (locked.current || !data || !adapter.current || data.record?.locked) return;
    locked.current = true; setBusy(true); setStatus('Awaiting ' + action + ' approval in the native wallet…');
    const version = generation.current; const wallet = adapter.current; const account = data.account;
    try {
      const result = await wallet.transact(action, amount, account, hash => {
        if (version === generation.current) setStatus('Submitted ' + action + '. Waiting for confirmation. Transaction ' + hash);
      });
      if (version !== generation.current) return;
      if (result?.status === 'confirmed') {
        const fresh = await wallet.read(account);
        if (version !== generation.current) return;
        setData(fresh); setExit(undefined);
        if (action === 'approve' && preview) {
          const fees = await wallet.fees(account, preview.amount, fresh.allowance);
          if (version !== generation.current) return;
          setPreview({ ...preview, fees });
        }
        if (action !== 'approve') { setPreview(undefined); }
        setStatus(action === 'approve' ? 'Approval confirmed. No USDT supplied yet.' : action === 'supply' ? 'Supply confirmed.' : 'Withdrawal confirmed.');
      } else {
        const fresh = result && !result.locked ? await wallet.read(account) : { ...data, record: result };
        if (version !== generation.current) return;
        setData(fresh); setExit(undefined);
        setStatus(result?.status === 'reverted' ? 'Failed: transaction reverted. No successful action confirmed.' : 'Submitted; confirmation is uncertain. Refresh to reconcile. Do not resend.');
      }
    } catch (error) {
      if (version === generation.current) {
        // Re-read the durable record even on rejection or uncertain broadcast.
        try { const fresh = await wallet.read(account); if (version === generation.current) setData(fresh); }
        catch { if (version === generation.current) clear(); }
        if (version === generation.current) fail(error);
      }
    } finally { locked.current = false; setBusy(false); }
  }
  function changePreference(value: string) { setPreference(value); setPreview(undefined); setErrors({ ...errors, preference: '' }); }
  return <div className="app">
    <a className="skip-link" href="#content">Skip to balances</a>
    <header className="masthead"><a href="/" aria-label="NestFlow home"><img src={logo} alt="NestFlow" width="64" height="64" /></a><div><span className="eyebrow">NIMIQ PAY · POLYGON</span><p className="brand-title">Make room for what’s next.</p></div>{import.meta.env.DEV && <a className="diagnostics-link" href="/diagnostics">Diagnostics</a>}</header>
    <main id="content">
      <div className="intro"><span className="eyebrow">A LITTLE MORE INTENTION</span><h1>Your USDT,<br />with room to spend.</h1><p>Choose what stays in your wallet. Preview what the rest could earn through Aave V3.</p></div>
      <section className="connection" aria-labelledby="connection-heading">
        <div><h2 id="connection-heading">Your wallet</h2><p className="account">{data ? data.account : 'Connect on every open. Polygon is checked each time.'}</p></div>
        <button className="secondary" disabled={busy} onClick={() => void connect()}>{data ? 'Refresh balances' : 'Connect wallet'}</button>
      </section>
      <p className="status" role="status" aria-live="polite" aria-atomic="true">{busy && <span className="loading-dot" aria-hidden="true" />}{status}</p>
      <p className="dev-note">Not verified on device: approval, supply and withdrawal. {transactionsEnabled ? (import.meta.env.MODE === 'e2e' ? 'Mocked local test only.' : 'Private funded-test build: maximum 5 USDT per action.') : 'Mainnet transactions disabled in this build.'}</p>
      <p><a href="/independent-exit">Exit independently through Aave</a></p>
      {typeof window !== 'undefined' && window.location.pathname === '/independent-exit' && <IndependentExit />}
      {data && <>
        <section className="balance-sheet" aria-labelledby="balances-heading">
          <div className="section-top"><h2 id="balances-heading">Confirmed balances</h2><span className="tag">ON POLYGON</span></div>
          <div className="balances"><div><p>In wallet</p><strong data-testid="confirmed-wallet">{usdt(data.position.wallet)}</strong><span>Available for a separate payment</span></div><div><p>Earning · Aave V3</p><strong data-testid="confirmed-earning">{usdt(data.position.supplied)}</strong><span>{data.position.supplied === 0n ? 'No supplied USDT yet.' : 'Includes any existing supported position'}</span></div></div>
          <p className="caption">Observed {new Date(Number(data.position.timestamp) * 1000).toLocaleString('en-GB')} · Block {data.position.blockNumber.toString()} · {pol(data.position.polWei)} for gas</p>
          {data.position.polWei === 0n && <p className="warning" role="status">Missing POL. Add POL to this Polygon account before any transaction. POL pays network fees.</p>}
          {data.record?.locked && <p className="warning">Unresolved {data.record.action}: {data.record.status}. {data.record.txHash} Refresh to reconcile before another transaction.</p>}
          {data.record && <div className="recovery" aria-label="Transaction recovery"><p>{data.record.action}: {data.record.status}. {data.record.txHash}</p>{data.record.replacementKind && <p>Replacement: {data.record.replacementKind}. Original: {data.record.originalTxHash}. A cancellation or different call is not a successful original action.</p>}{data.record.status === 'reverted' && <p>The transaction reverted. No successful action was confirmed. Fresh balances and allowance were reread before any retry.</p>}{data.record.status === 'rejected' && <p>The wallet request was declined or the original transaction was replaced by a different call. Approval and supply remain separate actions.</p>}{data.record.locked && <><p>Do not resend an unknown or pending transaction. If you replaced it in your wallet, provide the replacement hash. Matching sender and nonce must be verified before a confirmed replacement can release the lock.</p><label htmlFor="replacement">Replacement transaction hash</label><input id="replacement" value={replacementHash} onChange={e => setReplacementHash(e.target.value)} /><button className="secondary" disabled={busy} onClick={() => void reconcileReplacement()}>Reconcile replacement</button></>}</div>}
        </section>
        <Shortfall key={data.account + ":" + data.position.timestamp + ":" + data.position.wallet + ":" + data.position.supplied} data={data} check={(account, amount) => adapter.current!.eligibility(account, amount)} choose={value => { setWithdrawAmount(value); setExit(undefined); document.getElementById('withdraw')?.focus(); }} />
        <div className="workspace"><section className="panel" aria-labelledby="plan-heading">
          <span className="eyebrow">PLAN YOUR SPLIT</span><h2 id="plan-heading">Keep spending in mind.</h2>
          <p>Your preference is a plan. It does not lock funds or move them automatically.</p>
          <fieldset disabled={busy || !preferencesReady || resetting}><label htmlFor="preference">Keep in wallet (USDT)</label><div className="amount-field"><input id="preference" inputMode="decimal" value={preference} aria-invalid={!!errors.preference} aria-describedby="preference-error preference-help" onChange={e => changePreference(e.target.value)} /><span>USDT</span></div>
            <p id="preference-help" className="caption">Up to 6 decimals. Use funds you do not need immediately.</p><p id="preference-error" className="field-error">{errors.preference}</p>
            <input className="range" aria-label="Spending preference slider" type="range" min="0" max="1000" step="1" value={validPreference && total > 0n ? Number(target * 1000n / total) : 0} onChange={e => changePreference(formatAmount(total * BigInt(e.target.value) / 1000n, 6))} />
            <div className="split-caption"><span>After proposed supply</span><span>PREVIEW ONLY</span></div>
            <div className="split-track" role="img" aria-label={split ? 'After proposed supply: ' + usdt(split.wallet) + ' in wallet, ' + usdt(split.earningAfter) + ' earning' : 'Enter a valid spending preference to see the proposed split'}><span style={{ width: walletPercent + '%' }} /></div>
            <div className="split-values"><div><span className="key wallet-key">In wallet</span><strong data-testid="proposed-wallet">{split ? usdt(split.wallet) : 'Unavailable'}</strong></div><div><span className="key earning-key">Earning</span><strong data-testid="proposed-earning">{split ? usdt(split.earningAfter) : 'Unavailable'}</strong></div></div>
            {split && split.withdrawalNeeded > 0n && <p className="warning">Your wallet target needs a separate {usdt(split.withdrawalNeeded)} withdrawal. Existing supplied funds stay supplied.</p>}
            <label htmlFor="days">Holding period (days)</label><input id="days" inputMode="numeric" value={days} aria-invalid={!!errors.days} aria-describedby="days-error" onChange={e => { setDays(e.target.value); setPreview(undefined); }} /><p id="days-error" className="field-error">{errors.days}</p>
            <p className="caption">Planning inputs are saved on this device without addresses. They apply across wallet accounts and never authorize a transfer.</p><button className="secondary" onClick={() => void resetPlanning()}>Reset planning preferences</button><p role="status">{preferenceNotice}</p>
            <button onClick={() => void makePreview()}>Preview supply</button>
          </fieldset>
          {preview && <div className="preview" aria-labelledby="preview-heading">
            <span className="eyebrow">REVIEW BEFORE YOU ACT</span><h3 id="preview-heading">Supply preview</h3><p className="preview-amount">{usdt(preview.amount)}</p>
            <dl className="details"><div><dt>Entry cost estimate · remaining steps</dt><dd>{pol(entryCost)}</dd></div><div><dt>Approval estimate · next step</dt><dd>{pol(preview.fees.approval === null ? null : preview.fees.approval * BigInt(steps.length > 0 ? 1 : 0))}</dd></div><div><dt>Supply estimate</dt><dd>{pol(preview.fees.supply)}</dd></div><div><dt>Exit cost estimate · uncertain</dt><dd>{pol(preview.fees.exit)}</dd></div><div><dt>Gross earnings at current rate</dt><dd>{usdt(gross)}</dd></div><div><dt>Gross earnings at half the rate</dt><dd>{usdt(earningsScenario(preview.amount, aprBps / 2n, holdingDays).gross)}</dd></div><div><dt>Zero-rate scenario</dt><dd>0 USDT</dd></div></dl>
            <p className="caption">Simple annual rate {formatAmount(aprBps, 2)}%, from this Aave reserve at the observation above. Scenarios cover {days} days. Rates and fees can change; these are estimates.</p>
            <p className="warning">{gross < 10_000n ? 'Estimated earnings are negligible; POL costs may outweigh them. ' : ''}{data.quote ? <>Aave oracle POL/USDT estimate: {usdt(data.quote.usdtPerPol)} per POL, observed {new Date(Number(data.quote.observedAt) * 1000).toLocaleString('en-GB')} at block {data.quote.blockNumber.toString()}. <a href={data.quote.source}>Price source documentation</a>. Oracle {data.quote.oracle}; WPOL feed {data.quote.polSource}; USDT feed {data.quote.usdtSource}. Feed update age is not independently checked; this is a protocol oracle estimate, not an executable exchange quote. Remaining entry plus exit gas estimate: {costs?.totalUsdt != null ? usdt(costs.totalUsdt) : 'Unavailable'}. Net return estimate: {net !== null ? signedUsdt(net) : 'Unavailable'}. Fee break-even estimate: {breakEven !== null ? breakEven.toString() + ' days' : 'Unavailable'}. Already paid fees are excluded from these remaining-cost estimates. Fee break-even does not compensate for risk.</> : 'No POL/USDT conversion quote is available. Net earnings and fee break-even are unavailable.'} Current-action gas estimates must be available before sending. Future exit estimates can be unavailable until funds are supplied. A reset estimate covers the next approval step; later estimates refresh after confirmation.</p>
            <p>Supplying exposes you to protocol, stablecoin and liquidity risks. Withdrawing depends on reserve liquidity and your account constraints.</p>
            {reasons.length > 0 && <p className="warning">Supply unavailable: {reasons.map(explain).join(' ')}</p>}
            {shortGas && <p className="warning">Insufficient POL for estimated entry costs. Keep additional POL for exit; future fees are uncertain.</p>}
            <div className="transaction-step"><span className="step-label">APPROVAL</span><p className="caption">Not verified on device.</p><p>Allow only the exact amount for the verified Pool. Approval permits spending; it does not supply USDT.{steps.length > 1 ? ' First reset the existing allowance to zero, then approve the new amount in a separate request.' : ''}</p>
              {steps.length > 0 ? <button disabled={blocked || preview.fees.approval === null} onClick={() => void transact('approve', steps[0])}>{steps[0] === 0n ? 'Reset approval to 0 USDT' : 'Approve ' + usdt(steps[0])}</button> : <p className="success">Allowance covers this amount. Supply is a separate action.</p>}
            </div>
            <div className="transaction-step"><span className="step-label">SUPPLY</span><p className="caption">Not verified on device.</p><p>Supply {usdt(preview.amount)}. Keep {split ? usdt(split.wallet) : 'your preference'} in your wallet.</p><button disabled={blocked || steps.length > 0 || preview.fees.supply === null } onClick={() => void transact('supply', preview.amount)}>{'Supply ' + usdt(preview.amount)}</button></div>
          </div>}
        </section>
        <section className="panel withdrawal" aria-labelledby="withdraw-heading"><span className="eyebrow">WHEN YOU NEED IT</span><h2 id="withdraw-heading">Bring USDT back.</h2><p>Withdraw from your existing position. A later payment is a separate action.</p>
          <fieldset disabled={busy}><label htmlFor="withdraw">Withdraw amount (USDT)</label><div className="amount-field"><input id="withdraw" inputMode="decimal" value={withdrawAmount} aria-invalid={!!errors.withdraw} aria-describedby="withdraw-error withdraw-result" onChange={e => { setWithdrawAmount(e.target.value); setExit(undefined); setErrors({ ...errors, withdraw: '' }); }} /><span>USDT</span></div><p id="withdraw-error" className="field-error">{errors.withdraw}</p><button className="secondary" onClick={() => void checkExit()}>Check withdrawal</button></fieldset>
          <p className="caption">Withdrawal: not verified on device.</p><div id="withdraw-result" aria-live="polite">{exit ? <><p className={exit.reasons.length ? 'warning' : 'success'}>{(exit.reasons.length ? 'Checks failed as of ' : 'Checks passed as of ') + new Date(Number(exit.timestamp) * 1000).toLocaleString('en-GB')}{exit.reasons.length > 0 && ' · Not eligible: ' + exit.reasons.map(explain).join(' ')}</p><ul>{exit.details.map(detail => <li key={detail}>{detail}</li>)}</ul><p className="caption">These checks describe this observation; execution may change.</p><button disabled={busy || !!data.record?.locked || !transactionsEnabled || exit.reasons.length > 0} onClick={() => void transact('withdraw', exit.amount)}>{'Withdraw ' + usdt(exit.amount)}</button></> : <p className="caption">Enter an amount to check reserve liquidity and account eligibility. A supplied balance alone does not prove availability.</p>}</div>
        </section></div>
      </>}
      <footer><img src={logo} alt="" width="40" height="40" /><p>NestFlow is independent. Aave provides lending infrastructure.<br />Self-custodial · USDT/USDT0 · Polygon 137</p></footer>
    </main>
  </div>;
}
