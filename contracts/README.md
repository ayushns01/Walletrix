# Walletrix Contracts

This directory contains the Foundry workspace for Walletrix smart-contract development.

## What is here

- `src/WalletrixVault.sol` and related contracts for the smart-vault / smart-account layer
- Foundry tests, including unit and formal-style checks already present in the repo
- contract artifacts under `out/` and cache data under `cache/` when generated locally

## Current role in the project

The contract layer is part of Walletrix's ERC-4337 and smart-vault exploration. It is not the execution path used by the current Telegram bot flow, which operates through a dedicated EOA bot wallet on the backend.

## Common Commands

Build contracts:

```bash
forge build
```

Run tests:

```bash
forge test
```

Format Solidity:

```bash
forge fmt
```

Start a local Anvil node:

```bash
anvil
```

## Reference

Foundry documentation: [https://book.getfoundry.sh/](https://book.getfoundry.sh/)
