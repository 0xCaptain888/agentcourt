<div align="center">

# AgentCourt

### AI Agent 经济的法律基础设施

[![CI](https://github.com/0xCaptain888/agentcourt/workflows/CI/badge.svg)](https://github.com/0xCaptain888/agentcourt/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![0G Mainnet](https://img.shields.io/badge/0G-主网部署-blue)](https://chainscan.0g.ai)
[![X](https://img.shields.io/badge/X-@0xCaptain888-000?logo=x)](https://x.com/0xCaptain888)

[在线演示](https://bagpx66z.mule.page/#demo) · [演示视频 (3分钟)](https://www.youtube.com/watch?v=PRgAqjJTTeM) · [English](./README.md) · [X / Twitter](https://x.com/0xCaptain888)

</div>

**AgentCourt 是面向 AI Agent 的可验证执行层与去中心化仲裁协议，基于 [0G](https://0g.ai) 构建。** 每一次 AI 决策都在 TEE（可信执行环境）中运行，执行日志通过 Merkle 证明存储在 0G Storage，结果锚定上链。当 Agent 之间产生争议时，TEE 安全仲裁者自动审查证据，并通过智能合约托管资金完成裁决——无需人工介入。

---

## 0G 主网合约

| 合约 | 地址 | 浏览器 |
|------|------|--------|
| TaskRegistry | `0xDB9cC2829D002aD68096c0F8E632C4Da33aA6C3b` | [查看](https://chainscan.0g.ai/address/0xDB9cC2829D002aD68096c0F8E632C4Da33aA6C3b) |
| DisputeResolution | `0x6047464bFd78BAAE05d1eaC93713E7C2DD9D19BC` | [查看](https://chainscan.0g.ai/address/0x6047464bFd78BAAE05d1eaC93713E7C2DD9D19BC) |
| AgentRegistry | `0x7D82Fde5705429FBc4a356495020203814009995` | [查看](https://chainscan.0g.ai/address/0x7D82Fde5705429FBc4a356495020203814009995) |

---

## 核心问题

当 AI Agent 开始做出真正的经济决策——审批付款、执行交易、签署合同——三个关键问题浮出水面：

- **如果 AI Agent 导致经济损失，谁来承担责任？**
- **你如何证明 AI Agent 做决策时实际「想了什么」？**
- **当两个 AI Agent 对一笔交易产生分歧，谁来仲裁？**

如今，AI Agent 的输出是不透明的、不可追溯的、不可验证的。自主 Agent 之间的商业活动没有任何法律基础设施。

## AgentCourt 做什么

AgentCourt 为 AI Agent 经济提供 **可验证执行层** 和 **去中心化仲裁协议**：

1. **密封推理** — 每个 AI 决策都在 TEE（可信执行环境）中运行，通过 0G Compute 产生密码学签名证明输出未被篡改。

2. **防篡改日志** — 执行数据写入 0G Storage，采用双层架构：KV 层提供快速索引查询，Log 层提供永久归档。

3. **链上锚定** — 每次执行的 Merkle 根哈希锚定到 0G Chain，创建不可变的审计轨迹。

4. **去中心化仲裁** — 当争议发生时，TEE 仲裁 Agent 在安全飞地中审查证据并签发裁决，押金自动分配。

5. **Agent 身份与声誉** — 每个 Agent 拥有链上身份（0G Agent ID）和基于任务结果动态更新的声誉评分。

---

## 0G 技术集成

AgentCourt 是所有五个 0G 核心组件的 **生产级集成**。每个 SDK 调用都直接访问真实的 0G 基础设施——零 Mock、零模拟数据。

| 0G 组件 | SDK 包 | 使用方式 |
|---|---|---|
| **0G Compute (TeeML)** | `@0glabs/0g-serving-broker` | `createZGComputeNetworkBroker()` → `broker.inference.listService()` → `getRequestHeaders()` → OpenAI 兼容 TEE 端点 → `processResponse()` 验证签名 |
| **0G Storage Log** | `@0glabs/0g-ts-sdk` | `ZgFile.fromFilePath()` → `merkleTree()` → `indexer.upload()` — 生成可在 [storagescan.0g.ai](https://storagescan.0g.ai) 验证的 `rootHash` |
| **0G Storage KV** | `@0glabs/0g-ts-sdk` | `Batcher` + `streamDataBuilder.set()` 写入，`KvClient.getValue()` 按 taskId/agentId 亚毫秒级读取 |
| **0G Chain** | `ethers.js` v6 | TaskRegistry + DisputeResolution + AgentRegistry 合约部署在 0G 主网 (Chain ID: 16661) |
| **Agent ID** | SDK + 链上 | Agent 元数据上传到 0G Storage，身份注册到 AgentRegistry 合约并进行声誉评分 |

### SDK: TEE 推理流程 (tee-client.ts)

```typescript
// 1. 通过 0G Compute Marketplace 初始化 broker
const broker = await createZGComputeNetworkBroker(signer);

// 2. 列出可用的 TEE Provider
const services = await broker.inference.listService();

// 3. 创建计费 ledger（首次使用）
await broker.ledger.addLedger(0.05); // 存入 0.05 A0GI

// 4. 获取 Provider 端点
const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

// 5. 生成一次性计费请求头
const headers = await broker.inference.getRequestHeaders(providerAddress, prompt);

// 6. 调用 TEE 推理端点（OpenAI 兼容）
const response = await fetch(`${endpoint}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model }),
});

// 7. 验证 TEE 签名 + 结算费用
const isValid = await broker.inference.processResponse(providerAddress, output, chatId);
```

### SDK: 存储流程 (storage-client.ts)

```typescript
// 上传到 0G Storage Log 层
const file = await ZgFile.fromFilePath(tmpFile);
const [tree, treeErr] = await file.merkleTree();
const rootHash = tree!.rootHash(); // 可在 storagescan.0g.ai 验证
const [tx, uploadErr] = await indexer.upload(file, evmRpc, signer);

// 从 0G Storage 下载并做 Merkle proof 校验
const err = await indexer.download(rootHash, outputPath, true);

// KV 层写入（通过 Batcher）
const batcher = new Batcher(1, nodes, flowContract, evmRpc);
batcher.streamDataBuilder.set(streamId, keyBytes, valueBytes);
const [tx, batchErr] = await batcher.exec();

// KV 层读取（通过 KvClient）
const kvClient = new KvClient(kvNodeRpc);
const value = await kvClient.getValue(streamId, keyBytes);
```

### 网络端点

| 网络 | 端点 | 值 |
|---|---|---|
| **主网** | EVM RPC | `https://evmrpc.0g.ai` |
| **主网** | Storage Indexer (Turbo) | `https://indexer-storage-turbo.0g.ai` |
| **主网** | Flow 合约 | `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57B526` |
| **测试网** | EVM RPC | `https://evmrpc-testnet.0g.ai` |
| **测试网** | Storage Indexer (Turbo) | `https://indexer-storage-testnet-turbo.0g.ai` |
| **测试网** | Flow 合约 | `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296` |
| **测试网** | KV 节点 | `https://kv-testnet.0g.ai` |

---

## 快速开始

### 前置条件

- Node.js >= 20
- pnpm (`npm i -g pnpm`)
- 拥有 OG 代币的钱包（[水龙头](https://faucet-testnet.0g.ai)）

### 一键启动

```bash
git clone https://github.com/0xCaptain888/agentcourt.git
cd agentcourt
cp .env.example .env
# 编辑 .env: 添加你的 PRIVATE_KEY
./bootstrap.sh
```

### 环境变量

```bash
# .env
PRIVATE_KEY=0x...                                          # 钱包私钥（需要 OG 余额）
OG_TESTNET_RPC=https://evmrpc-testnet.0g.ai               # 测试网 RPC
OG_MAINNET_RPC=https://evmrpc.0g.ai                       # 主网 RPC
TEE_SIGNER_ADDRESS=0x...                                   # TEE Provider 公钥
ARBITER_TEE_SIGNER=0x...                                   # 仲裁者 TEE 公钥
AGENTCOURT_TASK_REGISTRY=0xDB9cC2...                       # TaskRegistry 合约
AGENTCOURT_DISPUTE_RESOLVER=0x6047...                      # DisputeResolution 合约
AGENTCOURT_AGENT_REGISTRY=0x7D82...                        # AgentRegistry 合约
OG_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai # Storage Indexer
OG_KV_NODE_RPC=https://kv-testnet.0g.ai                   # KV 节点
OG_FLOW_CONTRACT=0x22E03a6A89B950F1c82ec5e74F8eCa321a105296 # Flow 合约
```

---

## 项目结构

```
agentcourt/
├── packages/
│   ├── contracts/      # Solidity 智能合约 (Hardhat)
│   │   ├── contracts/
│   │   │   ├── TaskRegistry.sol        # 链上任务锚定
│   │   │   ├── DisputeResolution.sol   # 托管 + 裁决结算
│   │   │   └── AgentRegistry.sol       # Agent 身份 & 声誉
│   │   ├── deployments/
│   │   │   └── 0g-mainnet.json         # 主网部署地址
│   │   └── scripts/deploy.ts
│   ├── sdk/            # TypeScript SDK
│   │   └── src/
│   │       ├── index.ts           # AgentCourt 主编排器
│   │       ├── tee-client.ts      # 0G Compute TEE 客户端（真实 broker）
│   │       ├── storage-client.ts  # 0G Storage KV + Log（真实 SDK）
│   │       ├── logger.ts          # 双层执行日志记录器
│   │       ├── proof.ts           # 证明构建器 & 验证器
│   │       ├── agent-id.ts        # Agent ID 注册客户端
│   │       └── arbiter.ts         # 自动化争议仲裁器
│   ├── skill/          # OpenClaw Skill 插件
│   └── dashboard/      # Next.js 14 实时仪表板
├── docs/
│   ├── architecture.md # 系统架构图
│   ├── data-flow.md    # 时序图
│   └── REVIEWER.md     # 评委快速指南
├── bootstrap.sh        # 一键部署脚本
└── Makefile
```

---

## SDK 用法

### 完整流程：TEE 推理 + 存储 + 链上锚定

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

// 注册 Agent
const agent = await ac.registerAgent({
  name: "PaymentBot",
  description: "自动付款审批 Agent",
  capabilities: ["payment-approval", "invoice-verification"],
});

// 执行可验证推理 (TEE → Storage → Chain)
const receipt = await ac.verifiedInference({
  agentId: agent.agentId,
  prompt: "发票 INV-2025-0001 是否合法？金额: ¥300,000 来自供应商 XYZ",
});

console.log("Task ID:", receipt.taskId);
console.log("Storage rootHash:", receipt.logRootHash);  // 在 storagescan.0g.ai 验证
console.log("Chain TX:", receipt.chainTxHash);           // 在 chainscan.0g.ai 验证
console.log("TEE 验证:", receipt.teeResult.isValid);
```

---

## 应用场景

| 场景 | AgentCourt 如何帮助 |
|---|---|
| **B2B 合规** | AI 付款审批获得防篡改审计轨迹 |
| **DAO 治理** | Agent 投票决策可验证且可争议 |
| **AI 保险** | 执行证明支持自动理赔 |
| **Agent SaaS** | 服务提供方证明质量；客户可以对差输出提出争议 |

---

## 技术栈

- **智能合约**: Solidity 0.8.27, Hardhat, OpenZeppelin
- **SDK**: TypeScript 5.4, ethers.js v6, `@0glabs/0g-ts-sdk`, `@0glabs/0g-serving-broker`
- **仪表板**: Next.js 14, Tailwind CSS, wagmi, viem, RainbowKit, Recharts
- **测试**: Chai, Hardhat Network, GitHub Actions CI
- **部署**: 0G 主网 (Chain ID: 16661), Vercel (仪表板)

---

## 许可证

[MIT](LICENSE) - AgentCourt Team 2025
