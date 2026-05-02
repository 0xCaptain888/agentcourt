.PHONY: install build test deploy-testnet deploy-mainnet demo arbiter dashboard clean

install:
	pnpm install -r

build:
	cd packages/contracts && pnpm hardhat compile
	cd packages/sdk && pnpm build

test:
	cd packages/contracts && pnpm hardhat test

deploy-testnet:
	cd packages/contracts && pnpm hardhat run scripts/deploy.ts --network 0g-testnet

deploy-mainnet:
	cd packages/contracts && pnpm hardhat run scripts/deploy.ts --network 0g-mainnet

demo:
	cd packages/sdk && pnpm tsx test/e2e.ts

dashboard:
	cd packages/dashboard && pnpm dev

clean:
	find . -name node_modules -type d -prune -exec rm -rf {} +
	find . -name .next -type d -prune -exec rm -rf {} +
	find . -name dist -type d -prune -exec rm -rf {} +
	find . -name artifacts -type d -prune -exec rm -rf {} +
	find . -name cache -type d -prune -exec rm -rf {} +
