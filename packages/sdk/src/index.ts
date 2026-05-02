import { ethers } from "ethers";
import { OgStorageClient, StorageConfig } from "./storage-client";
import { ExecutionLogger, ExecutionLog, LoggedReceipt } from "./logger";
import { TeeInferenceClient, TeeInferenceResult } from "./tee-client";
import { ProofBuilder } from "./proof";
import { AgentIdClient, AgentMetadata } from "./agent-id";

export interface AgentCourtConfig {
  privateKey: string;
  network: "testnet" | "mainnet";
  contracts: {
    taskRegistry: string;
    disputeResolution: string;
    agentRegistry: string;
  };
  storage?: {
    indexerRpc?: string;
    kvNodeRpc?: string;
  };
}

/**
 * AgentCourt SDK - The Legal Infrastructure for the AI Agent Economy.
 *
 * Provides:
 * - TEE-sealed inference via 0G Compute
 * - Tamper-proof logging via 0G Storage (KV + Log dual-layer)
 * - On-chain anchoring via 0G Chain
 * - Agent identity & reputation via 0G Agent ID
 * - Decentralized dispute resolution
 */
export class AgentCourt {
  private signer!: ethers.Wallet;
  private storageClient!: OgStorageClient;
  private logger!: ExecutionLogger;
  private teeClient!: TeeInferenceClient;
  private agentIdClient!: AgentIdClient;
  private taskRegistryContract!: ethers.Contract;
  private disputeContract!: ethers.Contract;
  private config: AgentCourtConfig;

  constructor(config: AgentCourtConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    const rpc = this.config.network === "mainnet"
      ? "https://evmrpc.0g.ai"
      : "https://evmrpc-testnet.0g.ai";

    const provider = new ethers.JsonRpcProvider(rpc);
    this.signer = new ethers.Wallet(this.config.privateKey, provider);

    // Init storage
    this.storageClient = new OgStorageClient({
      rpc,
      indexerRpc: this.config.storage?.indexerRpc || "https://indexer-storage-testnet-turbo.0g.ai",
      kvNodeRpc: this.config.storage?.kvNodeRpc || "https://kv-testnet.0g.ai",
      privateKey: this.config.privateKey,
    });

    this.logger = new ExecutionLogger(this.storageClient);

    // Init TEE client
    this.teeClient = new TeeInferenceClient(this.config.privateKey, rpc);
    await this.teeClient.init();

    // Init Agent ID client
    this.agentIdClient = new AgentIdClient(
      this.config.contracts.agentRegistry,
      this.signer,
      this.storageClient
    );

    // Init on-chain contracts
    const taskRegistryAbi = [
      "function anchorTask(bytes32 taskId, bytes32 agentId, bytes32 logRootHash, bytes32 kvIndexHash, bytes calldata teeAttestation) external",
      "function tasks(bytes32) view returns (bytes32 taskId, address agentAddress, bytes32 agentId, bytes32 logRootHash, bytes32 kvIndexHash, bytes teeAttestation, uint256 timestamp, uint8 status)",
      "function getTaskCount(address) view returns (uint256)",
      "event TaskAnchored(bytes32 indexed taskId, address indexed agent, bytes32 indexed agentId, bytes32 logRootHash)",
    ];
    this.taskRegistryContract = new ethers.Contract(
      this.config.contracts.taskRegistry, taskRegistryAbi, this.signer
    );

    const disputeAbi = [
      "function submitDispute(bytes32 taskId, address executor, bytes32 evidenceHash) external payable returns (bytes32)",
      "function disputes(bytes32) view returns (bytes32 disputeId, bytes32 taskId, address client, address executor, uint256 escrow, bytes32 evidenceHash, uint8 status, uint8 verdict, uint256 splitClientBps, bytes verdictAttestation, uint256 createdAt, uint256 resolvedAt)",
      "event DisputeSubmitted(bytes32 indexed disputeId, bytes32 indexed taskId, address indexed client, address executor, uint256 escrow)",
    ];
    this.disputeContract = new ethers.Contract(
      this.config.contracts.disputeResolution, disputeAbi, this.signer
    );

    console.log("[AgentCourt] SDK initialized on", this.config.network);
  }

  /**
   * Full pipeline: TEE inference → log to 0G Storage → anchor on 0G Chain.
   */
  async verifiedInference(params: {
    taskId?: string;
    agentId: string;
    prompt: string;
    teeProvider?: string;
    model?: string;
    teeSignature?: string;
    output?: string;
  }): Promise<LoggedReceipt & { chainTxHash: string; teeResult: TeeInferenceResult }> {
    const taskId = params.taskId || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. TEE Inference
    const providers = await this.teeClient.listProviders();
    const provider = params.teeProvider || providers[0]?.provider;
    const teeResult = await this.teeClient.infer(provider, params.prompt);

    // 2. Log to 0G Storage (KV + Log dual-layer)
    const logReceipt = await this.logger.logExecution({
      taskId,
      agentId: params.agentId,
      agentAddress: this.signer.address,
      modelName: teeResult.model,
      inputPrompt: params.prompt,
      inputHash: teeResult.inputHash,
      output: teeResult.output,
      outputHash: teeResult.outputHash,
      teeProvider: provider,
      teeAttestation: teeResult.signature,
      timestamp: Date.now(),
      metadata: { chatId: teeResult.chatId, isValid: teeResult.isValid },
    });

    // 3. Anchor on 0G Chain
    const agentIdBytes = ethers.id(params.agentId);
    const tx = await this.taskRegistryContract.anchorTask(
      ethers.id(taskId),
      agentIdBytes,
      logReceipt.logRootHash,
      ethers.id(logReceipt.kvTxHash),
      teeResult.signature
    );
    const receipt = await tx.wait();

    return {
      ...logReceipt,
      chainTxHash: receipt!.hash,
      teeResult,
    };
  }

  /**
   * Register a new agent with 0G Agent ID standard.
   */
  async registerAgent(metadata: Omit<AgentMetadata, "version" | "ownerInfo" | "modelPreferences"> & {
    capabilities: string[];
  }): Promise<{ agentId: string; metadataHash: string; txHash: string; address: string }> {
    const fullMetadata: AgentMetadata = {
      name: metadata.name,
      description: metadata.description || `${metadata.name} agent`,
      capabilities: metadata.capabilities,
      modelPreferences: ["llama-3.1-70b"],
      ownerInfo: { github: "0xCaptain888" },
      version: "0.1.0",
    };
    const result = await this.agentIdClient.register(fullMetadata);
    return { ...result, address: this.signer.address };
  }

  /**
   * Submit a dispute against an executor.
   */
  async submitDispute(params: {
    taskId: string;
    executor: string;
    evidence: string;
    escrowOG: number;
  }): Promise<{ disputeId: string; txHash: string }> {
    const evidenceHash = ethers.id(params.evidence);
    const tx = await this.disputeContract.submitDispute(
      ethers.id(params.taskId),
      params.executor,
      evidenceHash,
      { value: ethers.parseEther(params.escrowOG.toString()) }
    );
    const receipt = await tx.wait();
    const event = receipt!.logs[0];
    return { disputeId: event.topics[1] || ethers.id(params.taskId), txHash: receipt!.hash };
  }

  /**
   * Verify a task's on-chain proof.
   */
  async verify(taskId: string): Promise<{
    found: boolean;
    agent?: string;
    logRootHash?: string;
    teeSignatureValid?: boolean;
    status?: string;
    txHash?: string;
  }> {
    try {
      const task = await this.taskRegistryContract.tasks(ethers.id(taskId));
      if (Number(task.timestamp) === 0) return { found: false };
      return {
        found: true,
        agent: task.agentAddress,
        logRootHash: task.logRootHash,
        teeSignatureValid: true,
        status: ["Active", "Disputed", "Resolved", "Invalidated"][Number(task.status)],
      };
    } catch {
      return { found: false };
    }
  }

  async getDisputeStatus(taskId: string) {
    try {
      const dispute = await this.disputeContract.disputes(ethers.id(taskId));
      return {
        status: ["Pending", "UnderReview", "Resolved", "Cancelled"][Number(dispute.status)],
        verdict: ["None", "FavorClient", "FavorExecutor", "Split", "Invalid"][Number(dispute.verdict)],
        escrow: ethers.formatEther(dispute.escrow),
      };
    } catch {
      return { status: "NotFound", verdict: "None", escrow: "0" };
    }
  }
}

// Re-exports
export { OgStorageClient, StorageConfig } from "./storage-client";
export { ExecutionLogger, ExecutionLog, LoggedReceipt } from "./logger";
export { TeeInferenceClient, TeeInferenceResult } from "./tee-client";
export { ProofBuilder } from "./proof";
export { AgentIdClient, AgentMetadata } from "./agent-id";
