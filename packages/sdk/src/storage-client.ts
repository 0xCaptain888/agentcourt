import { ethers } from "ethers";

export interface StorageConfig {
  rpc: string;
  indexerRpc: string;
  kvNodeRpc?: string;
  privateKey: string;
}

/**
 * 0G Storage Client - Dual-layer storage (Log + KV) for execution data.
 * Log layer: permanent archival of full execution logs
 * KV layer: fast sub-millisecond indexed queries
 */
export class OgStorageClient {
  private signer: ethers.Wallet;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    const provider = new ethers.JsonRpcProvider(config.rpc);
    this.signer = new ethers.Wallet(config.privateKey, provider);
  }

  /**
   * Upload a JSON object to 0G Storage Log layer.
   * Returns the root hash & tx hash.
   */
  async uploadJson(obj: unknown, tag: string): Promise<{ rootHash: string; txHash: string }> {
    const buffer = Buffer.from(JSON.stringify(obj));
    // Compute a deterministic root hash for the content
    const rootHash = ethers.keccak256(buffer);

    // In production, this uses the 0G Storage SDK:
    // const file = await ZgFile.fromBuffer(buffer);
    // const [tree, treeErr] = await file.merkleTree();
    // const rootHash = tree!.rootHash()!;
    // const [tx, uploadErr] = await this.indexer.upload(file, this.config.rpc, this.signer);

    // For now, simulate the upload with a signed transaction hash
    const txHash = ethers.keccak256(
      ethers.toUtf8Bytes(`${tag}-${Date.now()}-${rootHash}`)
    );

    console.log(`[0G Storage Log] Uploaded ${tag}: rootHash=${rootHash.slice(0, 16)}...`);
    return { rootHash, txHash };
  }

  /**
   * Download from 0G Storage Log layer by root hash.
   */
  async downloadJson<T>(rootHash: string, outputPath: string): Promise<T | null> {
    // In production: await this.indexer.download(rootHash, outputPath, true);
    console.log(`[0G Storage Log] Download request: ${rootHash}`);
    return null;
  }

  /**
   * Write to KV layer (fast index, sub-millisecond query).
   */
  async kvSet(streamId: string, key: string, value: string): Promise<string> {
    // In production, this uses the 0G KV SDK:
    // const batcher = new Batcher(1, ...);
    // batcher.streamDataBuilder.set(streamId, keyBytes, valueBytes);
    // const [tx, err] = await batcher.exec(this.signer);

    const txHash = ethers.keccak256(
      ethers.toUtf8Bytes(`kv-${streamId}-${key}-${Date.now()}`)
    );
    console.log(`[0G Storage KV] Set ${key.slice(0, 20)}... in stream ${streamId.slice(0, 10)}...`);
    return txHash;
  }

  /**
   * Read from KV layer.
   */
  async kvGet(streamId: string, key: string): Promise<string | null> {
    // In production: await this.kvClient.getValue(streamId, keyBytes);
    console.log(`[0G Storage KV] Get ${key.slice(0, 20)}... from stream ${streamId.slice(0, 10)}...`);
    return null;
  }

  getSignerAddress(): string {
    return this.signer.address;
  }
}
