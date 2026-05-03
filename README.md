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
- **Production-ready**: deployed on mainnet, MIT-licensed, OpenClaw plugin published
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

| 0G Component | How We Use It | Why |
|---|---|---|
| **0G Compute (TeeML)** | Every inference runs through a TEE-attested provider | Guarantees output integrity — no one can tamper with AI responses |
| **0G Storage KV** | Fast indexed lookups by taskId, agentId | Sub-millisecond query for dashboard & real-time monitoring |
| **0G Storage Log** | Permanent archival of full execution logs | Tamper-proof evidence for dispute resolution |
| **0G Chain** | TaskRegistry + DisputeResolution + AgentRegistry contracts | Immutable audit trail + trustless escrow + decentralized arbitration |
| **Agent ID** | On-chain identity, metadata (skills, capabilities), reputation | Trust scoring for agent-to-agent commerce |

---

## Project Structure

```
agentcourt/
├── packages/
│   ├── contracts/          # Solidity smart contracts (Hardhat)
│   │   ├── contracts/
│   │   │   ├── TaskRegistry.sol
│   │   │   ├── DisputeResolution.sol
│   │   │   └── AgentRegistry.sol
│   │   ├── scripts/deploy.ts
│   │   └── test/
│   ├── sdk/                # TypeScript SDK
│   │   └── src/
│   │       ├── index.ts           # Main AgentCourt class
│   │       ├── storage-client.ts  # 0G Storage KV + Log
│   │       ├── logger.ts          # Execution logger
│   │       ├── tee-client.ts      # 0G Compute TEE client
│   │       ├── proof.ts           # Proof builder & verifier
│   │       └── agent-id.ts        # Agent ID client
│   ├── skill/              # OpenClaw Skill plugin
│   │   ├── agentcourt.skill.yaml
│   │   └── src/
│   └── dashboard/          # Next.js 14 real-time dashboard
│       └── src/app/
├── docs/
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

# Start dashboard
cd ../dashboard && pnpm dev
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

## Roadmap

| Timeline | Milestone |
|---|---|
| **Q2 2025** | Mainnet deployment, Dashboard launch, OpenClaw Skill v1 |
| **Q3 2025** | Multi-chain support, Arbiter DAO, Reputation marketplace |
| **Q4 2025** | Insurance protocol integration, Enterprise SDK, Legal opinion templates |
| **2026** | Cross-chain agent commerce standard, Regulatory compliance framework |

---

## Tech Stack

- **Smart Contracts**: Solidity 0.8.24, Hardhat, OpenZeppelin
- **SDK**: TypeScript, ethers.js v6, 0G SDKs
- **Dashboard**: Next.js 14, Tailwind CSS, wagmi, viem, RainbowKit
- **Testing**: Chai, Hardhat Network, GitHub Actions CI
- **Deployment**: 0G Chain (EVM), Vercel (Dashboard)

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
