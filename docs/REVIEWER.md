# Welcome, Judges!

## Fastest Path (3 minutes - no installation)

1. **Live Demo**: Visit the deployed Dashboard to see live attested executions on 0G Mainnet
2. **Demo Video**: [YouTube Link] (2:48)
3. **Mainnet Proof**: See contract addresses in README - click Explorer links to verify

## Local Reproduction (15 minutes)

### Prerequisites
- Node.js >= 20
- pnpm (will be auto-installed if missing)

### Steps

```bash
git clone https://github.com/0xCaptain888/agentcourt.git
cd agentcourt
cp .env.example .env
# Fill in PRIVATE_KEY (get testnet OG from https://faucet-testnet.0g.ai)
./bootstrap.sh
```

### Run E2E Test

```bash
make demo
# Expected output:
# --- AgentCourt E2E Integration Test ---
# Step 1: Registering agents...
# Step 2: Running TEE inference + on-chain anchor...
# Step 3: Verifying on-chain proof...
# Step 4: Submitting dispute...
# Step 5: Checking dispute status...
# --- E2E Test Complete ---
```

## Architecture Walkthrough

AgentCourt integrates all 5 core 0G components:

| Component | Usage |
|-----------|-------|
| 0G Compute (TeeML) | Sealed inference - every AI output is TEE-attested |
| 0G Storage KV | Fast indexed lookups by taskId/agentId |
| 0G Storage Log | Permanent tamper-proof archive of execution data |
| 0G Chain | On-chain anchoring + escrow-based arbitration |
| Agent ID | On-chain identity + reputation scoring |

## Key Files

| Path | Description |
|------|-------------|
| `packages/contracts/contracts/` | 3 Solidity contracts (TaskRegistry, DisputeResolution, AgentRegistry) |
| `packages/sdk/src/` | TypeScript SDK (storage, TEE, proof, agent-id) |
| `packages/skill/` | OpenClaw Skill plugin |
| `packages/dashboard/` | Next.js 14 real-time dashboard |
| `bootstrap.sh` | One-click setup script |

## Questions?

- GitHub Issues: https://github.com/0xCaptain888/agentcourt/issues
