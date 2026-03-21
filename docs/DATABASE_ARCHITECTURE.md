# Walletrix Database Architecture

This document describes the Prisma-backed PostgreSQL schema that is currently used by Walletrix.

## Overview

The backend stores application data in PostgreSQL and accesses it through Prisma. The schema is centered around account-linked wallet management and Telegram-assistant support rather than a purely contract-only architecture.

The main persisted model groups are:

- user and auth-linked records
- wallet and transaction records
- Telegram linking, bot-wallet, and conversation-state records
- stealth receive-profile records
- smart-account scaffolding records
- audit and activity records

## Core Models

### `User`

Represents the main Walletrix account. It stores the email identity, optional profile data, and Telegram linking fields. It is the parent for wallets, activity logs, saved recipients, Telegram link codes, and stealth profiles.

### `Wallet`

Represents a persisted wallet row. In the current app, one logical wallet shown in the frontend may correspond to multiple `Wallet` rows in the database, one per network/address, grouped through metadata. This is how a single account-level wallet can expose Ethereum, Bitcoin, and Solana addresses while still being stored in a normalized relational model.

### `Transaction`

Stores wallet-linked transaction records and metadata. It is used for persisted transaction history and supports network, token, amount, status, gas, and direction fields.

### `ActivityLog`

Stores audit-style events such as auth activity and Telegram assistant activity. Recent Telegram transfer history is reconstructed from this activity stream in the current implementation.

## Telegram-Related Models

### `TelegramLinkCode`

Stores one-time link codes used to associate a Telegram account with a Walletrix user. These codes are generated from the authenticated web app and consumed by the Telegram `/start` flow.

### `TelegramBotWallet`

Stores the dedicated bot wallet generated for each linked Telegram user. The encrypted private key is separate from the user's normal wallet payload and is used only for Telegram-driven execution.

### `ConversationSession`

Stores persisted Telegram conversation state, including chat context, transfer drafts, pending intents, and expiry information. This allows multi-turn conversations to survive backend restarts instead of living only in memory.

### `SavedRecipient`

Stores the user's saved recipient aliases. These records power both the Settings UI and natural-language Telegram commands such as sending funds to a named contact.

## Privacy-Oriented Receive Models

### `StealthWalletProfile`

Represents a long-lived stealth receive profile bound to a selected wallet context. It stores the scan and spend public keys plus encrypted private material needed for stealth-address issuance.

### `StealthAddressIssue`

Represents a one-time stealth receive address issued from a profile. It stores the generated stealth address, the ephemeral public key, and status fields such as `ACTIVE`, `FUNDED`, `CLAIMED`, and `EXPIRED`.

## Smart-Account Scaffolding

### `SmartAccount`

Links a wallet to an ERC-4337-oriented smart-account record. This stores predicted/deployed vault addresses, chain IDs, deployment state, and factory salt values.

### `Guardian`

Stores guardian addresses for smart-account recovery or protection workflows.

### `UserOperation`

Stores ERC-4337-style user operation records and their execution status.

## Important Practical Notes

- The Prisma schema currently persists the main wallet platform and Telegram assistant state together
- Multi-signature helpers exist in the codebase, but they are not modeled as first-class Prisma tables in the current schema
- The frontend reconstructs grouped multi-chain wallet objects from multiple `Wallet` rows
- Telegram and stealth features are now first-class schema concerns, not just in-memory experiments

This document is intentionally scoped to the current persisted schema rather than older design notes or future-only structures.
