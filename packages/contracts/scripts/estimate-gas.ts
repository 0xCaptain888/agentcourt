import { ethers } from "hardhat";

async function main() {
  const [deployer, agent, client, executor, arbiter] = await ethers.getSigners();

  // 1. Deploy contracts
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  const arGas = (await agentRegistry.deploymentTransaction()!.wait())!.gasUsed;

  const TaskRegistry = await ethers.getContractFactory("TaskRegistry");
  const taskRegistry = await TaskRegistry.deploy(arbiter.address);
  const trGas = (await taskRegistry.deploymentTransaction()!.wait())!.gasUsed;

  const DisputeResolution = await ethers.getContractFactory("DisputeResolution");
  const disputeResolution = await DisputeResolution.deploy(await taskRegistry.getAddress(), arbiter.address);
  const drGas = (await disputeResolution.deploymentTransaction()!.wait())!.gasUsed;

  // 2. Link contracts
  const tx1 = await taskRegistry.setDisputeResolver(await disputeResolution.getAddress());
  const linkGas1 = (await tx1.wait())!.gasUsed;
  const tx2 = await agentRegistry.setReputationOracle(await disputeResolution.getAddress());
  const linkGas2 = (await tx2.wait())!.gasUsed;

  // 3. Register 2 agents
  const reg1 = await agentRegistry.connect(agent).registerAgent(ethers.id("agent-A"), ethers.id("meta-A"));
  const regGas1 = (await reg1.wait())!.gasUsed;
  const reg2 = await agentRegistry.connect(client).registerAgent(ethers.id("agent-B"), ethers.id("meta-B"));
  const regGas2 = (await reg2.wait())!.gasUsed;

  // 4. Anchor 3 tasks
  let anchorTotal = 0n;
  for (let i = 0; i < 3; i++) {
    const taskId = ethers.id(`task-${i}`);
    const agentId = ethers.id("agent-A");
    const logRoot = ethers.id(`log-${i}`);
    const kvIdx = ethers.id(`kv-${i}`);
    const msg = ethers.solidityPackedKeccak256(
      ["bytes32","bytes32","bytes32","bytes32"], [taskId, agentId, logRoot, kvIdx]
    );
    const sig = await arbiter.signMessage(ethers.getBytes(msg));
    const tx = await taskRegistry.connect(agent).anchorTask(taskId, agentId, logRoot, kvIdx, sig);
    anchorTotal += (await tx.wait())!.gasUsed;
  }

  // 5. Submit 1 dispute (with escrow)
  const disputeTx = await disputeResolution.connect(client).submitDispute(
    ethers.id("task-0"), executor.address, ethers.id("evidence"),
    { value: ethers.parseEther("0.05") }
  );
  const disputeGas = (await disputeTx.wait())!.gasUsed;

  // 6. Resolve 1 dispute
  const logs = await disputeResolution.queryFilter(disputeResolution.filters.DisputeSubmitted());
  const disputeId = logs[0].args[0];
  const payload = ethers.solidityPackedKeccak256(
    ["bytes32","uint8","uint256"], [disputeId, 1, 0]
  );
  const arbSig = await arbiter.signMessage(ethers.getBytes(payload));
  const resolveTx = await disputeResolution.connect(deployer).resolveDispute(disputeId, 1, 0, arbSig);
  const resolveGas = (await resolveTx.wait())!.gasUsed;

  // Summary
  const totalGas = arGas + trGas + drGas + linkGas1 + linkGas2 + regGas1 + regGas2 + anchorTotal + disputeGas + resolveGas;

  console.log("\n=== Gas Estimation ===");
  console.log(`Deploy AgentRegistry:    ${arGas}`);
  console.log(`Deploy TaskRegistry:     ${trGas}`);
  console.log(`Deploy DisputeResolution:${drGas}`);
  console.log(`Link contracts (x2):     ${linkGas1 + linkGas2}`);
  console.log(`Register agents (x2):    ${regGas1 + regGas2}`);
  console.log(`Anchor tasks (x3):       ${anchorTotal}`);
  console.log(`Submit dispute (x1):     ${disputeGas}`);
  console.log(`Resolve dispute (x1):    ${resolveGas}`);
  console.log(`-----------------------------`);
  console.log(`Total gas:               ${totalGas}`);
  console.log(`\nAt 1 gwei gas price:     ${ethers.formatEther(totalGas * 1000000000n)} OG`);
  console.log(`At 5 gwei gas price:     ${ethers.formatEther(totalGas * 5000000000n)} OG`);
  console.log(`At 10 gwei gas price:    ${ethers.formatEther(totalGas * 10000000000n)} OG`);
  console.log(`\nEscrow for dispute:      0.05 OG (returned after resolution)`);
}

main().catch(e => { console.error(e); process.exit(1); });
