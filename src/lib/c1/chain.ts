/**
 * C1 - ledger source (server side only).
 *
 *  - LIVE: when C1_RPC_URL and C1_ESCROW_ADDRESS are set, every event of the
 *    deployed ScholarshipEscrow contract is read straight from the chain
 *    (Sepolia in the pilot) and decoded with the compiled ABI.
 *  - SIMULATION: otherwise the bundled log from `npm run simulate`
 *    (blockchain/) is served, clearly labelled as a local simulation.
 *
 * Nothing here holds a private key: the web app only READS the chain. Writes
 * (award / verify milestone) are signed by university admins, never by the server.
 */
import { createHash } from "node:crypto";
import { Interface, JsonRpcProvider } from "ethers";
import abi from "./abi/ScholarshipEscrow.json";
import demoLedger from "./demo-ledger.json";
import { canonicalLedgerString, type LedgerEvent, type LedgerEventType, type LedgerFile } from "./ledger";

/** SHA-256 integrity fingerprint of the full event log (hex). Anyone holding the log can recompute it. */
export function ledgerDigest(events: LedgerEvent[]): string {
  return createHash("sha256").update(canonicalLedgerString(events)).digest("hex");
}

const KNOWN_EVENTS = new Set<string>([
  "CampaignCreated",
  "CampaignToppedUp",
  "CampaignClosed",
  "ScholarshipAwarded",
  "MilestoneVerified",
  "FundsDisbursed",
  "DisbursementQueued",
  "AwardCompleted",
  "AwardRevoked",
  "PendingWithdrawn"
]);

const CACHE_TTL_MS = 15_000;
const LOG_CHUNK_BLOCKS = 2_000;

let cache: { at: number; value: LedgerFile } | null = null;

export function isLiveLedgerConfigured(): boolean {
  return Boolean(process.env.C1_RPC_URL && process.env.C1_ESCROW_ADDRESS);
}

function simulationLedger(): LedgerFile {
  const file = demoLedger as unknown as LedgerFile;
  return { meta: { ...file.meta, source: "simulation" }, events: file.events };
}

async function readLiveLedger(): Promise<LedgerFile> {
  const rpcUrl = process.env.C1_RPC_URL as string;
  const address = process.env.C1_ESCROW_ADDRESS as string;
  const fromBlock = Number(process.env.C1_DEPLOY_BLOCK ?? "0");

  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  const latest = await provider.getBlockNumber();
  const isLocalChain = Number(network.chainId) === 31337;
  if (!process.env.C1_DEPLOY_BLOCK && !isLocalChain) {
    // Scanning a public chain from block 0 would take thousands of RPC calls.
    throw new Error("C1_DEPLOY_BLOCK must be set (the block the contract was deployed in) for public networks.");
  }
  const iface = new Interface(abi);

  const events: LedgerEvent[] = [];
  const blockTimes = new Map<number, number>();

  for (let start = fromBlock; start <= latest; start += LOG_CHUNK_BLOCKS) {
    const end = Math.min(start + LOG_CHUNK_BLOCKS - 1, latest);
    const logs = await provider.getLogs({ address, fromBlock: start, toBlock: end });
    for (const log of logs) {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (!parsed || !KNOWN_EVENTS.has(parsed.name)) continue;
      let timestamp = blockTimes.get(log.blockNumber);
      if (timestamp === undefined) {
        const block = await provider.getBlock(log.blockNumber);
        timestamp = block?.timestamp ?? 0;
        blockTimes.set(log.blockNumber, timestamp);
      }
      const args: Record<string, string> = {};
      parsed.fragment.inputs.forEach((input, i) => {
        args[input.name] = String(parsed.args[i]);
      });
      events.push({
        id: `${log.transactionHash}:${log.index}`,
        type: parsed.name as LedgerEventType,
        blockNumber: log.blockNumber,
        timestamp,
        txHash: log.transactionHash,
        logIndex: log.index,
        args
      });
    }
  }

  return {
    meta: {
      network: network.name === "unknown" ? `chain-${network.chainId}` : network.name,
      chainId: Number(network.chainId),
      contractAddress: address,
      contract: "ScholarshipEscrow",
      eventCount: events.length,
      source: "live"
    },
    events
  };
}

/** Returns the audit ledger (cached for 15 s). Throws if a configured live read fails. */
export async function loadLedger(): Promise<LedgerFile> {
  if (!isLiveLedgerConfigured()) return simulationLedger();
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const value = await readLiveLedger();
  cache = { at: Date.now(), value };
  return value;
}
