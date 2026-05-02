#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "  AgentCourt - One-Click Bootstrap"
echo "=========================================="
echo ""

# 1. Check dependencies
command -v node >/dev/null || { echo "Need Node.js >= 20"; exit 1; }
command -v pnpm >/dev/null || npm i -g pnpm

NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VER" -lt 20 ]; then
  echo "Need Node.js >= 20 (found v$NODE_VER)"
  exit 1
fi

# 2. Install all packages
echo "[1/6] Installing all packages..."
pnpm install -r

# 3. Check .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "Created .env from .env.example"
  echo "Please edit .env with your PRIVATE_KEY, then re-run this script."
  exit 1
fi
source .env

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "PRIVATE_KEY is not set in .env. Please add it and re-run."
  exit 1
fi

# 4. Compile contracts
echo "[2/6] Compiling contracts..."
cd packages/contracts && npx hardhat compile && cd ../..

# 5. Deploy to testnet
echo "[3/6] Deploying to 0G Galileo testnet..."
cd packages/contracts && npx hardhat run scripts/deploy.ts --network 0g-testnet && cd ../..

# 6. Extract addresses
DEPLOYMENTS=packages/contracts/deployments/0g-testnet.json
if [ -f "$DEPLOYMENTS" ]; then
  TASK_REG=$(node -e "console.log(require('./$DEPLOYMENTS').contracts.TaskRegistry)")
  DISPUTE=$(node -e "console.log(require('./$DEPLOYMENTS').contracts.DisputeResolution)")
  AGENT_REG=$(node -e "console.log(require('./$DEPLOYMENTS').contracts.AgentRegistry)")

  # Update .env
  grep -q "AGENTCOURT_TASK_REGISTRY" .env && sed -i "s|AGENTCOURT_TASK_REGISTRY=.*|AGENTCOURT_TASK_REGISTRY=$TASK_REG|" .env || echo "AGENTCOURT_TASK_REGISTRY=$TASK_REG" >> .env
  grep -q "AGENTCOURT_DISPUTE_RESOLVER" .env && sed -i "s|AGENTCOURT_DISPUTE_RESOLVER=.*|AGENTCOURT_DISPUTE_RESOLVER=$DISPUTE|" .env || echo "AGENTCOURT_DISPUTE_RESOLVER=$DISPUTE" >> .env
  grep -q "AGENTCOURT_AGENT_REGISTRY" .env && sed -i "s|AGENTCOURT_AGENT_REGISTRY=.*|AGENTCOURT_AGENT_REGISTRY=$AGENT_REG|" .env || echo "AGENTCOURT_AGENT_REGISTRY=$AGENT_REG" >> .env

  echo ""
  echo "[4/6] Contracts deployed:"
  echo "  TaskRegistry:      $TASK_REG"
  echo "  DisputeResolution: $DISPUTE"
  echo "  AgentRegistry:     $AGENT_REG"
fi

# 7. Start dashboard
echo ""
echo "[5/6] Starting dashboard at http://localhost:3000..."
cd packages/dashboard && pnpm dev &
DASH_PID=$!

echo ""
echo "=========================================="
echo "  All services running!"
echo "=========================================="
echo ""
echo "  Dashboard:  http://localhost:3000"
echo "  Contracts:  packages/contracts/deployments/0g-testnet.json"
echo ""
echo "  To run E2E test:  make demo"
echo "  To stop:          Ctrl+C"
echo ""

trap "kill $DASH_PID 2>/dev/null" EXIT
wait
