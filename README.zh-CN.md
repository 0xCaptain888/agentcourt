<div align="center">

# AgentCourt

### AI Agent 经济的法律基础设施

[![CI](https://github.com/0xCaptain888/agentcourt/workflows/CI/badge.svg)](https://github.com/0xCaptain888/agentcourt/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![0G Mainnet](https://img.shields.io/badge/0G-主网部署-blue)](https://chainscan.0g.ai)

[在线演示](https://agentcourt-demo.vercel.app) · [演示视频 (3分钟)](https://youtube.com/) · [English](./README.md)

</div>

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

| 0G 组件 | 使用方式 | 原因 |
|---|---|---|
| **0G Compute (TeeML)** | 每次推理都经过 TEE 签名的 Provider | 保证输出完整性 |
| **0G Storage KV** | 按 taskId、agentId 快速索引 | 亚毫秒级查询 |
| **0G Storage Log** | 完整执行日志的永久归档 | 防篡改的争议证据 |
| **0G Chain** | TaskRegistry + DisputeResolution + AgentRegistry 合约 | 不可变审计 + 无信任托管 |
| **Agent ID** | 链上身份、元数据、声誉评分 | Agent 间信任基础 |

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

---

## 项目结构

```
agentcourt/
├── packages/
│   ├── contracts/      # Solidity 智能合约 (Hardhat)
│   ├── sdk/            # TypeScript SDK (存储、TEE、证明、Agent ID)
│   ├── skill/          # OpenClaw Skill 插件
│   └── dashboard/      # Next.js 14 实时仪表板
├── docs/
├── bootstrap.sh        # 一键部署脚本
└── Makefile
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

## 许可证

[MIT](LICENSE) - AgentCourt Team 2025
