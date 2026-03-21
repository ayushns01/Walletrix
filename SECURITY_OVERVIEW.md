# Walletrix Security Overview

Walletrix applies a layered security model across wallet storage, authentication, API exposure, and Telegram assistant execution.

## Present Security Controls

- Argon2id hashing for password-based auth records
- AES-256-GCM wallet encryption with PBKDF2-SHA256 key derivation
- encrypted Telegram bot wallet private keys derived from `SERVER_SIGNING_KEY`
- Clerk JWT verification for app-authenticated routes
- legacy JWT access and refresh token flow for the email/password API path
- rate limiting, CORS checks, Helmet, custom security headers, and input validation
- persistent Telegram conversation sessions with database-backed recovery

## Telegram-Specific Security Model

The Telegram assistant does not directly use the user's main wallet private keys. Instead, each linked user gets a dedicated bot wallet that can be funded and used for Telegram-driven transactions. This limits the Telegram execution surface to the bot wallet balance rather than the full account wallet set.

## Current Boundaries

- Bitcoin support is not yet fully symmetric with the EVM and Solana send flows
- Stealth-address issuance is implemented, but full claim/sweep handling is still future work
- Smart-vault exploration exists in the codebase, but the current Telegram bot does not execute through the smart-account path

For the detailed current security write-up, see [docs/SECURITY_PRACTICES.md](/Users/ayushns01/Desktop/Repositories/Walletrix/docs/SECURITY_PRACTICES.md).
