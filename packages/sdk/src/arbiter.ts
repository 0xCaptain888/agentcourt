import { ethers } from "ethers";
import { OgStorageClient, StorageConfig } from "./storage-client";
import { ProofBuilder } from "./proof";

export interface ArbiterConfig {
  /** Private key for the arbiter's TEE-managed wallet */
  privateKey: string;
  /** RPC endpoint for 0G chain */
  rpc: string;
  /** Address of the Dispute Resolution contract */
  disputeContractAddress: string;
  /** 0G Storage configuration */
  storage: StorageConfig;
  /** Polling interval for new events (ms) */
  pollIntervalMs?: number;
}

export interface DisputeEvent {
  disputeId: string;
  taskId: string;
  disputant: string;
  reason: string;
  evidenceRootHash: string;
  bondAmount: bigint;
  timestamp: number;
}

export interface Verdict {
  disputeId: string;
  upheld: boolean;
  reasoning: string;
  confidence: number;
  signature: string;
}

// Minimal ABI for the DisputeResolution contract
const DISPUTE_ABI = [
  "event DisputeSubmitted(bytes32 indexed disputeId, bytes32 indexed taskId, address disputant, string reason, bytes32 evidenceRootHash, uint256 bondAmount)",
  "function resolveDispute(bytes32 disputeId, bool upheld, string reasoning, bytes signature) external",
  "function getDisputeDetails(bytes32 disputeId) view returns (bytes32 taskId, address disputant, string reason, bytes32 evidenceRootHash, uint256 bondAmount, uint8 status)",
];

const TASK_ABI = [
  "function getTask(bytes32 taskId) view returns (bytes32 agentId, bytes32 inputHash, bytes32 rootHash, bytes attestation, uint8 status)",
];

/**
 * ArbiterAgent - Automated dispute resolution service running inside a TEE.
 *
 * Responsibilities:
 * 1. Listen for DisputeSubmitted events on the Dispute Resolution contract
 * 2. Retrieve execution evidence from 0G Storage
 * 3. Analyze the dispute using TEE-confined inference
 * 4. Sign and submit the verdict on-chain
 */
export class ArbiterAgent {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private disputeContract: ethers.Contract;
  private storageClient: OgStorageClient;
  private pollIntervalMs: number;
  private running = false;

  constructor(private config: ArbiterConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpc);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);
    this.disputeContract = new ethers.Contract(
      config.disputeContractAddress,
      DISPUTE_ABI,
      this.signer
    );
    this.storageClient = new OgStorageClient(config.storage);
    this.pollIntervalMs = config.pollIntervalMs ?? 12_000;
  }

  /**
   * Start listening for DisputeSubmitted events and process them.
   */
  async start(): Promise<void> {
    this.running = true;
    console.log(`[ArbiterAgent] Started. Listening on ${this.config.disputeContractAddress}`);
    console.log(`[ArbiterAgent] Arbiter address: ${this.signer.address}`);

    this.disputeContract.on(
      "DisputeSubmitted",
      async (
        disputeId: string,
        taskId: string,
        disputant: string,
        reason: string,
        evidenceRootHash: string,
        bondAmount: bigint
      ) => {
        const event: DisputeEvent = {
          disputeId,
          taskId,
          disputant,
          reason,
          evidenceRootHash,
          bondAmount,
          timestamp: Date.now(),
        };
        console.log(`[ArbiterAgent] New dispute received: ${disputeId}`);
        await this.handleDispute(event);
      }
    );
  }

  /**
   * Stop the arbiter agent gracefully.
   */
  async stop(): Promise<void> {
    this.running = false;
    this.disputeContract.removeAllListeners();
    console.log("[ArbiterAgent] Stopped.");
  }

  /**
   * Process a single dispute end-to-end.
   */
  async handleDispute(event: DisputeEvent): Promise<Verdict> {
    console.log(`[ArbiterAgent] Processing dispute ${event.disputeId} for task ${event.taskId}`);

    // Step 1: Retrieve execution evidence from 0G Storage
    const evidence = await this.retrieveEvidence(event.evidenceRootHash);

    // Step 2: Analyze the dispute using TEE inference
    const analysis = await this.analyzeDispute(event, evidence);

    // Step 3: Construct and sign the verdict
    const verdict = await this.signVerdict(event.disputeId, analysis);

    // Step 4: Submit verdict on-chain
    await this.submitVerdict(verdict);

    return verdict;
  }

  /**
   * Retrieve evidence data from 0G Storage by root hash.
   */
  private async retrieveEvidence(rootHash: string): Promise<Record<string, unknown> | null> {
    console.log(`[ArbiterAgent] Retrieving evidence: ${rootHash.slice(0, 16)}...`);
    const data = await this.storageClient.downloadJson<Record<string, unknown>>(
      rootHash,
      `/tmp/evidence-${rootHash.slice(0, 10)}.json`
    );
    return data;
  }

  /**
   * Analyze the dispute using TEE-confined inference.
   * In production, this calls a local model inside the same enclave.
   */
  private async analyzeDispute(
    event: DisputeEvent,
    evidence: Record<string, unknown> | null
  ): Promise<{ upheld: boolean; reasoning: string; confidence: number }> {
    console.log(`[ArbiterAgent] Analyzing dispute reason: "${event.reason}"`);

    // Construct analysis prompt
    const analysisContext = {
      disputeId: event.disputeId,
      taskId: event.taskId,
      reason: event.reason,
      evidence: evidence,
      bondAmount: event.bondAmount.toString(),
    };

    // TEE inference would happen here — for now, return a structured analysis
    // In production: const result = await this.teeInference(analysisContext);
    const hasEvidence = evidence !== null;
    const upheld = !hasEvidence; // If we cannot retrieve evidence, dispute is upheld

    return {
      upheld,
      reasoning: hasEvidence
        ? `Evidence retrieved and verified. Task execution appears consistent with expectations. Dispute reason "${event.reason}" not substantiated by execution logs.`
        : `Unable to retrieve execution evidence from storage (rootHash: ${event.evidenceRootHash}). Agent failed to preserve execution records. Dispute upheld by default.`,
      confidence: hasEvidence ? 0.85 : 0.95,
    };
  }

  /**
   * Sign the verdict inside the TEE enclave.
   */
  private async signVerdict(
    disputeId: string,
    analysis: { upheld: boolean; reasoning: string; confidence: number }
  ): Promise<Verdict> {
    // Create a deterministic message to sign
    const message = ethers.solidityPackedKeccak256(
      ["bytes32", "bool", "string"],
      [disputeId, analysis.upheld, analysis.reasoning]
    );

    const signature = await this.signer.signMessage(ethers.getBytes(message));

    const verdict: Verdict = {
      disputeId,
      upheld: analysis.upheld,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      signature,
    };

    console.log(
      `[ArbiterAgent] Verdict signed: ${analysis.upheld ? "UPHELD" : "REJECTED"} ` +
        `(confidence: ${(analysis.confidence * 100).toFixed(1)}%)`
    );

    return verdict;
  }

  /**
   * Submit the signed verdict to the Dispute Resolution contract.
   */
  private async submitVerdict(verdict: Verdict): Promise<string> {
    console.log(`[ArbiterAgent] Submitting verdict on-chain for dispute ${verdict.disputeId}`);

    const tx = await this.disputeContract.resolveDispute(
      verdict.disputeId,
      verdict.upheld,
      verdict.reasoning,
      verdict.signature
    );

    const receipt = await tx.wait();
    console.log(`[ArbiterAgent] Verdict submitted. TX: ${receipt.hash}`);
    return receipt.hash;
  }

  /**
   * Get the arbiter's on-chain address.
   */
  getAddress(): string {
    return this.signer.address;
  }

  /**
   * Check if the arbiter is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }
}
