# Walletrix Security Practices

This document summarizes the security controls that are actually present in the current Walletrix codebase.

## Cryptography

### Password Hashing

User passwords in the legacy auth flow are hashed with Argon2id in `backend/src/services/argon2Service.js`. The service is configured for a memory-hard profile so password verification is resistant to simple brute-force and GPU-style attacks.

### Wallet Encryption

Wallet payloads are encrypted in `backend/src/services/walletService.js` using:

- AES-256-GCM for authenticated encryption
- PBKDF2-SHA256 for password-based key derivation
- 600,000 PBKDF2 iterations

This is the encryption path used for the stored wallet payload that the frontend later unlocks with the user password.

### Telegram Bot Wallet Encryption

The dedicated Telegram bot wallet is stored separately from the main wallet payload. Its private key is encrypted in `backend/src/services/telegramExecutionService.js` using a server-side signing key derived from `SERVER_SIGNING_KEY`. The current storage format uses AES-256-GCM, while legacy CBC-formatted values can still be decrypted for backward compatibility.

### Stealth Address Primitives

`backend/src/services/stealthAddressService.js` implements stealth-address cryptographic primitives using secp256k1 and ECDH-style shared-secret derivation. In the current product flow, this is used to issue wallet-linked private receive addresses through the Telegram assistant. Full claim/sweep lifecycle remains future work.

## Authentication and Access Control

Walletrix currently uses two auth paths:

- Clerk-backed authentication for the main app and account-linked wallet flows
- JWT-based auth service for the legacy email/password API path

The Clerk middleware verifies JWTs against Clerk's backend SDK. The legacy auth service issues short-lived access tokens and refresh tokens using configured JWT secrets. Both paths coexist in the current repository.

## API Protection

The Express backend applies:

- Helmet security headers
- custom security header middleware
- CORS origin checks
- compression
- request logging and monitoring
- domain-specific rate limiters for auth, wallet generation, blockchain queries, token queries, prices, and general API traffic

Validation middleware is applied on the wallet and auth routes to reduce malformed input reaching business logic.

## Conversation and Telegram Safety

The Telegram assistant includes several safety controls:

- webhook secret verification
- per-user rate limiting
- account linking through one-time expiring link codes
- persisted conversation sessions for safer restart recovery
- explicit confirmation before executing transfers
- user-friendly error mapping instead of raw internal exceptions

The bot executes transactions from a dedicated Telegram bot wallet. It does not directly spend from the user's primary wallet data in the current implementation.

## Operational Notes

- `conversation_sessions` persistence is database-backed when the Prisma delegate and table are available, with memory fallback only as a resilience path
- request metrics and health reporting are exposed by backend monitoring middleware
- bot-wallet funding and low-balance notifications are handled by the Telegram notification monitor

## Current Limitations

- Frontend Bitcoin transfer execution is not complete
- Stealth-address issuance is implemented, but not claim/sweep
- Smart-vault and smart-account features exist in the codebase, but they are not the main execution path for the current Telegram bot

This document intentionally describes the current state of the repository rather than the broader long-term roadmap.
