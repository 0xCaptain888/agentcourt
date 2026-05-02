import { ethers } from "ethers";
import "dotenv/config";

/**
 * AgentCourt End-to-End Integration Test
 * Tests the full pipeline: Agent registration → TEE inference → Storage → Chain anchor → Dispute
 */
async function main() {
  console.log("--- AgentCourt E2E Integration Test ---\n");

  // Verify environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log("Skipping E2E test: PRIVATE_KEY not set");
    console.log("To run: set PRIVATE_KEY in .env and deploy contracts first");
    process.exit(0);
  }

  const { AgentCourt } = await import("../src/index");

  const ac = new AgentCourt({
    privateKey,
    network: "testnet",
    contracts: {
      taskRegistry: process.env.AGENTCOURT_TASK_REGISTRY || "0x0000000000000000000000000000000000000001",
      disputeResolution: process.env.AGENTCOURT_DISPUTE_RESOLVER || "0x0000000000000000000000000000000000000002",
      agentRegistry: process.env.AGENTCOURT_AGENT_REGISTRY || "0x0000000000000000000000000000000000000003",
    },
  });
  await ac.init();

  // Step 1: Register agents
  console.log("Step 1: Registering agents...");
  const agentA = await ac.registerAgent({
    name: "Alice-Bot",
    description: "Payment approval agent",
    capabilities: ["payment-approval"],
  });
  console.log("  Agent A registered:", agentA.agentId.slice(0, 16) + "...");

  const agentB = await ac.registerAgent({
    name: "Bob-Bot",
    description: "Contract execution agent",
    capabilities: ["contract-execution"],
  });
  console.log("  Agent B registered:", agentB.agentId.slice(0, 16) + "...");

  // Step 2: TEE inference + anchor
  console.log("\nStep 2: Running TEE inference + on-chain anchor...");
  const taskReceipt = await ac.verifiedInference({
    agentId: agentB.agentId,
    prompt: "Is invoice INV-2025-0001 legitimate? Amount: $45,000 from Vendor XYZ",
  });
  console.log("  Task anchored:", taskReceipt.taskId);
  console.log("  Log root hash:", taskReceipt.logRootHash.slice(0, 16) + "...");
  console.log("  Chain tx:", taskReceipt.chainTxHash);

  // Step 3: Verify on-chain
  console.log("\nStep 3: Verifying on-chain proof...");
  const verification = await ac.verify(taskReceipt.taskId);
  console.log("  Found:", verification.found);
  console.log("  TEE valid:", verification.teeSignatureValid);
  console.log("  Status:", verification.status);

  // Step 4: Submit dispute
  console.log("\nStep 4: Submitting dispute...");
  const dispute = await ac.submitDispute({
    taskId: taskReceipt.taskId,
    executor: agentB.address,
    evidence: "Invoice INV-2025-0001 was already paid 2 days ago. Duplicate.",
    escrowOG: 0.05,
  });
  console.log("  Dispute submitted:", dispute.disputeId.slice(0, 16) + "...");
  console.log("  Tx:", dispute.txHash);

  // Step 5: Check status
  console.log("\nStep 5: Checking dispute status...");
  const status = await ac.getDisputeStatus(taskReceipt.taskId);
  console.log("  Status:", status.status);
  console.log("  Verdict:", status.verdict);

  console.log("\n--- E2E Test Complete ---");
}

main().catch((e) => {
  console.error("E2E test failed:", e.message);
  process.exit(1);
});
