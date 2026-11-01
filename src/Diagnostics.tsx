import { useEffect, useRef, useState } from 'react';
import { init } from '@nimiq/mini-app-sdk';
import { bounded, message, probe, type Provider, type Rows } from './lib/diagnostics';
type HostWindow = Window & { ethereum?: Provider & { on?: (event: string, fn: () => void) => void; removeListener?: (event: string, fn: () => void) => void } };
export function Diagnostics() {
  const [rows, setRows] = useState<Rows>({ status: 'Loading read-only diagnostics…' });
  const [sdk, setSdk] = useState('Waiting for Nimiq SDK initialization…');
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  async function refresh() {
    const current = ++generation.current;
    setRows({ status: 'Loading read-only diagnostics…' });
    try {
      const result = await probe((window as HostWindow).ethereum);
      if (current === generation.current) setRows({ ...result, observed: new Date().toISOString(), freshness: 'Snapshot only. Refresh after changes; no events are assumed.' });
    } catch (e) { if (current === generation.current) setRows({ error: message(e) }); }
  }
  useEffect(() => {
    let active = true;
    const initial = ++generation.current;
    void probe((window as HostWindow).ethereum).then(result => {
      if (active && initial === generation.current) setRows({ ...result, observed: new Date().toISOString(), freshness: 'Snapshot only; refresh after changes.' });
    }, e => { if (active && initial === generation.current) setRows({ error: message(e) }); });
    void init({ timeout: 10000 }).then(() => { if (active) setSdk('Ready: Nimiq SDK init succeeded (does not prove EVM support)'); }, e => { if (active) setSdk(`Failed: ${message(e)}. EVM checks run independently.`); });
    // Host injection can arrive late; refresh always looks up window.ethereum again.
    const provider = (window as HostWindow).ethereum;
    const invalidate = () => { generation.current++; setRows({ status: 'Account/chain changed: previous results cleared. Refresh diagnostics.' }); };
    provider?.on?.('accountsChanged', invalidate);
    provider?.on?.('chainChanged', invalidate);
    return () => { active = false; provider?.removeListener?.('accountsChanged', invalidate); provider?.removeListener?.('chainChanged', invalidate); };
  }, []);
  async function walletAction(method: 'eth_requestAccounts' | 'wallet_switchEthereumChain' | 'personal_sign') {
    setBusy(true); setAction('Waiting for wallet…'); generation.current++; setRows({ status: 'Wallet interaction: refresh afterward.' });
    try {
      const provider = (window as HostWindow).ethereum;
      if (!provider) throw new Error('window.ethereum unavailable');
      let params: unknown;
      if (method === 'wallet_switchEthereumChain') params = [{ chainId: '0x89' }];
      if (method === 'personal_sign') {
        const accounts = await bounded(provider.request({ method: 'eth_accounts' }));
        if (!Array.isArray(accounts) || !accounts.length) throw new Error('Connect an account first');
        params = ['NestFlow diagnostics: reject this harmless message. No transaction or token approval.', accounts[0]];
      }
      await bounded(provider.request({ method, ...(params ? { params } : {}) }), 60000);
      setAction(`${method}: completed. Refresh to observe current state.`);
    } catch (e) { setAction(`${method}: ${message(e)}`); }
    finally { setBusy(false); }
  }
  return <main>
    <h1>NestFlow host diagnostics (M2)</h1>
    <p>Read-only snapshots. No approve, supply, withdraw or send transaction controls. POL pays gas.</p>
    <p role="status">Nimiq SDK: {sdk}</p>
    <button disabled={busy} onClick={() => void refresh()}>Refresh diagnostics</button>{' '}
    <button disabled={busy} onClick={() => void walletAction('eth_requestAccounts')}>Connect (wallet permission)</button>{' '}
    <button disabled={busy} onClick={() => void walletAction('wallet_switchEthereumChain')}>Request Polygon (137)</button>{' '}
    <button disabled={busy} onClick={() => void walletAction('personal_sign')}>Request test signature — reject in wallet</button>
    <p role="status">{action}</p>
    <dl aria-live="polite">{Object.entries(rows).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </main>;
}


