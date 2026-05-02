export const CONTRACTS = {
  taskRegistry: "0x0000000000000000000000000000000000000001" as `0x${string}`,
  disputeResolution: "0x0000000000000000000000000000000000000002" as `0x${string}`,
  agentRegistry: "0x0000000000000000000000000000000000000003" as `0x${string}`,
};

export const TASK_REGISTRY_ABI = [
  {
    type: "event",
    name: "TaskAnchored",
    inputs: [
      { name: "taskId", type: "bytes32", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "logRootHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "function",
    name: "tasks",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "taskId", type: "bytes32" },
      { name: "agentAddress", type: "address" },
      { name: "agentId", type: "bytes32" },
      { name: "logRootHash", type: "bytes32" },
      { name: "kvIndexHash", type: "bytes32" },
      { name: "teeAttestation", type: "bytes" },
      { name: "timestamp", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTaskCount",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const DISPUTE_RESOLUTION_ABI = [
  {
    type: "event",
    name: "DisputeSubmitted",
    inputs: [
      { name: "disputeId", type: "bytes32", indexed: true },
      { name: "taskId", type: "bytes32", indexed: true },
      { name: "client", type: "address", indexed: true },
      { name: "executor", type: "address", indexed: false },
      { name: "escrow", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DisputeResolved",
    inputs: [
      { name: "disputeId", type: "bytes32", indexed: true },
      { name: "verdict", type: "uint8", indexed: false },
      { name: "clientAmount", type: "uint256", indexed: false },
      { name: "executorAmount", type: "uint256", indexed: false },
      { name: "protocolFee", type: "uint256", indexed: false },
    ],
  },
] as const;

export const AGENT_REGISTRY_ABI = [
  {
    type: "function",
    name: "agents",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "agentId", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "metadataHash", type: "bytes32" },
      { name: "reputationScore", type: "uint256" },
      { name: "totalTasks", type: "uint256" },
      { name: "successfulTasks", type: "uint256" },
      { name: "disputedTasks", type: "uint256" },
      { name: "registeredAt", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const;
