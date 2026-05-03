import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deployments = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../deployments/0g-mainnet.json"), "utf-8")
  );
  const [signer] = await ethers.getSigners();
  console.log("Interacting as:", signer.address);

  const agentRegistry = await ethers.getContractAt("AgentRegistry", deployments.contracts.AgentRegistry);
  const taskRegistry = await ethers.getContractAt("TaskRegistry", deployments.contracts.TaskRegistry);
  const disputeResolution = await ethers.getContractAt("DisputeResolution", deployments.contracts.DisputeResolution);

  // 1. Register 2 agents
  console.log("\n--- Registering Agents ---");
  const agentIdA = ethers.id("agent-alice-payment-approver");
  const metaA = ethers.id("metadata-alice-v1");
  const tx1 = await agentRegistry.registerAgent(agentIdA, metaA);
  await tx1.wait();
  console.log("Agent Alice registered, tx:", tx1.hash);

  const agentIdB = ethers.id("agent-bob-contract-executor");
  const metaB = ethers.id("metadata-bob-v1");
  const tx2 = await agentRegistry.registerAgent(agentIdB, metaB);
  await tx2.wait();
  console.log("Agent Bob registered, tx:", tx2.hash);

  // 2. Anchor 3 tasks with TEE signatures
  console.log("\n--- Anchoring Tasks ---");
  const tasks = [
    { id: "task-invoice-approval-001", log: "log-root-invoice-001" },
    { id: "task-contract-review-002", log: "log-root-contract-002" },
    { id: "task-payment-verify-003", log: "log-root-payment-003" },
  ];

  for (const t of tasks) {
    const taskId = ethers.id(t.id);
    const logRoot = ethers.id(t.log);
    const kvIdx = ethers.id(`kv-${t.id}`);
    const msgHash = ethers.solidityPackedKeccak256(
      ["bytes32", "bytes32", "bytes32", "bytes32"],
      [taskId, agentIdB, logRoot, kvIdx]
    );
    const sig = await signer.signMessage(ethers.getBytes(msgHash));
    const tx = await taskRegistry.anchorTask(taskId, agentIdB, logRoot, kvIdx, sig);
    await tx.wait();
    console.log(`Task ${t.id} anchored, tx: ${tx.hash}`);
  }

  // 3. Submit a dispute
  console.log("\n--- Submitting Dispute ---");
  const disputeTaskId = ethers.id(tasks[0].id);
  // Use a different address as executor - we'll use a derived address
  // Since we only have one signer, we submit dispute against a dummy executor
  const executorAddr = "0x0000000000000000000000000000000000000001";
  const evidenceHash = ethers.id("evidence: invoice INV-2025-0892 was already paid");
  const dtx = await disputeResolution.submitDispute(disputeTaskId, executorAddr, evidenceHash, {
    value: ethers.parseEther("0.05"),
  });
  await dtx.wait();
  console.log("Dispute submitted, tx:", dtx.hash);

  // 4. Resolve the dispute
  console.log("\n--- Resolving Dispute ---");
  const filter = disputeResolution.filters.DisputeSubmitted();
  const events = await disputeResolution.queryFilter(filter);
  const disputeId = events[events.length - 1].args[0];
  console.log("Dispute ID:", disputeId);

  const verdictPayload = ethers.solidityPackedKeccak256(
    ["bytes32", "uint8", "uint256"],
    [disputeId, 1, 0] // FavorClient
  );
  const verdictSig = await signer.signMessage(ethers.getBytes(verdictPayload));
  const rtx = await disputeResolution.resolveDispute(disputeId, 1, 0, verdictSig);
  await rtx.wait();
  console.log("Dispute resolved (FavorClient), tx:", rtx.hash);

  // 5. Check final balance
  const bal = await ethers.provider.getBalance(signer.address);
  console.log("\n--- Summary ---");
  console.log("Remaining balance:", ethers.formatEther(bal), "OG");
  console.log("Agents registered: 2");
  console.log("Tasks anchored: 3");
  console.log("Disputes submitted & resolved: 1");
}

main().catch((e) => { console.error(e); process.exit(1); });
