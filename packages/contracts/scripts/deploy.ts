import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Network:", network.name);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "OG");

  const TEE_SIGNER = process.env.TEE_SIGNER_ADDRESS || deployer.address;
  const ARBITER_SIGNER = process.env.ARBITER_TEE_SIGNER || deployer.address;

  // 1. AgentRegistry
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  console.log("AgentRegistry:", await agentRegistry.getAddress());

  // 2. TaskRegistry
  const TaskRegistry = await ethers.getContractFactory("TaskRegistry");
  const taskRegistry = await TaskRegistry.deploy(TEE_SIGNER);
  await taskRegistry.waitForDeployment();
  console.log("TaskRegistry:", await taskRegistry.getAddress());

  // 3. DisputeResolution
  const DisputeResolution = await ethers.getContractFactory("DisputeResolution");
  const disputeResolution = await DisputeResolution.deploy(
    await taskRegistry.getAddress(),
    ARBITER_SIGNER
  );
  await disputeResolution.waitForDeployment();
  console.log("DisputeResolution:", await disputeResolution.getAddress());

  // 4. Link contracts
  await taskRegistry.setDisputeResolver(await disputeResolution.getAddress());
  await agentRegistry.setReputationOracle(await disputeResolution.getAddress());

  // Save deployment info
  const deployments = {
    network: network.name,
    chainId: Number(network.config.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AgentRegistry: await agentRegistry.getAddress(),
      TaskRegistry: await taskRegistry.getAddress(),
      DisputeResolution: await disputeResolution.getAddress(),
    },
    teeSigner: TEE_SIGNER,
    arbiterSigner: ARBITER_SIGNER,
  };
  const outDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${network.name}.json`),
    JSON.stringify(deployments, null, 2)
  );
  console.log("\nSaved to deployments/" + network.name + ".json");
  const explorer = network.name === "0g-mainnet"
    ? "https://chainscan.0g.ai"
    : "https://chainscan-galileo.0g.ai";
  console.log(`\nExplorer links:`);
  console.log(`  AgentRegistry:     ${explorer}/address/${await agentRegistry.getAddress()}`);
  console.log(`  TaskRegistry:      ${explorer}/address/${await taskRegistry.getAddress()}`);
  console.log(`  DisputeResolution: ${explorer}/address/${await disputeResolution.getAddress()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
