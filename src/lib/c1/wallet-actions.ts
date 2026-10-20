/**
 * C1 - Donor & Admin smart-contract transaction preparation and execution helpers
 * for `ScholarshipEscrow.sol` (FR02, FR06, FR09).
 *
 * The Next.js server never holds a private key. Instead, donors and welfare officers
 * sign state-changing calls (`createCampaign`, `topUpCampaign`, `awardScholarship`,
 * `verifyMilestone`) in their browser wallet (`window.ethereum`), while all inputs
 * and cryptographic commitments (`metadataHash`, `studentRef`, `assessmentHash`,
 * `evidenceHash`) are validated and computed deterministically before signing.
 */
import { BrowserProvider, Contract, isAddress, keccak256, parseEther, toUtf8Bytes, ZeroAddress } from "ethers";
import escrowArtifact from "./abi/ScholarshipEscrow.json";

const BYTES32_RE = /^0x[0-9a-fA-F]{64}$/;

export type PreparedCreateCampaign = {
  fn: "createCampaign";
  title: string;
  metadataHash: string;
  amountEth: string;
  valueWei: string;
};

export type PreparedTopUpCampaign = {
  fn: "topUpCampaign";
  campaignId: number;
  amountEth: string;
  valueWei: string;
};

export type PreparedAwardScholarship = {
  fn: "awardScholarship";
  campaignId: number;
  beneficiary: string;
  studentRef: string;
  assessmentHash: string;
  totalAmountEth: string;
  totalAmountWei: string;
  milestoneCount: number;
};

export type PreparedVerifyMilestone = {
  fn: "verifyMilestone";
  awardId: number;
  evidenceNote: string;
  evidenceHash: string;
};

function parsePositiveWei(amountEth: string): bigint | null {
  const trimmed = amountEth.trim();
  if (!trimmed) return null;
  try {
    const wei = parseEther(trimmed);
    return wei > 0n ? wei : null;
  } catch {
    return null;
  }
}

export function prepareCreateCampaign(input: {
  title: string;
  amountEth: string;
}): { ok: true; data: PreparedCreateCampaign } | { ok: false; error: string } {
  const title = input.title.trim();
  if (title.length < 3) {
    return { ok: false, error: "Campaign title / criteria summary must be at least 3 characters." };
  }
  const wei = parsePositiveWei(input.amountEth);
  if (!wei) {
    return { ok: false, error: "Deposit amount must be a positive ETH value." };
  }
  return {
    ok: true,
    data: {
      fn: "createCampaign",
      title,
      metadataHash: keccak256(toUtf8Bytes(title)),
      amountEth: input.amountEth.trim(),
      valueWei: wei.toString()
    }
  };
}

export function prepareTopUpCampaign(input: {
  campaignId: string | number;
  amountEth: string;
}): { ok: true; data: PreparedTopUpCampaign } | { ok: false; error: string } {
  const id = Number(input.campaignId);
  if (!Number.isInteger(id) || id < 1) {
    return { ok: false, error: "Select a valid open campaign." };
  }
  const wei = parsePositiveWei(input.amountEth);
  if (!wei) {
    return { ok: false, error: "Top-up amount must be a positive ETH value." };
  }
  return {
    ok: true,
    data: {
      fn: "topUpCampaign",
      campaignId: id,
      amountEth: input.amountEth.trim(),
      valueWei: wei.toString()
    }
  };
}

export function prepareAwardScholarship(input: {
  campaignId: string | number;
  beneficiary: string;
  studentRef: string;
  assessmentHash: string;
  totalAmountEth: string;
  milestoneCount: string | number;
}): { ok: true; data: PreparedAwardScholarship } | { ok: false; error: string } {
  const campaignId = Number(input.campaignId);
  if (!Number.isInteger(campaignId) || campaignId < 1) {
    return { ok: false, error: "Select a valid open campaign." };
  }
  const beneficiary = input.beneficiary.trim();
  if (!isAddress(beneficiary) || beneficiary.toLowerCase() === ZeroAddress.toLowerCase()) {
    return { ok: false, error: "Enter a valid non-zero beneficiary wallet address." };
  }
  const studentRef = input.studentRef.trim();
  if (!BYTES32_RE.test(studentRef)) {
    return { ok: false, error: "studentRef must be a 32-byte hex hash (0x...)." };
  }
  const assessmentHash = input.assessmentHash.trim();
  if (!BYTES32_RE.test(assessmentHash)) {
    return { ok: false, error: "assessmentHash must be a 32-byte hex hash (0x...)." };
  }
  const wei = parsePositiveWei(input.totalAmountEth);
  if (!wei) {
    return { ok: false, error: "Total scholarship amount must be a positive ETH value." };
  }
  const milestoneCount = Number(input.milestoneCount);
  if (!Number.isInteger(milestoneCount) || milestoneCount < 1 || milestoneCount > 12) {
    return { ok: false, error: "Milestone count must be between 1 and 12." };
  }
  return {
    ok: true,
    data: {
      fn: "awardScholarship",
      campaignId,
      beneficiary,
      studentRef,
      assessmentHash,
      totalAmountEth: input.totalAmountEth.trim(),
      totalAmountWei: wei.toString(),
      milestoneCount
    }
  };
}

export function prepareVerifyMilestone(input: {
  awardId: string | number;
  evidenceNote: string;
}): { ok: true; data: PreparedVerifyMilestone } | { ok: false; error: string } {
  const awardId = Number(input.awardId);
  if (!Number.isInteger(awardId) || awardId < 1) {
    return { ok: false, error: "Select a valid active award." };
  }
  const note = input.evidenceNote.trim();
  if (note.length < 3) {
    return { ok: false, error: "Enter a brief milestone verification note (at least 3 characters)." };
  }
  return {
    ok: true,
    data: {
      fn: "verifyMilestone",
      awardId,
      evidenceNote: note,
      evidenceHash: keccak256(toUtf8Bytes(note))
    }
  };
}

type EthereumWindow = Window & {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
};

export function hasInjectedWallet(): boolean {
  return typeof window !== "undefined" && Boolean((window as EthereumWindow).ethereum);
}

/** Signs and broadcasts a prepared `ScholarshipEscrow` call using the browser wallet (`window.ethereum`). */
export async function submitEscrowAction(
  contractAddress: string,
  action: PreparedCreateCampaign | PreparedTopUpCampaign | PreparedAwardScholarship | PreparedVerifyMilestone
): Promise<{ txHash: string; signer: string }> {
  const eth = typeof window !== "undefined" ? (window as EthereumWindow).ethereum : undefined;
  if (!eth) {
    throw new Error("No browser wallet detected (e.g. MetaMask).");
  }
  await eth.request({ method: "eth_requestAccounts" });
  const provider = new BrowserProvider(eth);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const contract = new Contract(contractAddress, escrowArtifact, signer);

  let tx: { hash: string; wait: () => Promise<unknown> };
  switch (action.fn) {
    case "createCampaign":
      tx = await contract.createCampaign(action.metadataHash, { value: BigInt(action.valueWei) });
      break;
    case "topUpCampaign":
      tx = await contract.topUpCampaign(action.campaignId, { value: BigInt(action.valueWei) });
      break;
    case "awardScholarship":
      tx = await contract.awardScholarship(
        action.campaignId,
        action.beneficiary,
        action.studentRef,
        action.assessmentHash,
        BigInt(action.totalAmountWei),
        action.milestoneCount
      );
      break;
    case "verifyMilestone":
      tx = await contract.verifyMilestone(action.awardId, action.evidenceHash);
      break;
  }
  await tx.wait();
  return { txHash: tx.hash, signer: address };
}
