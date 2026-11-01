export const MAX_UINT256 = (1n << 256n) - 1n;
const BPS = 10_000n;
const YEAR_DAYS = 365n;
function nonnegative(...values: bigint[]) {
  if (values.some(value => value < 0n)) throw new RangeError('Amounts must be nonnegative');
}
function amount(value: bigint) {
  nonnegative(value);
  if (value > MAX_UINT256) throw new RangeError('Amount exceeds uint256');
}
function scale(decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 77) throw new RangeError('Invalid decimals');
  return 10n ** BigInt(decimals);
}
/** Strict decimal boundary: reject excess precision, signs, exponents and whitespace. */
export function parseAmount(text: string, decimals: number): bigint {
  const unit = scale(decimals);
  if (!/^\d+(\.\d+)?$/.test(text)) throw new RangeError('Invalid decimal amount');
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > decimals) throw new RangeError('Excess decimal precision');
  const value = BigInt(whole) * unit + BigInt(fraction.padEnd(decimals, '0') || '0');
  amount(value);
  return value;
}
export function formatAmount(value: bigint, decimals: number): string {
  amount(value);
  const unit = scale(decimals);
  const fraction = (value % unit).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${value / unit}${fraction ? `.${fraction}` : ''}`;
}
export function supplyableAmount(wallet: bigint, preference: bigint, tokenFee = 0n): bigint {
  [wallet, preference, tokenFee].forEach(amount);
  return wallet > preference + tokenFee ? wallet - preference - tokenFee : 0n;
}
export function spendingSplit(wallet: bigint, preference: bigint, supplied = 0n) {
  [wallet, preference, supplied].forEach(amount);
  const supply = supplyableAmount(wallet, preference);
  return { wallet: wallet - supply, supply, earningAfter: supplied + supply, withdrawalNeeded: preference > wallet ? preference - wallet : 0n };
}
/** Simple, noncompounding APR in basis points; gross floors to base units. Estimates only. */
export function earningsScenario(principal: bigint, aprBps: bigint, days: bigint, fees = 0n) {
  amount(principal); amount(fees); nonnegative(aprBps, days);
  const gross = principal * aprBps * days / (BPS * YEAR_DAYS);
  return { gross, net: gross - fees };
}
/** Whole days, rounded UP; null means a positive fee cannot be earned at this rate. */
export function feeBreakEvenDays(principal: bigint, aprBps: bigint, fees: bigint): bigint | null {
  amount(principal); amount(fees); nonnegative(aprBps);
  if (fees === 0n) return 0n;
  const denominator = principal * aprBps;
  if (denominator === 0n) return null;
  return (fees * BPS * YEAR_DAYS + denominator - 1n) / denominator;
}
export function paymentShortfall(payment: bigint, wallet: bigint, withdrawable: bigint) {
  [payment, wallet, withdrawable].forEach(amount);
  const shortfall = payment > wallet ? payment - wallet : 0n;
  const withdrawal = shortfall < withdrawable ? shortfall : withdrawable;
  return { shortfall, withdrawal, remaining: shortfall - withdrawal };
}
export interface PolQuote { usdtPerPol: bigint; source: string; observedAt: bigint }
/** Fees are POL wei. An optional quote uses USDT base units per whole POL; costs ceil. */
export function costPreview(entryFees: readonly bigint[], exitFee: bigint, quote?: PolQuote) {
  nonnegative(...entryFees, exitFee);
  if (quote) {
    nonnegative(quote.usdtPerPol, quote.observedAt);
    if (!quote.source || quote.usdtPerPol === 0n) throw new RangeError('Invalid quote');
  }
  const entryPolWei = entryFees.reduce((sum, fee) => sum + fee, 0n);
  const totalPolWei = entryPolWei + exitFee;
  return { entryPolWei, exitPolWei: exitFee, totalPolWei,
    totalUsdt: quote ? (totalPolWei * quote.usdtPerPol + 10n ** 18n - 1n) / 10n ** 18n : null,
    quote: quote ?? null };
}
