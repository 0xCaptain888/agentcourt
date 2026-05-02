import { expect } from "chai";
import { ethers } from "hardhat";

describe("TaskRegistry", () => {
  let taskRegistry: any;
  let owner: any, agent: any, teeSigner: any;

  beforeEach(async () => {
    [owner, agent, teeSigner] = await ethers.getSigners();
    const TR = await ethers.getContractFactory("TaskRegistry");
    taskRegistry = await TR.deploy(teeSigner.address);
  });

  it("should anchor a task with valid TEE signature", async () => {
    const taskId = ethers.id("task-001");
    const agentId = ethers.id("agent-alpha");
    const logRootHash = ethers.id("log-root");
    const kvIndexHash = ethers.id("kv-idx");

    const messageHash = ethers.solidityPackedKeccak256(
      ["bytes32", "bytes32", "bytes32", "bytes32"],
      [taskId, agentId, logRootHash, kvIndexHash]
    );
    const signature = await teeSigner.signMessage(ethers.getBytes(messageHash));

    await expect(
      taskRegistry.connect(agent).anchorTask(taskId, agentId, logRootHash, kvIndexHash, signature)
    ).to.emit(taskRegistry, "TaskAnchored");

    const record = await taskRegistry.tasks(taskId);
    expect(record.agentAddress).to.equal(agent.address);
  });

  it("should reject invalid TEE signature", async () => {
    const taskId = ethers.id("task-002");
    const agentId = ethers.id("agent-beta");
    const logRootHash = ethers.id("log-root-2");
    const kvIndexHash = ethers.id("kv-idx-2");
    const fakeSig = await owner.signMessage(ethers.getBytes(ethers.id("wrong")));

    await expect(
      taskRegistry.connect(agent).anchorTask(taskId, agentId, logRootHash, kvIndexHash, fakeSig)
    ).to.be.revertedWith("Invalid TEE signature");
  });

  it("should not allow duplicate taskId", async () => {
    const taskId = ethers.id("task-003");
    const agentId = ethers.id("agent-gamma");
    const logRootHash = ethers.id("log-root-3");
    const kvIndexHash = ethers.id("kv-idx-3");

    const messageHash = ethers.solidityPackedKeccak256(
      ["bytes32", "bytes32", "bytes32", "bytes32"],
      [taskId, agentId, logRootHash, kvIndexHash]
    );
    const signature = await teeSigner.signMessage(ethers.getBytes(messageHash));

    await taskRegistry.connect(agent).anchorTask(taskId, agentId, logRootHash, kvIndexHash, signature);
    await expect(
      taskRegistry.connect(agent).anchorTask(taskId, agentId, logRootHash, kvIndexHash, signature)
    ).to.be.revertedWith("Task already anchored");
  });
});

describe("DisputeResolution", () => {
  let taskRegistry: any, disputeResolution: any;
  let owner: any, client: any, executor: any, arbiter: any;

  beforeEach(async () => {
    [owner, client, executor, arbiter] = await ethers.getSigners();
    const TR = await ethers.getContractFactory("TaskRegistry");
    taskRegistry = await TR.deploy(owner.address);

    const DR = await ethers.getContractFactory("DisputeResolution");
    disputeResolution = await DR.deploy(await taskRegistry.getAddress(), arbiter.address);

    await taskRegistry.setDisputeResolver(await disputeResolution.getAddress());
  });

  it("should submit a dispute with escrow", async () => {
    const taskId = ethers.id("task-dispute-001");
    const evidenceHash = ethers.id("evidence");

    await expect(
      disputeResolution.connect(client).submitDispute(taskId, executor.address, evidenceHash, {
        value: ethers.parseEther("0.05"),
      })
    ).to.emit(disputeResolution, "DisputeSubmitted");
  });

  it("should reject dispute with low escrow", async () => {
    const taskId = ethers.id("task-dispute-002");
    const evidenceHash = ethers.id("evidence-2");

    await expect(
      disputeResolution.connect(client).submitDispute(taskId, executor.address, evidenceHash, {
        value: ethers.parseEther("0.001"),
      })
    ).to.be.revertedWith("Escrow too low");
  });
});

describe("AgentRegistry", () => {
  let agentRegistry: any;
  let owner: any, user: any;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();
    const AR = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AR.deploy();
  });

  it("should register an agent", async () => {
    const agentId = ethers.id("agent-001");
    const metadataHash = ethers.id("metadata-hash");

    await expect(
      agentRegistry.connect(user).registerAgent(agentId, metadataHash)
    ).to.emit(agentRegistry, "AgentRegistered");

    const profile = await agentRegistry.agents(agentId);
    expect(profile.owner).to.equal(user.address);
    expect(profile.reputationScore).to.equal(5000n);
  });

  it("should not allow duplicate agent registration", async () => {
    const agentId = ethers.id("agent-002");
    const metadataHash = ethers.id("metadata-hash-2");

    await agentRegistry.connect(user).registerAgent(agentId, metadataHash);
    await expect(
      agentRegistry.connect(user).registerAgent(agentId, metadataHash)
    ).to.be.revertedWith("Agent exists");
  });
});
