import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deployments = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../deployments/0g-mainnet.json"), "utf-8")
  );
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "OG\n");

  const agentRegistry = await ethers.getContractAt("AgentRegistry", deployments.contracts.AgentRegistry);
  const taskRegistry = await ethers.getContractAt("TaskRegistry", deployments.contracts.TaskRegistry);
  const disputeResolution = await ethers.getContractAt("DisputeResolution", deployments.contracts.DisputeResolution);

  // === Register 5 more agents with different capabilities ===
  console.log("=== Registering 5 new agents ===");
  const agents = [
    { name: "agent-charlie-risk-assessor", meta: "risk-assessment-model-v2" },
    { name: "agent-diana-compliance-checker", meta: "compliance-kyc-aml-v1" },
    { name: "agent-eve-trade-executor", meta: "defi-trade-execution-v3" },
    { name: "agent-frank-auditor", meta: "financial-audit-llm-v1" },
    { name: "agent-grace-legal-reviewer", meta: "legal-doc-review-v2" },
  ];
  const agentIds: string[] = [];
  for (const a of agents) {
    const agentId = ethers.id(a.name);
    const metaHash = ethers.id(a.meta);
    const tx = await agentRegistry.registerAgent(agentId, metaHash);
    await tx.wait();
    agentIds.push(agentId);
    console.log(`  ${a.name} -> tx: ${tx.hash}`);
  }

  // === Anchor 10 diverse tasks ===
  console.log("\n=== Anchoring 10 tasks ===");
  const taskDefs = [
    { id: "task-kyc-verification-client-0x8a", desc: "KYC identity verification" },
    { id: "task-aml-screening-batch-2025Q2", desc: "AML transaction screening" },
    { id: "task-invoice-fraud-detection-inv9921", desc: "Invoice fraud pattern detection" },
    { id: "task-smart-contract-audit-defi-pool", desc: "DeFi pool contract audit" },
    { id: "task-credit-scoring-applicant-7812", desc: "Credit risk scoring" },
    { id: "task-trade-settlement-eth-usdc-swap", desc: "Trade settlement verification" },
    { id: "task-regulatory-filing-sec-10k", desc: "SEC 10-K filing review" },
    { id: "task-insurance-claim-auto-2025-04", desc: "Insurance claim assessment" },
    { id: "task-dao-proposal-treasury-alloc", desc: "DAO treasury allocation vote" },
    { id: "task-nda-clause-extraction-vendor", desc: "NDA clause extraction and review" },
  ];
  const taskIds: string[] = [];
  for (let i = 0; i < taskDefs.length; i++) {
    const t = taskDefs[i];
    const taskId = ethers.id(t.id);
    const assignedAgent = agentIds[i % agentIds.length];
    const logRoot = ethers.id(`log-root-${t.id}-${Date.now()}`);
    const kvIdx = ethers.id(`kv-idx-${t.id}`);
    const msgHash = ethers.solidityPackedKeccak256(
      ["bytes32", "bytes32", "bytes32", "bytes32"],
      [taskId, assignedAgent, logRoot, kvIdx]
    );
    const sig = await signer.signMessage(ethers.getBytes(msgHash));
    const tx = await taskRegistry.anchorTask(taskId, assignedAgent, logRoot, kvIdx, sig);
    await tx.wait();
    taskIds.push(t.id);
    console.log(`  ${t.desc} -> tx: ${tx.hash}`);
  }

  // === Submit and resolve 3 more disputes ===
  console.log("\n=== Submitting 3 disputes ===");
  const disputeCases = [
    { taskIdx: 2, escrow: "0.03", evidence: "Invoice INV-9921 flagged as duplicate but agent approved it", verdict: 1, desc: "FavorClient" },
    { taskIdx: 5, escrow: "0.04", evidence: "Trade settlement amount mismatch: expected 1.5 ETH, got 1.499 ETH", verdict: 2, desc: "FavorExecutor" },
    { taskIdx: 8, escrow: "0.06", evidence: "DAO proposal passed with outdated treasury data, partial fault", verdict: 3, desc: "Split 60/40" },
  ];
  const executorAddr = "0x0000000000000000000000000000000000000001";

  for (const dc of disputeCases) {
    const taskId = ethers.id(taskDefs[dc.taskIdx].id);
    const evidenceHash = ethers.id(dc.evidence);

    // Submit
    const stx = await disputeResolution.submitDispute(taskId, executorAddr, evidenceHash, {
      value: ethers.parseEther(dc.escrow),
    });
    await stx.wait();
    console.log(`  Dispute submitted (${dc.desc}): ${stx.hash}`);

    // Get disputeId from event
    const filter = disputeResolution.filters.DisputeSubmitted();
    const events = await disputeResolution.queryFilter(filter);
    const disputeId = events[events.length - 1].args[0];

    // Resolve
    const splitBps = dc.verdict === 3 ? 6000 : 0; // 60% to client for Split
    const payload = ethers.solidityPackedKeccak256(
      ["bytes32", "uint8", "uint256"],
      [disputeId, dc.verdict, splitBps]
    );
    const verdictSig = await signer.signMessage(ethers.getBytes(payload));
    const rtx = await disputeResolution.resolveDispute(disputeId, dc.verdict, splitBps, verdictSig);
    await rtx.wait();
    console.log(`  Dispute resolved (${dc.desc}): ${rtx.hash}`);
  }

  // === Update agent metadata (simulate activity) ===
  console.log("\n=== Updating agent metadata ===");
  for (let i = 0; i < 3; i++) {
    const newMeta = ethers.id(`updated-metadata-v${i + 2}-${Date.now()}`);
    const tx = await agentRegistry.updateMetadata(agentIds[i], newMeta);
    await tx.wait();
    console.log(`  Agent ${agents[i].name} metadata updated: ${tx.hash}`);
  }

  // === Final stats ===
  const bal = await ethers.provider.getBalance(signer.address);
  console.log("\n=== Summary ===");
  console.log(`New agents registered:      5`);
  console.log(`New tasks anchored:        10`);
  console.log(`New disputes (submit+resolve): 3`);
  console.log(`Metadata updates:           3`);
  console.log(`Total new transactions:    24`);
  console.log(`Remaining balance:         ${ethers.formatEther(bal)} OG`);
}

main().catch((e) => { console.error(e); process.exit(1); });
