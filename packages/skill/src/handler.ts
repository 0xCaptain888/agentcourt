import { AgentCourt } from "@agentcourt/sdk";

let agentcourt: AgentCourt;

interface OpenClawHookContext {
  agentId: string;
  input: { prompt: string };
  output: { text: string; signature: string; model: string };
  metadata: Record<string, any>;
  routing: { requireVerifiability?: string; providerAddress: string };
}

export async function init(config: any) {
  agentcourt = new AgentCourt({
    privateKey: config.AGENTCOURT_PRIVATE_KEY,
    network: config.AGENTCOURT_NETWORK,
    contracts: {
      taskRegistry: config.AGENTCOURT_TASK_REGISTRY,
      disputeResolution: config.AGENTCOURT_DISPUTE_RESOLVER,
      agentRegistry: config.AGENTCOURT_AGENT_REGISTRY,
    },
  });
  await agentcourt.init();
}

export async function beforeInference(ctx: OpenClawHookContext) {
  ctx.metadata.agentcourtTaskId = `oc-${ctx.agentId}-${Date.now()}`;
  ctx.metadata.startTime = Date.now();
  // Force routing to TEE provider
  ctx.routing.requireVerifiability = "TeeML";
}

export async function afterInference(ctx: OpenClawHookContext) {
  const receipt = await agentcourt.verifiedInference({
    taskId: ctx.metadata.agentcourtTaskId,
    agentId: ctx.agentId,
    prompt: ctx.input.prompt,
    output: ctx.output.text,
    teeSignature: ctx.output.signature,
    teeProvider: ctx.routing.providerAddress,
    model: ctx.output.model,
  });
  ctx.metadata.attestation = {
    logRootHash: receipt.logRootHash,
    chainTxHash: receipt.chainTxHash,
    explorerUrl: `https://chainscan.0g.ai/tx/${receipt.chainTxHash}`,
  };
  console.log(`[AgentCourt] Anchored task ${ctx.metadata.agentcourtTaskId}`);
}
