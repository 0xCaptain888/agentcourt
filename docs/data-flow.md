# AgentCourt Data Flow

## Normal Task Execution

The happy-path flow for a task submitted through AgentCourt:

```mermaid
sequenceDiagram
    participant User
    participant SDK
    participant Contract as Task Manager
    participant TEE as TEE Runtime
    participant Agent as AI Agent
    participant Storage as 0G Storage

    User->>SDK: submitTask(agentId, prompt, fee)
    SDK->>Contract: createTask(agentId, inputHash, fee)
    Contract-->>SDK: taskId, escrow confirmed

    SDK->>TEE: executeInEnclave(taskId, prompt)
    TEE->>Agent: run(prompt)
    Agent-->>TEE: output

    TEE->>Storage: uploadJson(executionLog)
    Storage-->>TEE: rootHash, txHash

    TEE->>TEE: sign(taskId, agentId, rootHash, kvIndexHash)
    TEE-->>SDK: {output, attestation, rootHash}

    SDK->>Contract: completeTask(taskId, rootHash, attestation)
    Contract->>Contract: release escrow to agent owner

    SDK-->>User: {output, proofBundle}
```

## Dispute Resolution Flow

When a user disputes a task result:

```mermaid
sequenceDiagram
    participant User
    participant SDK
    participant Dispute as Dispute Contract
    participant Arbiter as Arbiter Agent (TEE)
    participant Storage as 0G Storage
    participant Staking as Staking Contract

    User->>SDK: fileDispute(taskId, reason, evidenceHash)
    SDK->>Dispute: submitDispute(taskId, reason, bond)
    Dispute->>Dispute: lock dispute bond
    Dispute-->>SDK: disputeId

    Note over Dispute: Challenge period begins (24h)

    Dispute->>Arbiter: DisputeSubmitted event
    Arbiter->>Storage: downloadJson(taskRootHash)
    Storage-->>Arbiter: executionLog

    Arbiter->>Arbiter: analyzeEvidence(log, reason)
    Arbiter->>Arbiter: TEE sign verdict

    Arbiter->>Dispute: resolveDispute(disputeId, verdict, signature)

    alt Dispute Upheld (agent at fault)
        Dispute->>Staking: slash(agentId, penaltyAmount)
        Dispute->>User: return bond + compensation
        Staking-->>User: slashed tokens distributed
    else Dispute Rejected (agent innocent)
        Dispute->>Staking: no slash
        Dispute->>Dispute: forfeit disputant bond
        Staking-->>Dispute: bond distributed to agent owner
    end

    Dispute-->>SDK: DisputeResolved event
    SDK-->>User: {verdict, txHash}
```

## Evidence Verification Sub-flow

How the arbiter verifies evidence integrity before rendering a verdict:

```mermaid
sequenceDiagram
    participant Arbiter
    participant Storage as 0G Storage
    participant Chain as 0G Chain
    participant ProofBuilder

    Arbiter->>Chain: getTask(taskId)
    Chain-->>Arbiter: {agentId, inputHash, rootHash, attestation}

    Arbiter->>Storage: downloadJson(rootHash)
    Storage-->>Arbiter: executionLog

    Arbiter->>ProofBuilder: recoverTeeSigner(taskId, agentId, rootHash, kvHash, sig)
    ProofBuilder-->>Arbiter: recoveredAddress

    Arbiter->>Chain: getAgentTeePublicKey(agentId)
    Chain-->>Arbiter: registeredAddress

    alt Addresses Match
        Arbiter->>Arbiter: TEE attestation valid
        Arbiter->>Arbiter: analyze output quality vs. dispute reason
    else Addresses Mismatch
        Arbiter->>Arbiter: attestation invalid — auto-uphold dispute
    end
```

## Key Design Decisions

1. **Asynchronous Arbitration**: Disputes are resolved asynchronously via events, allowing arbiters to process at their own pace within the challenge window.
2. **Bond Mechanism**: Both parties have skin in the game — agents stake at registration, disputants post a bond. This discourages frivolous disputes.
3. **TEE-in-TEE**: The arbiter itself runs in a TEE, ensuring the verdict logic cannot be tampered with or front-run.
4. **Storage as Source of Truth**: All execution logs are stored on 0G before task completion. This guarantees evidence availability during disputes.
