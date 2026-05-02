import { OgStorageClient } from "./storage-client";
import { ethers } from "ethers";

export interface ExecutionLog {
  taskId: string;
  agentId: string;
  agentAddress: string;
  modelName: string;
  inputPrompt: string;
  inputHash: string;
  output: string;
  outputHash: string;
  teeProvider: string;
  teeAttestation: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface LoggedReceipt {
  taskId: string;
  logRootHash: string;
  logTxHash: string;
  kvTxHash: string;
}

/**
 * ExecutionLogger - Records AI agent executions to 0G Storage.
 * Uses dual-layer approach:
 * - Log layer: permanent, tamper-proof storage of full execution data
 * - KV layer: fast indexed lookups by taskId and agentId
 */
export class ExecutionLogger {
  private readonly STREAM_ID = "0x" + "01".repeat(32);

  constructor(private storage: OgStorageClient) {}

  async logExecution(log: ExecutionLog): Promise<LoggedReceipt> {
    // 1. Compute input/output hashes for verification
    log.inputHash = ethers.keccak256(ethers.toUtf8Bytes(log.inputPrompt));
    log.outputHash = ethers.keccak256(ethers.toUtf8Bytes(log.output));

    // 2. Write to Log layer (permanent archive)
    const { rootHash, txHash: logTxHash } = await this.storage.uploadJson(
      log,
      `task-${log.taskId}`
    );

    // 3. Write to KV layer (fast index) — key = taskId, value = rootHash
    const kvTxHash = await this.storage.kvSet(this.STREAM_ID, log.taskId, rootHash);

    // 4. Create agent reverse-lookup index
    await this.storage.kvSet(
      this.STREAM_ID,
      `agent:${log.agentId}:${log.taskId}`,
      rootHash
    );

    return { taskId: log.taskId, logRootHash: rootHash, logTxHash, kvTxHash };
  }

  async retrieveByTaskId(taskId: string): Promise<ExecutionLog | null> {
    const rootHash = await this.storage.kvGet(this.STREAM_ID, taskId);
    if (!rootHash) return null;
    const tmpPath = `/tmp/${taskId}.json`;
    return this.storage.downloadJson<ExecutionLog>(rootHash, tmpPath);
  }

  async listTasksByAgent(agentId: string): Promise<string[]> {
    // In production: use KV prefix scan
    return [];
  }
}
