import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

export interface TeeInferenceResult {
  output: string;
  providerAddress: string;
  signature: string;
  inputHash: string;
  outputHash: string;
  model: string;
  chatId: string;
  isValid: boolean;
}

export interface TeeProvider {
  provider: string;
  model: string;
  url: string;
  verifiability: string;
  inputPrice: string;
  outputPrice: string;
}

/**
 * TEE Inference Client - Calls 0G Compute Marketplace for sealed inference.
 * Every inference is executed inside a Trusted Execution Environment (TEE),
 * producing a cryptographic attestation that the output was not tampered with.
 */
export class TeeInferenceClient {
  private signer: ethers.Wallet;
  private rpcUrl: string;
  private broker: Awaited<ReturnType<typeof createZGComputeNetworkBroker>> | null = null;
  private ledgerReady = false;

  constructor(privateKey: string, rpcUrl: string) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, provider);
    this.rpcUrl = rpcUrl;
  }

  /**
   * Initialize the 0G Compute Network broker.
   * This connects to the on-chain Inference Serving contract and Ledger.
   */
  async init(): Promise<void> {
    this.broker = await createZGComputeNetworkBroker(this.signer as any);
    console.log("[0G Compute] TEE broker initialized for", this.signer.address);

    // Ensure ledger exists; create one if it doesn't
    try {
      await this.broker.ledger.getLedger();
      this.ledgerReady = true;
      console.log("[0G Compute] Existing ledger found");
    } catch {
      console.log("[0G Compute] No ledger found, will create on first inference");
    }
  }

  /**
   * Ensure the wallet has enough OG tokens for inference fees.
   */
  async ensureFunded(minOG: number = 0.5): Promise<void> {
    const balance = await this.signer.provider!.getBalance(this.signer.address);
    const balanceOG = Number(ethers.formatEther(balance));
    if (balanceOG < minOG) {
      console.warn(`[0G Compute] Low balance: ${balanceOG} OG (need ${minOG})`);
    }
  }

  /**
   * Ensure a ledger exists with sufficient balance for inference.
   */
  private async ensureLedger(depositOG: number = 0.05): Promise<void> {
    if (this.ledgerReady) return;
    try {
      await this.broker!.ledger.getLedger();
      this.ledgerReady = true;
    } catch {
      console.log(`[0G Compute] Creating ledger with ${depositOG} A0GI deposit...`);
      await this.broker!.ledger.addLedger(depositOG);
      this.ledgerReady = true;
      console.log("[0G Compute] Ledger created");
    }
  }

  /**
   * List available TEE inference providers from the 0G Compute Marketplace.
   */
  async listProviders(): Promise<TeeProvider[]> {
    if (!this.broker) throw new Error("Broker not initialized. Call init() first.");
    const services = await this.broker.inference.listService();
    return services.map((s: any) => ({
      provider: s.provider,
      model: s.model,
      url: s.url,
      verifiability: s.verifiability || "TeeML",
      inputPrice: s.inputPrice?.toString() || "0",
      outputPrice: s.outputPrice?.toString() || "0",
    }));
  }

  /**
   * Perform a TEE-attested inference via the 0G Compute Marketplace.
   * The response includes a cryptographic attestation proving execution integrity.
   *
   * Flow:
   *  1. Ensure ledger has funds
   *  2. Get provider endpoint & model metadata
   *  3. Generate single-use billing headers
   *  4. Call the OpenAI-compatible inference endpoint
   *  5. Process response (settles fee + verifies TEE signature)
   */
  async infer(providerAddress: string, prompt: string): Promise<TeeInferenceResult> {
    if (!this.broker) throw new Error("Broker not initialized. Call init() first.");

    // 1. Ensure ledger is ready
    await this.ensureLedger();

    // 2. Get endpoint and model from the provider
    const { endpoint, model } = await this.broker.inference.getServiceMetadata(providerAddress);
    console.log(`[0G Compute] Using provider ${providerAddress.slice(0, 10)}... model=${model}`);

    // 3. Generate single-use billing headers
    const headers = await this.broker.inference.getRequestHeaders(providerAddress, prompt);

    // 4. Make the inference request to the OpenAI-compatible endpoint
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: model,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`TEE inference failed (${response.status}): ${errorBody}`);
    }

    const completion = await response.json();
    const output = completion.choices?.[0]?.message?.content || "";
    const chatId = completion.id || `chat-${Date.now()}`;

    // 5. Process response — settles fee and verifies TEE attestation
    let isValid: boolean;
    try {
      const result = await this.broker.inference.processResponse(providerAddress, output, chatId);
      isValid = result === true;
    } catch (e: any) {
      console.warn(`[0G Compute] processResponse warning: ${e.message}`);
      // If verification fails but we got output, still try to settle fee
      try {
        await this.broker.inference.settleFee(providerAddress, 0.001);
      } catch { /* best effort */ }
      isValid = false;
    }

    // Compute hashes for logging
    const inputHash = ethers.keccak256(ethers.toUtf8Bytes(prompt));
    const outputHash = ethers.keccak256(ethers.toUtf8Bytes(output));

    // Build attestation signature from input/output hashes
    const messageHash = ethers.solidityPackedKeccak256(
      ["bytes32", "bytes32"],
      [inputHash, outputHash]
    );
    const signature = await this.signer.signMessage(ethers.getBytes(messageHash));

    console.log(`[0G Compute] Inference complete: valid=${isValid}, chatId=${chatId}`);

    return {
      output,
      providerAddress,
      signature,
      inputHash,
      outputHash,
      model,
      chatId,
      isValid,
    };
  }

  /**
   * Verify a specific provider's TEE Remote Attestation (RA).
   */
  async verifyProvider(providerAddress: string): Promise<boolean | null> {
    if (!this.broker) throw new Error("Broker not initialized. Call init() first.");
    return this.broker.inference.verifyService(providerAddress);
  }

  /**
   * Get download link for the TEE attestation of a specific chat response.
   */
  async getChatAttestation(providerAddress: string, chatId: string): Promise<string> {
    if (!this.broker) throw new Error("Broker not initialized. Call init() first.");
    return this.broker.inference.getChatSignatureDownloadLink(providerAddress, chatId);
  }

  getSignerAddress(): string {
    return this.signer.address;
  }
}
