# Walletrix Contracts

This directory contains the Foundry workspace for Walletrix smart-contract development.

## What is here

- `src/WalletrixVault.sol` and related contracts for the smart-vault / smart-account layer
- `src/WalletrixSepoliaRouter.sol` for the fixed-rate Sepolia demo router
- `src/mocks/WalletrixMockERC20.sol` for the Sepolia mock-token set
- `script/DeploySepoliaAutoSwap.s.sol` for bootstrapping demo tokens, router inventory, and output manifests
- Foundry tests, including unit and formal-style checks already present in the repo
- contract artifacts under `out/` and cache data under `cache/` when generated locally

## Current role in the project

The contract layer is part of Walletrix's ERC-4337 and smart-vault exploration. It is not the execution path used by the current Telegram bot flow, which operates through a dedicated EOA bot wallet on the backend.

It now also contains the Sepolia-only auto-swap demo lane used by the frontend send modal for ETH-backed mock ERC-20 sends.

## Common Commands

Build contracts:

```bash
forge build
```

Run tests:

```bash
forge test
```

Build only the Sepolia router / mock-token work:

```bash
forge build
forge test --offline --match-contract WalletrixSepoliaRouterTest
```

Format Solidity:

```bash
forge fmt
```

Start a local Anvil node:

```bash
anvil
```

## Sepolia Auto-Swap Deployment

Canonical demo token metadata lives in:

- [config/sepoliaAutoSwapCatalog.json](/Users/ayushns01/Desktop/Repositories/Walletrix/contracts/config/sepoliaAutoSwapCatalog.json)

To deploy the Sepolia demo contracts and write the deployment outputs, set:

- `SEPOLIA_AUTO_SWAP_DEPLOYER_PRIVATE_KEY`
- `SEPOLIA_AUTO_SWAP_WRITE_OUTPUTS=true`

Then run from this directory:

```bash
forge script script/DeploySepoliaAutoSwap.s.sol:DeploySepoliaAutoSwap \
  --rpc-url "$ETHEREUM_SEPOLIA_RPC" \
  --broadcast
```

For a local dry-run that validates the script structure without writing outputs or talking to Sepolia:

```bash
SEPOLIA_AUTO_SWAP_DEPLOYER_PRIVATE_KEY=0x... \
forge script script/DeploySepoliaAutoSwap.s.sol:DeploySepoliaAutoSwap --offline
```

Expected outputs after a real broadcast:

- [deployments/sepolia-auto-swap.sepolia.json](/Users/ayushns01/Desktop/Repositories/Walletrix/contracts/deployments/sepolia-auto-swap.sepolia.json)
- [../frontend/lib/generated/sepoliaAutoSwapManifest.json](/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/lib/generated/sepoliaAutoSwapManifest.json)

Those files are the source for the router address and the importable mock-token addresses shown in the frontend.

## Reference

Foundry documentation: [https://book.getfoundry.sh/](https://book.getfoundry.sh/)
