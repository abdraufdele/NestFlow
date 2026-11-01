import { createWalletClient, custom, type EIP1193Provider } from 'viem';
import { polygon } from 'viem/chains';
/** M1 construction only; host probing/connection UI belongs to M2. No alternate SDK. */
export function injectedWallet(provider?: EIP1193Provider) {
  const injected = provider ?? (typeof window === 'undefined' ? undefined : (window as Window & { ethereum?: EIP1193Provider }).ethereum);
  if (!injected) throw new Error('Injected window.ethereum provider unavailable');
  return createWalletClient({ chain: polygon, transport: custom(injected) });
}
