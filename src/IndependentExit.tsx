import { AAVE_SOURCES, DOCUMENTED } from './config/aave';
export function IndependentExit() {
  return <section className="panel" aria-labelledby="independent-heading">
    <h2 id="independent-heading">Exit independently through Aave</h2>
    <p>You can access the same on-chain position if NestFlow is unavailable. This route has not been tested in installed Nimiq Pay.</p>
    <ol>
      <li>Open <a href="https://app.aave.com/">Aave’s application</a> using a compatible wallet browser. Check the domain. Never share or export a seed phrase to use this route.</li>
      <li>Connect the same Polygon account that owns the supplied position. Select the Polygon V3 market, chain 137. Keep POL for gas.</li>
      <li>Find USDT/USDT0 under your supplies. Compare its underlying token and aToken with the addresses below; symbols alone do not identify a token.</li>
      <li>Choose Withdraw and enter the amount. Review available liquidity, paused reserve restrictions and any debt/collateral limits. A frozen reserve can still permit withdrawals; a pause blocks them.</li>
      <li>Review the destination account, amount, network and POL fee in the wallet. Confirm only the withdrawal you intend. Wait for a successful receipt and check wallet and supplied balances before retrying. A pending or unknown transaction must be reconciled first.</li>
      <li>Make any payment separately after withdrawal confirmation. If the wallet cannot connect to Aave, consult Aave’s help for compatible access; this alternative route is not verified in Nimiq Pay.</li>
    </ol>
    <dl className="details exit-addresses">{Object.entries(DOCUMENTED).map(([name, address]) => <div key={name}><dt>{name}</dt><dd><a href={'https://polygonscan.com/address/' + address}>{address}</a></dd></div>)}</dl>
    <p>Addresses come from <code>src/config/aave.ts</code>: <a href={AAVE_SOURCES.addresses}>Aave address documentation</a> and <a href={AAVE_SOURCES.registry}>Polygon address registry</a>. NestFlow resolves and verifies the Pool through the provider when connected; recheck the current registry if contracts change.</p>
    <p><a href={AAVE_SOURCES.withdrawal}>Aave withdrawal instructions</a> · <a href="/">Return to NestFlow</a></p>
  </section>;
}
