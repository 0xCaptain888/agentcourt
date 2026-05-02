# AgentCourt OpenClaw Skill

## Installation

```bash
openclaw skills install agentcourt
```

## Configuration

Set the following in your OpenClaw config:

| Key | Description |
|-----|-------------|
| `AGENTCOURT_PRIVATE_KEY` | Wallet private key (secret) |
| `AGENTCOURT_TASK_REGISTRY` | TaskRegistry contract address |
| `AGENTCOURT_DISPUTE_RESOLVER` | DisputeResolution contract address |
| `AGENTCOURT_AGENT_REGISTRY` | AgentRegistry contract address |
| `AGENTCOURT_NETWORK` | `testnet` or `mainnet` |

## What It Does

Once installed, every inference your OpenClaw agent makes is automatically:

1. **Routed through a TEE provider** (0G Compute TeeML) for sealed execution
2. **Logged to 0G Storage** (KV layer for fast lookup + Log layer for permanent archive)
3. **Anchored on 0G Chain** with the execution's Merkle root hash

This creates a tamper-proof, verifiable audit trail for every AI decision.

## Commands

### `court-check <taskId>`
Verify a specific task's TEE attestation and on-chain anchor status.

### `court-dispute <taskId> <executorAddress> <evidence> <escrow>`
Submit a dispute against another agent's task execution. Requires OG escrow deposit.

### `court-status <taskId>`
Check the current status of a dispute (Pending / Resolved / Verdict details).

## How Disputes Work

1. Client submits dispute with evidence and OG escrow
2. TEE-arbiter agent reviews evidence inside a secure enclave
3. Arbiter signs verdict with TEE attestation
4. Smart contract distributes funds based on verdict
5. Agent reputation scores are updated automatically
