import { ProofBuilder } from "../src/proof";
import { ethers } from "ethers";
import assert from "node:assert";

/**
 * Unit tests for ProofBuilder.
 * Run with: npx tsx test/proof.test.ts
 */

// Deterministic test wallet
const TEST_PRIVATE_KEY = "0x" + "cd".repeat(32);
const testWallet = new ethers.Wallet(TEST_PRIVATE_KEY);

async function testRecoverTeeSigner() {
  const taskId = ethers.id("task-001");
  const agentId = ethers.id("agent-001");
  const logRootHash = ethers.id("log-root-hash");
  const kvIndexHash = ethers.id("kv-index-hash");

  // Sign the payload as the TEE would
  const payload = ethers.solidityPackedKeccak256(
    ["bytes32", "bytes32", "bytes32", "bytes32"],
    [taskId, agentId, logRootHash, kvIndexHash]
  );
  const signature = await testWallet.signMessage(ethers.getBytes(payload));

  // Recover and verify
  const recovered = ProofBuilder.recoverTeeSigner(
    taskId,
    agentId,
    logRootHash,
    kvIndexHash,
    signature
  );

  assert.strictEqual(
    recovered.toLowerCase(),
    testWallet.address.toLowerCase(),
    "Recovered address should match the signer"
  );
  console.log("  PASS: recoverTeeSigner correctly recovers the signing address");
}

async function testRecoverTeeSignerWrongData() {
  const taskId = ethers.id("task-001");
  const agentId = ethers.id("agent-001");
  const logRootHash = ethers.id("log-root-hash");
  const kvIndexHash = ethers.id("kv-index-hash");

  // Sign with correct data
  const payload = ethers.solidityPackedKeccak256(
    ["bytes32", "bytes32", "bytes32", "bytes32"],
    [taskId, agentId, logRootHash, kvIndexHash]
  );
  const signature = await testWallet.signMessage(ethers.getBytes(payload));

  // Attempt recovery with wrong taskId
  const wrongTaskId = ethers.id("task-999");
  const recovered = ProofBuilder.recoverTeeSigner(
    wrongTaskId,
    agentId,
    logRootHash,
    kvIndexHash,
    signature
  );

  assert.notStrictEqual(
    recovered.toLowerCase(),
    testWallet.address.toLowerCase(),
    "Wrong data should recover a different address"
  );
  console.log("  PASS: recoverTeeSigner returns different address for tampered data");
}

async function testVerifyAttestationValid() {
  const taskId = ethers.id("task-002");
  const agentId = ethers.id("agent-002");
  const logRootHash = ethers.id("log-hash-002");
  const kvIndexHash = ethers.id("kv-hash-002");

  const payload = ethers.solidityPackedKeccak256(
    ["bytes32", "bytes32", "bytes32", "bytes32"],
    [taskId, agentId, logRootHash, kvIndexHash]
  );
  const signature = await testWallet.signMessage(ethers.getBytes(payload));

  const isValid = ProofBuilder.verifyAttestation(
    testWallet.address,
    taskId,
    agentId,
    logRootHash,
    kvIndexHash,
    signature
  );

  assert.strictEqual(isValid, true, "Valid attestation should return true");
  console.log("  PASS: verifyAttestation returns true for valid signature");
}

async function testVerifyAttestationInvalid() {
  const taskId = ethers.id("task-003");
  const agentId = ethers.id("agent-003");
  const logRootHash = ethers.id("log-hash-003");
  const kvIndexHash = ethers.id("kv-hash-003");

  const payload = ethers.solidityPackedKeccak256(
    ["bytes32", "bytes32", "bytes32", "bytes32"],
    [taskId, agentId, logRootHash, kvIndexHash]
  );
  const signature = await testWallet.signMessage(ethers.getBytes(payload));

  // Verify against a wrong expected signer
  const wrongAddress = "0x0000000000000000000000000000000000000001";
  const isValid = ProofBuilder.verifyAttestation(
    wrongAddress,
    taskId,
    agentId,
    logRootHash,
    kvIndexHash,
    signature
  );

  assert.strictEqual(isValid, false, "Invalid signer should return false");
  console.log("  PASS: verifyAttestation returns false for wrong expected signer");
}

async function testVerifyAttestationMalformedSignature() {
  const taskId = ethers.id("task-004");
  const agentId = ethers.id("agent-004");
  const logRootHash = ethers.id("log-hash-004");
  const kvIndexHash = ethers.id("kv-hash-004");

  const isValid = ProofBuilder.verifyAttestation(
    testWallet.address,
    taskId,
    agentId,
    logRootHash,
    kvIndexHash,
    "0xinvalidsignature"
  );

  assert.strictEqual(isValid, false, "Malformed signature should return false");
  console.log("  PASS: verifyAttestation returns false for malformed signature");
}

async function testBuildProofBundle() {
  const bundle = ProofBuilder.buildProofBundle({
    taskId: "task-005",
    inputPrompt: "Summarize this document",
    output: "The document discusses...",
    teeSignature: "0xabc123",
    storageRootHash: "0xdef456",
    chainTxHash: "0x789012",
  });

  assert(bundle, "buildProofBundle should return a non-empty string");
  assert(bundle.startsWith("0x"), "bundle should be a hex hash");
  assert(bundle.length === 66, "bundle should be a keccak256 hash");

  // Same inputs should produce same bundle
  const bundle2 = ProofBuilder.buildProofBundle({
    taskId: "task-005",
    inputPrompt: "Summarize this document",
    output: "The document discusses...",
    teeSignature: "0xabc123",
    storageRootHash: "0xdef456",
    chainTxHash: "0x789012",
  });

  assert.strictEqual(bundle, bundle2, "Same inputs should produce deterministic bundle hash");
  console.log("  PASS: buildProofBundle produces deterministic hash");
}

// Run all tests
async function main() {
  console.log("\nProofBuilder Tests");
  console.log("==================");

  await testRecoverTeeSigner();
  await testRecoverTeeSignerWrongData();
  await testVerifyAttestationValid();
  await testVerifyAttestationInvalid();
  await testVerifyAttestationMalformedSignature();
  await testBuildProofBundle();

  console.log("\nAll proof tests passed.\n");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
