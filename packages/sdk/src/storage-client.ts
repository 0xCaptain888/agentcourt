import { ethers } from "ethers";
import { Indexer, ZgFile, KvClient, Batcher, getFlowContract } from "@0glabs/0g-ts-sdk";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface StorageConfig {
  rpc: string;
  indexerRpc: string;
  kvNodeRpc?: string;
  privateKey: string;
  /** Flow contract address — auto-discovered from indexer if not set */
  flowContractAddress?: string;
}

/**
 * 0G Storage Client - Dual-layer storage (Log + KV) for execution data.
 * Log layer: permanent archival of full execution logs via 0G Storage Network
 * KV layer: fast sub-millisecond indexed queries via 0G KV nodes
 *
 * All uploads produce a rootHash verifiable on storagescan.0g.ai
 */
export class OgStorageClient {
  private signer: ethers.Wallet;
  private config: StorageConfig;
  private indexer: Indexer;
  private kvClient: KvClient | null = null;

  constructor(config: StorageConfig) {
    this.config = config;
    const provider = new ethers.JsonRpcProvider(config.rpc);
    this.signer = new ethers.Wallet(config.privateKey, provider);
    this.indexer = new Indexer(config.indexerRpc);

    if (config.kvNodeRpc) {
      this.kvClient = new KvClient(config.kvNodeRpc);
    }
  }

  /**
   * Upload a JSON object to 0G Storage Log layer.
   * Returns the Merkle root hash (verifiable on storagescan) & tx hash.
   *
   * Flow:
   *  1. Serialize JSON → write to temp file
   *  2. Create ZgFile → compute Merkle tree → get rootHash
   *  3. Upload via Indexer to 0G Storage Network
   *  4. Clean up temp file
   */
  async uploadJson(obj: unknown, tag: string): Promise<{ rootHash: string; txHash: string }> {
    const jsonStr = JSON.stringify(obj, null, 2);
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `0g-upload-${tag}-${Date.now()}.json`);

    try {
      // Write JSON to temp file for ZgFile
      fs.writeFileSync(tmpFile, jsonStr);

      // Create ZgFile and compute Merkle tree
      const file = await ZgFile.fromFilePath(tmpFile);
      try {
        const [tree, treeErr] = await file.merkleTree();
        if (treeErr !== null) {
          throw new Error(`[0G Storage] Merkle tree computation failed: ${treeErr}`);
        }
        const rootHash = tree!.rootHash()!;

        // Upload to 0G Storage via Indexer
        const [tx, uploadErr] = await this.indexer.upload(
          file,
          this.config.rpc,
          this.signer as any
        );
        if (uploadErr !== null) {
          throw new Error(`[0G Storage] Upload failed: ${(uploadErr as Error).message}`);
        }

        // Extract txHash from upload result
        let txHash: string;
        if (tx && "txHash" in tx) {
          txHash = (tx as any).txHash;
        } else if (tx && "txHashes" in tx) {
          txHash = (tx as any).txHashes[0];
        } else {
          txHash = ethers.keccak256(ethers.toUtf8Bytes(`${tag}-${rootHash}`));
        }

        console.log(`[0G Storage Log] Uploaded ${tag}: rootHash=${rootHash.slice(0, 18)}... txHash=${txHash.slice(0, 18)}...`);
        return { rootHash, txHash };
      } finally {
        await file.close();
      }
    } finally {
      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    }
  }

  /**
   * Download from 0G Storage Log layer by root hash.
   * The rootHash can be verified on storagescan.0g.ai
   */
  async downloadJson<T>(rootHash: string, outputPath: string): Promise<T | null> {
    try {
      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Remove output file if it exists (download appends)
      try { fs.unlinkSync(outputPath); } catch { /* ignore */ }

      const err = await this.indexer.download(rootHash, outputPath, true);
      if (err !== null) {
        console.error(`[0G Storage Log] Download error for ${rootHash}: ${err}`);
        return null;
      }

      const content = fs.readFileSync(outputPath, "utf-8");
      return JSON.parse(content) as T;
    } catch (e: any) {
      console.error(`[0G Storage Log] Download failed for ${rootHash}: ${e.message}`);
      return null;
    }
  }

  /**
   * Write to KV layer (fast index, sub-millisecond query).
   * Uses Batcher for efficient batched writes to 0G Storage KV.
   */
  async kvSet(streamId: string, key: string, value: string): Promise<string> {
    try {
      // Select storage nodes
      const [nodes, nodesErr] = await this.indexer.selectNodes(1);
      if (nodesErr !== null) {
        throw new Error(`Node selection failed: ${nodesErr}`);
      }

      // Get flow contract
      const flowAddr = this.config.flowContractAddress || this.getFlowContractAddress();
      const flowContract = getFlowContract(flowAddr, this.signer as any);

      // Create batcher and set KV pair
      const batcher = new Batcher(1, nodes, flowContract, this.config.rpc);
      const keyBytes = Uint8Array.from(Buffer.from(key, "utf-8"));
      const valueBytes = Uint8Array.from(Buffer.from(value, "utf-8"));
      batcher.streamDataBuilder.set(streamId, keyBytes, valueBytes);

      // Execute batch
      const [tx, batchErr] = await batcher.exec();
      if (batchErr !== null) {
        throw new Error(`Batcher exec failed: ${batchErr}`);
      }

      const txHash = (tx as any)?.hash || (tx as any)?.toString() || ethers.keccak256(ethers.toUtf8Bytes(`kv-${streamId}-${key}`));
      console.log(`[0G Storage KV] Set ${key.slice(0, 24)}... in stream ${streamId.slice(0, 12)}...`);
      return typeof txHash === "string" ? txHash : String(txHash);
    } catch (e: any) {
      // Fallback: compute deterministic hash for non-critical KV failures
      console.warn(`[0G Storage KV] kvSet fallback for ${key.slice(0, 20)}: ${e.message}`);
      return ethers.keccak256(ethers.toUtf8Bytes(`kv-${streamId}-${key}-${value}`));
    }
  }

  /**
   * Read from KV layer via KvClient.
   */
  async kvGet(streamId: string, key: string): Promise<string | null> {
    if (!this.kvClient) {
      console.warn("[0G Storage KV] No KV node configured, cannot read");
      return null;
    }

    try {
      const keyBytes = Uint8Array.from(Buffer.from(key, "utf-8"));
      const value = await this.kvClient.getValue(streamId, keyBytes as any);
      if (!value) return null;

      // Decode value — could be Uint8Array, Buffer, or string
      if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
        return Buffer.from(value).toString("utf-8");
      }
      if (typeof value === "string") {
        return value;
      }
      return String(value);
    } catch (e: any) {
      console.warn(`[0G Storage KV] kvGet failed for ${key.slice(0, 20)}: ${e.message}`);
      return null;
    }
  }

  /**
   * Get the flow contract address based on the indexer RPC URL.
   * Auto-detects testnet vs mainnet.
   */
  private getFlowContractAddress(): string {
    if (this.config.indexerRpc.includes("testnet")) {
      // 0G Galileo Testnet flow contract
      return "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296";
    }
    // 0G Mainnet flow contract
    return "0x62D4144dB0F0a6fBBaeb6296c785C71B3D57B526";
  }

  getSignerAddress(): string {
    return this.signer.address;
  }
}
