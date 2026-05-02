import { OgStorageClient, StorageConfig } from "../src/storage-client";
import assert from "node:assert";

/**
 * Unit tests for OgStorageClient.
 * Run with: npx tsx test/storage.test.ts
 */

const TEST_CONFIG: StorageConfig = {
  rpc: "http://localhost:8545",
  indexerRpc: "http://localhost:5678",
  kvNodeRpc: "http://localhost:6789",
  privateKey: "0x" + "ab".repeat(32), // deterministic test key
};

async function testUploadJsonReturnsHashes() {
  const client = new OgStorageClient(TEST_CONFIG);
  const payload = { taskId: "test-task-001", output: "hello world" };

  const result = await client.uploadJson(payload, "test-upload");

  assert(result.rootHash, "rootHash should be defined");
  assert(result.txHash, "txHash should be defined");
  assert(result.rootHash.startsWith("0x"), "rootHash should be hex");
  assert(result.txHash.startsWith("0x"), "txHash should be hex");
  assert(result.rootHash.length === 66, "rootHash should be 32 bytes hex");
  assert(result.txHash.length === 66, "txHash should be 32 bytes hex");

  console.log("  PASS: uploadJson returns valid hashes");
}

async function testUploadJsonDeterministicRootHash() {
  const client = new OgStorageClient(TEST_CONFIG);
  const payload = { key: "value", number: 42 };

  const result1 = await client.uploadJson(payload, "det-test");
  const result2 = await client.uploadJson(payload, "det-test");

  assert.strictEqual(result1.rootHash, result2.rootHash, "Same content should produce same rootHash");
  console.log("  PASS: uploadJson produces deterministic rootHash for same content");
}

async function testDownloadJsonReturnsNull() {
  const client = new OgStorageClient(TEST_CONFIG);
  const fakeHash = "0x" + "ff".repeat(32);

  const result = await client.downloadJson(fakeHash, "/tmp/test-download.json");

  assert.strictEqual(result, null, "downloadJson should return null in mock mode");
  console.log("  PASS: downloadJson returns null (mock mode)");
}

async function testKvSetReturnsHash() {
  const client = new OgStorageClient(TEST_CONFIG);
  const streamId = "0x" + "01".repeat(32);

  const txHash = await client.kvSet(streamId, "task:001", '{"status":"completed"}');

  assert(txHash, "kvSet should return a txHash");
  assert(txHash.startsWith("0x"), "txHash should be hex");
  assert(txHash.length === 66, "txHash should be 32 bytes hex");
  console.log("  PASS: kvSet returns valid transaction hash");
}

async function testKvGetReturnsNull() {
  const client = new OgStorageClient(TEST_CONFIG);
  const streamId = "0x" + "01".repeat(32);

  const result = await client.kvGet(streamId, "nonexistent-key");

  assert.strictEqual(result, null, "kvGet should return null in mock mode");
  console.log("  PASS: kvGet returns null (mock mode)");
}

async function testGetSignerAddress() {
  const client = new OgStorageClient(TEST_CONFIG);
  const address = client.getSignerAddress();

  assert(address, "getSignerAddress should return an address");
  assert(address.startsWith("0x"), "address should start with 0x");
  assert(address.length === 42, "address should be 20 bytes hex");
  console.log("  PASS: getSignerAddress returns valid Ethereum address");
}

// Run all tests
async function main() {
  console.log("\nOgStorageClient Tests");
  console.log("=====================");

  await testUploadJsonReturnsHashes();
  await testUploadJsonDeterministicRootHash();
  await testDownloadJsonReturnsNull();
  await testKvSetReturnsHash();
  await testKvGetReturnsNull();
  await testGetSignerAddress();

  console.log("\nAll storage tests passed.\n");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
