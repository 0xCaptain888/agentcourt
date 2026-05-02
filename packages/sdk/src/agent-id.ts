import { ethers } from "ethers";
import { OgStorageClient } from "./storage-client";

export interface AgentMetadata {
  name: string;
  description: string;
  capabilities: string[];
  modelPreferences: string[];
  ownerInfo: { x?: string; github?: string };
  version: string;
}

/**
 * Agent ID Client - Manages on-chain agent identities following 0G Agent ID standard.
 * Each agent has: unique ID, metadata (stored in 0G Storage), reputation score.
 */
export class AgentIdClient {
  private contract: ethers.Contract;

  constructor(
    contractAddress: string,
    signer: ethers.Signer,
    private storage: OgStorageClient
  ) {
    const abi = [
      "function registerAgent(bytes32 agentId, bytes32 metadataHash) external",
      "function agents(bytes32) view returns (bytes32 agentId, address owner, bytes32 metadataHash, uint256 reputationScore, uint256 totalTasks, uint256 successfulTasks, uint256 disputedTasks, uint256 registeredAt, bool isActive)",
      "function updateMetadata(bytes32 agentId, bytes32 newHash) external",
      "function recordTaskOutcome(bytes32 agentId, bool success, bool disputed) external",
      "event AgentRegistered(bytes32 indexed agentId, address indexed owner)",
      "event ReputationUpdated(bytes32 indexed agentId, uint256 newScore)",
    ];
    this.contract = new ethers.Contract(contractAddress, abi, signer);
  }

  async register(metadata: AgentMetadata): Promise<{ agentId: string; metadataHash: string; txHash: string }> {
    // 1. Upload metadata to 0G Storage
    const { rootHash } = await this.storage.uploadJson(metadata, `agent-meta-${metadata.name}`);

    // 2. Compute agentId
    const agentId = ethers.id(`${metadata.name}-${Date.now()}`);
    const metadataHash = rootHash;

    // 3. Register on-chain
    const tx = await this.contract.registerAgent(agentId, metadataHash);
    const receipt = await tx.wait();
    return { agentId, metadataHash, txHash: receipt!.hash };
  }

  async getProfile(agentId: string) {
    return this.contract.agents(agentId);
  }

  async getReputation(agentId: string): Promise<number> {
    const p = await this.contract.agents(agentId);
    return Number(p.reputationScore);
  }

  async getMetadata(agentId: string): Promise<AgentMetadata | null> {
    const profile = await this.contract.agents(agentId);
    if (!profile.metadataHash || profile.metadataHash === ethers.ZeroHash) return null;
    return this.storage.downloadJson<AgentMetadata>(profile.metadataHash, `/tmp/${agentId}.json`);
  }
}
