import { ethers } from "ethers";

/**
 * ProofBuilder - Constructs and verifies tamper-evident proof bundles.
 * Used for TEE signature recovery and evidence submission.
 */
export class ProofBuilder {
  /**
   * Reconstruct the message that TEE signs and recover signer address.
   */
  static recoverTeeSigner(
    taskId: string,
    agentId: string,
    logRootHash: string,
    kvIndexHash: string,
    signature: string
  ): string {
    const payload = ethers.solidityPackedKeccak256(
      ["bytes32", "bytes32", "bytes32", "bytes32"],
      [taskId, agentId, logRootHash, kvIndexHash]
    );
    return ethers.verifyMessage(ethers.getBytes(payload), signature);
  }

  /**
   * Build a tamper-evident proof bundle for evidence submission.
   */
  static buildProofBundle(args: {
    taskId: string;
    inputPrompt: string;
    output: string;
    teeSignature: string;
    storageRootHash: string;
    chainTxHash: string;
  }): string {
    return ethers.id(JSON.stringify(args));
  }

  /**
   * Verify that a TEE attestation is valid for given task parameters.
   */
  static verifyAttestation(
    expectedSigner: string,
    taskId: string,
    agentId: string,
    logRootHash: string,
    kvIndexHash: string,
    signature: string
  ): boolean {
    try {
      const recovered = ProofBuilder.recoverTeeSigner(
        taskId, agentId, logRootHash, kvIndexHash, signature
      );
      return recovered.toLowerCase() === expectedSigner.toLowerCase();
    } catch {
      return false;
    }
  }
}
