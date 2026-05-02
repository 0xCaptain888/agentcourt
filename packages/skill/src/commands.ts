import { AgentCourt } from "@agentcourt/sdk";

export async function courtCheck(args: { taskId: string }, agentcourt: AgentCourt) {
  const result = await agentcourt.verify(args.taskId);
  if (!result.found) {
    console.log("Task not found on chain.");
    return;
  }
  console.log(`Task ${args.taskId}`);
  console.log(`  Agent:        ${result.agent}`);
  console.log(`  Log root:     ${result.logRootHash}`);
  console.log(`  TEE valid:    ${result.teeSignatureValid ? "Yes" : "No"}`);
  console.log(`  Status:       ${result.status}`);
}

export async function courtDispute(args: any, agentcourt: AgentCourt) {
  const dispute = await agentcourt.submitDispute({
    taskId: args.taskId,
    executor: args.executorAddress,
    evidence: args.evidence,
    escrowOG: args.escrow,
  });
  console.log(`Dispute submitted: ${dispute.disputeId}`);
  console.log(`  Tx: https://chainscan.0g.ai/tx/${dispute.txHash}`);
  console.log(`  Arbiter agent will review within 5 minutes.`);
}

export async function courtStatus(args: { taskId: string }, agentcourt: AgentCourt) {
  const status = await agentcourt.getDisputeStatus(args.taskId);
  console.log(JSON.stringify(status, null, 2));
}
