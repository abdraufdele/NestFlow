import { isAddressEqual, parseAbiItem, zeroAddress, type Address, type Hash, type PublicClient } from 'viem';
import { DOCUMENTED } from '../config/aave';
import { tokenAbi } from '../config/abi';
// Pool event interfaces: https://github.com/aave-dao/aave-v3-origin/blob/main/src/contracts/interfaces/IPool.sol
export const supplyEvent = parseAbiItem('event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)');
export const withdrawEvent = parseAbiItem('event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount)');
const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
export interface ConfirmedEvent { action: 'supply' | 'withdraw'; amount: bigint; blockNumber: bigint; blockHash: Hash; txHash: Hash; logIndex: number; timestamp: bigint }
export interface History { account: Address; fromBlock: bigint; toBlock: bigint; observedAt: bigint; supplied: bigint; events: ConfirmedEvent[]; externalTransfers: boolean; earnings: null; limitation: string }
export async function readHistory(client: PublicClient, account: Address, sinceBlock?: bigint): Promise<History> {
  if (await client.getChainId() !== 137) throw new Error('Polygon chain 137 required');
  const head = await client.getBlock();
  if (head.number === null || head.number < 1n || Date.now() - Number(head.timestamp) * 1000 > 60_000) throw new Error('Recent history observation unavailable');
  const toBlock = head.number - 1n;
  const windowStart = toBlock > 1999n ? toBlock - 1999n : 0n;
  const fromBlock = sinceBlock !== undefined && sinceBlock > windowStart ? sinceBlock : windowStart;
  if (fromBlock > toBlock) throw new Error('No confirmed history window yet');
  const observation = await client.getBlock({ blockNumber: toBlock });
  const supplied = await client.readContract({ address: DOCUMENTED.aToken, abi: tokenAbi, functionName: 'balanceOf', args: [account], blockNumber: toBlock });
  const events: ConfirmedEvent[] = []; let externalTransfers = false;
  const blocks = new Map<bigint, Awaited<ReturnType<typeof client.getBlock>>>();
  async function canonical(log: { blockNumber: bigint; blockHash: Hash }) {
    let block = blocks.get(log.blockNumber);
    if (!block) { block = await client.getBlock({ blockNumber: log.blockNumber }); blocks.set(log.blockNumber, block); }
    if (block.hash !== log.blockHash || block.number !== log.blockNumber) throw new Error('History changed: noncanonical log. Refresh.');
    return block.timestamp;
  }
  for (let start = fromBlock; start <= toBlock; start += 500n) {
    const end = start + 499n < toBlock ? start + 499n : toBlock;
    const [supplies, withdrawals, incoming, outgoing] = await Promise.all([
      client.getLogs({ address: DOCUMENTED.pool, event: supplyEvent, args: { reserve: DOCUMENTED.underlying, onBehalfOf: account }, fromBlock: start, toBlock: end, strict: true }),
      client.getLogs({ address: DOCUMENTED.pool, event: withdrawEvent, args: { reserve: DOCUMENTED.underlying, user: account }, fromBlock: start, toBlock: end, strict: true }),
      client.getLogs({ address: DOCUMENTED.aToken, event: transferEvent, args: { to: account }, fromBlock: start, toBlock: end, strict: true }),
      client.getLogs({ address: DOCUMENTED.aToken, event: transferEvent, args: { from: account }, fromBlock: start, toBlock: end, strict: true }),
    ]);
    for (const [action, logs] of [['supply', supplies], ['withdraw', withdrawals]] as const) {
      for (const log of logs) {
        const owner = 'onBehalfOf' in log.args ? log.args.onBehalfOf : log.args.user;
        if (log.removed || log.blockNumber === null || log.blockNumber < start || log.blockNumber > end || !log.blockHash || !log.transactionHash || log.logIndex === null || !isAddressEqual(log.address, DOCUMENTED.pool) || !isAddressEqual(log.args.reserve, DOCUMENTED.underlying) || !isAddressEqual(owner, account)) throw new Error('Invalid confirmed event');
        events.push({ action, amount: log.args.amount, blockNumber: log.blockNumber, blockHash: log.blockHash, txHash: log.transactionHash, logIndex: log.logIndex, timestamp: await canonical({ blockNumber: log.blockNumber, blockHash: log.blockHash }) });
      }
    }
    for (const log of [...incoming, ...outgoing]) {
      if (log.removed || log.blockNumber === null || !log.blockHash || log.blockNumber < start || log.blockNumber > end) throw new Error('Invalid transfer history');
      await canonical({ blockNumber: log.blockNumber, blockHash: log.blockHash });
      if (!isAddressEqual(log.args.from, zeroAddress) && !isAddressEqual(log.args.to, zeroAddress)) externalTransfers = true;
    }
  }
  // Detect a reorg during pagination; never retain partial results on failure.
  if ((await client.getBlock({ blockNumber: toBlock })).hash !== observation.hash) throw new Error('History changed: noncanonical observation. Refresh.');
  events.sort((a, b) => a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : a.logIndex - b.logIndex);
  return { account, fromBlock, toBlock, observedAt: observation.timestamp, supplied, events, externalTransfers, earnings: null,
    limitation: 'Incomplete lifetime history: only the last 2,000 blocks are queried. Earlier events and external aToken transfers may be missing. Reconstructed earnings unavailable.' };
}
