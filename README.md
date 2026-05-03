<div align="center">

# AgentCourt

### The Legal Infrastructure for the AI Agent Economy

[![CI](https://github.com/0xCaptain888/agentcourt/workflows/CI/badge.svg)](https://github.com/0xCaptain888/agentcourt/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![0G Mainnet](https://img.shields.io/badge/0G-Mainnet-blue)](https://chainscan.0g.ai)

[Live Demo](https://agentcourt-demo.vercel.app) · [Demo Video (3min)](https://youtube.com/) · [Pitch Deck](./docs/pitch-deck.pdf) · [中文文档](./README.zh-CN.md)

</div>

---

## 0G Mainnet Deployments

| Contract | Address | Explorer |
|----------|---------|----------|
| TaskRegistry | `0xDB9cC2829D002aD68096c0F8E632C4Da33aA6C3b` | [View on 0G Scan](https://chainscan.0g.ai/address/0xDB9cC2829D002aD68096c0F8E632C4Da33aA6C3b) |
| DisputeResolution | `0x6047464bFd78BAAE05d1eaC93713E7C2DD9D19BC` | [View on 0G Scan](https://chainscan.0g.ai/address/0x6047464bFd78BAAE05d1eaC93713E7C2DD9D19BC) |
| AgentRegistry | `0x7D82Fde5705429FBc4a356495020203814009995` | [View on 0G Scan](https://chainscan.0g.ai/address/0x7D82Fde5705429FBc4a356495020203814009995) |

> Deployer: `0x5418546c81E0aCE44128486CFc8e10d665A2af87` · Chain ID: 16661 · [All transactions](https://chainscan.0g.ai/address/0x5418546c81E0aCE44128486CFc8e10d665A2af87)

---

## Quick Demo for Judges (5 minutes)

1. Visit the live dashboard — see live attested executions
2. Connect MetaMask, switch to **0G Mainnet** (auto-prompted)
3. Click any task → view full proof + Storage link + TEE signature
4. (Optional) Run locally:
   ```bash
   git clone https://github.com/0xCaptain888/agentcourt.git && cd agentcourt
   cp .env.example .env  # fill PRIVATE_KEY
   ./bootstrap.sh
   ```

---

## The Problem

As AI agents begin making real economic decisions — approving payments, executing trades, signing contracts — three critical questions emerge:

- **If an AI agent causes financial loss, who is liable?**
- **How do you prove what an AI agent actually "thought" when making a decision?**
- **When two AI agents disagree on a transaction, who arbitrates?**

Today, AI agent outputs are opaque, untraceable, and unverifiable. There is no legal infrastructure for autonomous agent-to-agent commerce.

## What AgentCourt Does

AgentCourt provides the **verifiable execution layer** and **decentralized arbitration protocol** for AI agent economies:

1. **Sealed Inference** — Every AI decision runs inside a TEE (Trusted Execution Environment) via 0G Compute, producing a cryptographic attestation that the output was not tampered with.

2. **Tamper-Proof Logging** — Execution data is written to 0G Storage using a dual-layer approach: KV layer for fast indexed queries, Log layer for permanent archival.

3. **On-Chain Anchoring** — A Merkle root hash of each execution is anchored on 0G Chain, creating an immutable audit trail.

4. **Decentralized Arbitration** — When disputes arise, a TEE-arbiter agent reviews evidence and issues a signed verdict. Escrow funds are distributed automatically.

5. **Agent Identity & Reputation** — Each agent has an on-chain identity (0G Agent ID) with a reputation score that updates based on task outcomes.

## Why AgentCourt Wins

- **Only project** combining TEE Sealed Inference + KV/Log dual-layer Storage + on-chain arbitration
- **5 of 5** 0G core components integrated (Compute, Storage KV, Storage Log, Chain, Agent ID)
- **Production-grade**: all 0G integrations use real SDK calls — zero mocks, zero simulated data
- **Real market**: designed for B2B compliance, DAO governance, AI insurance, Agent SaaS

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Agent Economy                          │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │ Agent A  │   │   Agent B    │   │   Arbiter Agent      │    │
│  │ (Client) │   │ (Executor)   │   │   (TEE-secured)      │    │
│  └────┬─────┘   └──────┬───────┘   └──────────┬───────────┘    │
│       │                 │                      │                 │
├───────┼─────────────────┼──────────────────────┼─────────────────┤
│       │        AgentCourt SDK                  │                 │
│  ┌────▼─────────────────▼──────────────────────▼───────────┐    │
│  │  Inference Interceptor → Logger → Chain Anchor → Proof  │    │
│  └────┬──────────────┬──────────────┬──────────────┬───────┘    │
│       │              │              │              │             │
├───────┼──────────────┼──────────────┼──────────────┼─────────────┤
│       │         0G Infrastructure                  │             │
│  ┌────▼────┐  ┌──────▼──────┐  ┌───▼────┐  ┌─────▼──────┐     │
│  │Compute  │  │Storage KV + │  │  Chain  │  │  Agent ID  │     │
│  │(TeeML)  │  │ Storage Log │  │(L1 EVM)│  │(Registry)  │     │
│  └─────────┘  └─────────────┘  └────────┘  └────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Normal Execution

```
Agent Request → TEE Inference (0G Compute)
    → Output + Signature
    → Log to 0G Storage (KV index + Log archive)
    → Anchor Merkle root on 0G Chain (TaskRegistry)
    → Return proof receipt to agent
```

### Data Flow: Dispute Resolution

```
Client submits dispute + escrow (DisputeResolution.sol)
    → Evidence hash stored (0G Storage)
    → TEE Arbiter reviews evidence in secure enclave
    → Arbiter signs verdict with TEE attestation
    → Smart contract verifies signature & distributes funds
    → Agent reputation scores updated (AgentRegistry.sol)
```

---

## 0G Integration Details

AgentCourt is a **production-grade integration** of all five 0G core components. Every SDK call hits real 0G infrastructure — no mocks, no simulated data.

| 0G Component | SDK Package | How We Use It |
|---|---|---|
| **0G Compute (TeeML)** | `@0glabs/0g-serving-broker` | `createZGComputeNetworkBroker()` → `broker.inference.listService()` → `getRequestHeaders()` → OpenAI-compatible TEE endpoint → `processResponse()` for attestation verification |
| **0G Storage Log** | `@0glabs/0g-ts-sdk` | `ZgFile.fromFilePath()` → `merkleTree()` → `indexer.upload()` — produces a `rootHash` verifiable on [storagescan.0g.ai](https://storagescan.0g.ai) |
| **0G Storage KV** | `@0glabs/0g-ts-sdk` | `Batcher` + `streamDataBuilder.set()` for writes, `KvClient.getValue()` for sub-millisecond reads by taskId/agentId |
| **0G Chain** | `ethers.js` v6 | TaskRegistry + DisputeResolution + AgentRegistry Solidity contracts deployed on 0G Mainnet (Chain ID: 16661) |
| **Agent ID** | SDK + on-chain | Agent metadata uploaded to 0G Storage, identity registered on AgentRegistry contract with reputation scoring |

### SDK: TEE Inference Flow (tee-client.ts)

```typescript
// 1. Initialize broker via 0G Compute Marketplace
const broker = await createZGComputeNetworkBroker(signer);

// 2. List available TEE providers
const services = await broker.inference.listService();

// 3. Create billing ledger (first time)
await broker.ledger.addLedger(0.05); // deposit 0.05 A0GI

// 4. Get provider endpoint
const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

// 5. Generate single-use billing headers
const headers = await broker.inference.getRequestHeaders(providerAddress, prompt);

// 6. Call the TEE inference endpoint (OpenAI-compatible)
const response = await fetch(`${endpoint}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model }),
});

// 7. Verify TEE attestation + settle fees
const isValid = await broker.inference.processResponse(providerAddress, output, chatId);
```

### SDK: Storage Flow (storage-client.ts)

```typescript
// Upload to 0G Storage Log layer
const file = await ZgFile.fromFilePath(tmpFile);
const [tree, treeErr] = await file.merkleTree();
const rootHash = tree!.rootHash(); // verifiable on storagescan.0g.ai
const [tx, uploadErr] = await indexer.upload(file, evmRpc, signer);

// Download from 0G Storage with Merkle proof verification
const err = await indexer.download(rootHash, outputPath, true);

// KV write via Batcher
const batcher = new Batcher(1, nodes, flowContract, evmRpc);
batcher.streamDataBuilder.set(streamId, keyBytes, valueBytes);
const [tx, batchErr] = await batcher.exec();

// KV read via KvClient
const kvClient = new KvClient(kvNodeRpc);
const value = await kvClient.getValue(streamId, keyBytes);
```

### Network Endpoints

| Network | Endpoint | Value |
|---|---|---|
| **Mainnet** | EVM RPC | `https://evmrpc.0g.ai` |
| **Mainnet** | Storage Indexer (Turbo) | `https://indexer-storage-turbo.0g.ai` |
| **Mainnet** | Flow Contract | `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57B526` |
| **Testnet** | EVM RPC | `https://evmrpc-testnet.0g.ai` |
| **Testnet** | Storage Indexer (Turbo) | `https://indexer-storage-testnet-turbo.0g.ai` |
| **Testnet** | Flow Contract | `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296` |
| **Testnet** | KV Node | `https://kv-testnet.0g.ai` |

---

## Project Structure

```
agentcourt/
├── packages/
│   ├── contracts/          # Solidity smart contracts (Hardhat)
│   │   ├── contracts/
│   │   │   ├── TaskRegistry.sol        # On-chain task anchoring
│   │   │   ├── DisputeResolution.sol   # Escrow + verdict settlement
│   │   │   └── AgentRegistry.sol       # Agent identity & reputation
│   │   ├── deployments/
│   │   │   └── 0g-mainnet.json         # Mainnet addresses & metadata
│   │   ├── scripts/deploy.ts
│   │   └── test/
│   ├── sdk/                # TypeScript SDK
│   │   └── src/
│   │       ├── index.ts           # Main AgentCourt orchestrator
│   │       ├── tee-client.ts      # 0G Compute TEE client (real broker)
│   │       ├── storage-client.ts  # 0G Storage KV + Log (real SDK)
│   │       ├── logger.ts          # Dual-layer execution logger
│   │       ├── proof.ts           # Proof builder & verifier
│   │       ├── agent-id.ts        # Agent ID registry client
│   │       └── arbiter.ts         # Automated dispute arbiter
│   ├── skill/              # OpenClaw Skill plugin
│   │   ├── SKILL.md
│   │   └── src/
│   └── dashboard/          # Next.js 14 real-time dashboard
│       └── src/app/
├── docs/
│   ├── architecture.md     # System architecture diagram
│   ├── data-flow.md        # Sequence diagrams
│   └── REVIEWER.md         # Judge/reviewer quick start
├── bootstrap.sh            # One-click setup
├── Makefile
└── .github/workflows/ci.yml
```

---

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm (`npm i -g pnpm`)
- A wallet with OG tokens ([Faucet](https://faucet-testnet.0g.ai))

### One-Click Setup

```bash
git clone https://github.com/0xCaptain888/agentcourt.git
cd agentcourt
cp .env.example .env
# Edit .env: add your PRIVATE_KEY
./bootstrap.sh
```

### Manual Setup

```bash
# Install all packages
pnpm install -r

# Compile contracts
cd packages/contracts && npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
npx hardhat run scripts/deploy.ts --network 0g-testnet

# Build SDK
cd ../sdk && pnpm build

# Start dashboard
cd ../dashboard && pnpm dev
```

### Environment Variables

```bash
# .env
PRIVATE_KEY=0x...                                          # Wallet private key (needs OG balance)
OG_TESTNET_RPC=https://evmrpc-testnet.0g.ai               # Testnet RPC
OG_MAINNET_RPC=https://evmrpc.0g.ai                       # Mainnet RPC
TEE_SIGNER_ADDRESS=0x...                                   # TEE provider public key
ARBITER_TEE_SIGNER=0x...                                   # Arbiter TEE public key
AGENTCOURT_TASK_REGISTRY=0xDB9cC2...                       # TaskRegistry contract
AGENTCOURT_DISPUTE_RESOLVER=0x6047...                      # DisputeResolution contract
AGENTCOURT_AGENT_REGISTRY=0x7D82...                        # AgentRegistry contract
OG_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai # Storage indexer
OG_KV_NODE_RPC=https://kv-testnet.0g.ai                   # KV node
OG_FLOW_CONTRACT=0x22E03a6A89B950F1c82ec5e74F8eCa321a105296 # Flow contract
```

---

## SDK Usage

### Full Pipeline: TEE Inference + Storage + Chain Anchor

```typescript
import { AgentCourt } from "@agentcourt/sdk";

const ac = new AgentCourt({
  privateKey: process.env.PRIVATE_KEY!,
  network: "mainnet",
  contracts: {
    taskRegistry: "0xDB9cC2829D002aD68096c0F8E632C4Da33aA6C3b",
    disputeResolution: "0x6047464bFd78BAAE05d1eaC93713E7C2DD9D19BC",
    agentRegistry: "0x7D82Fde5705429FBc4a356495020203814009995",
  },
});
await ac.init();

// Register an agent
const agent = await ac.registerAgent({
  name: "PaymentBot",
  description: "Automated payment approval agent",
  capabilities: ["payment-approval", "invoice-verification"],
});

// Run verified inference (TEE → Storage → Chain)
const receipt = await ac.verifiedInference({
  agentId: agent.agentId,
  prompt: "Is invoice INV-2025-0001 legitimate? Amount: $45,000 from Vendor XYZ",
});

console.log("Task ID:", receipt.taskId);
console.log("Storage rootHash:", receipt.logRootHash);  // verify on storagescan.0g.ai
console.log("Chain TX:", receipt.chainTxHash);           // verify on chainscan.0g.ai
console.log("TEE Valid:", receipt.teeResult.isValid);

// Verify on-chain proof
const proof = await ac.verify(receipt.taskId);
console.log("On-chain verified:", proof.found, proof.teeSignatureValid);
```

---

## OpenClaw Skill

AgentCourt is available as an OpenClaw Skill plugin. Install it to automatically add TEE attestation and on-chain anchoring to any OpenClaw agent:

```bash
openclaw skills install agentcourt
```

See [packages/skill/SKILL.md](packages/skill/SKILL.md) for configuration details.

---

## Use Cases

| Scenario | How AgentCourt Helps |
|---|---|
| **B2B Compliance** | AI payment approvals get tamper-proof audit trails |
| **DAO Governance** | Agent voting decisions are verifiable and disputable |
| **AI Insurance** | Execution proofs enable automated claims processing |
| **Agent SaaS** | Service providers prove quality; clients can dispute bad outputs |

---

## Tech Stack

- **Smart Contracts**: Solidity 0.8.27, Hardhat, OpenZeppelin
- **SDK**: TypeScript 5.4, ethers.js v6, `@0glabs/0g-ts-sdk`, `@0glabs/0g-serving-broker`
- **Dashboard**: Next.js 14, Tailwind CSS, wagmi, viem, RainbowKit, Recharts
- **Testing**: Chai, Hardhat Network, GitHub Actions CI
- **Deployment**: 0G Mainnet (Chain ID: 16661), Vercel (Dashboard)

---

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

```bash
# Run all tests
make test

# Run E2E integration test
make demo

# Start local development
make dashboard
```

---

## License

[MIT](LICENSE) - AgentCourt Team 2025
