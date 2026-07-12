# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo Layout

Monorepo with three workspaces, each with its own `package.json`/toolchain:

- `frontend/` — Next.js 14 App Router app (Clerk auth, Tailwind). Uses plain JS, not TS, despite a few `.ts` files.
- `backend/` — Express API (ESM, `"type": "module"`), Prisma + PostgreSQL, Jest tests.
- `contracts/` — Foundry workspace (`WalletrixVault`, `WalletrixVaultFactory`, ERC-4337 style smart-account scaffolding). Not wired into the live user flow.

Top-level `package.json` exists only to fan out scripts via `concurrently`; runtime deps live in the sub-workspaces.

## Common Commands

From the repo root:

```bash
npm run dev          # backend + frontend in parallel via concurrently
npm run build        # build:frontend then build:backend
npm run test         # frontend test (no-op) + backend jest
npm run lint         # frontend next lint + backend (no-op)
```

Backend (`cd backend`):

```bash
npm run dev          # prisma generate + nodemon src/index.js  (port 3001)
npm test             # NODE_ENV=test jest --runInBand
npm run test:watch
npm run test:coverage
# single test file:
NODE_ENV=test npx jest --watchman=false --runInBand tests/path/to/file.test.js
# single test name:
NODE_ENV=test npx jest --watchman=false --runInBand -t "should do X"
npm run db:push      # prisma db push (dev)
npm run db:migrate:dev
npm run db:studio
```

Jest enforces a 70% global coverage threshold (`backend/jest.config.js`). `postinstall` runs `prisma generate`; `npm run dev`/`start` also re-runs it, so a stale client after schema edits is rare.

Frontend (`cd frontend`):

```bash
npm run dev          # next dev  (port 3000)
npm run build
npm run lint
# no automated tests configured
```

Contracts (`cd contracts`):

```bash
forge build
forge test
```

## Environment

- `.env.example` at the root documents required vars. Backend reads from `backend/.env`; frontend from `frontend/.env.local`.
- `setup-env.mjs` and `setup-database.sh` are helper bootstrappers.
- Required server-side secrets include `DATABASE_URL`, Clerk keys, `SERVER_SIGNING_KEY` (used to encrypt Telegram bot wallet private keys — distinct from user wallet encryption), and a Telegram bot token. `backend/scripts/` has helpers like `generate-server-key` and `register-webhook`.

## Architecture (Big Picture)

### Backend entrypoint and route layout

`backend/src/index.js` mounts everything under `/api/v1/...` with Helmet, custom security headers, CORS, global rate limit, request logger, and metrics middleware. Swagger UI is served at `/api/docs`. Route groups live in `backend/src/routes/` and follow a strict route → controller → service split:

- `wallet` / `frontendWallet` / `databaseWallet` — wallet CRUD, encryption, derivation. `frontendWalletRoutes` is the Clerk-authenticated path the Next.js app uses; `walletRoutes` is the lower-level crypto/utility surface.
- `blockchain`, `token`, `price` — read-only chain + market data (Ethereum, Bitcoin, Solana; CoinGecko-backed prices).
- `auth` — legacy email/password + JWT refresh flow. Coexists with Clerk; both auth paths are live.
- `telegram`, `telegramWebhook` — see Telegram section below.
- `stealth` — stealth receive-address issuance, listing, claim preview, and claim (sweep is still future work).
- `smartVault`, `notification` — ERC-4337 vault scaffolding and notification surface.

Two distinct auth styles guard routes: Clerk (`@clerk/backend`) for app routes, and the legacy JWT for `/auth/*`. Don't assume `req.user` shape is uniform — check the middleware that applies on a given route.

### Frontend wiring

`frontend/app/page.js` is the dashboard shell. State for wallets/network/locking is centralized in `frontend/contexts/DatabaseWalletContext.js`, which is the single source of truth for the wallet list, balances, and token/price refresh. All backend calls go through `frontend/lib/api.js` (axios), which exposes namespaced clients (`walletAPI`, `telegramAPI`, `stealthAPI`, `tokenAPI`, `priceAPI`, `blockchainAPI`). Add new endpoints there rather than hitting fetch directly.

Clerk is the primary auth; `frontend/middleware.ts` enforces protected routes.

Detailed route → controller → service traces for the main flows are in `docs/SYSTEM_WIRING.md` — consult that before tracing a new end-to-end path.

### Telegram subsystem (the most intricate area)

The Telegram assistant is the largest and most coupled subsystem; it's not a thin wrapper. Key shape:

- **Webhook entry:** `POST /api/v1/telegram/webhook` → `telegramWebhookController.handleWebhook` → `telegramService` orchestrator. The god-node function in the codebase is `handleFreeText()` (37 graph edges); start there when tracing message handling.
- **Per-user bot wallet:** every linked user has a dedicated Telegram bot EOA, separate from their main wallets. Private keys are encrypted with `SERVER_SIGNING_KEY` (not the user's password). The Telegram path executes from this bot wallet, *not* from user wallet keys — this is a deliberate blast-radius reduction.
- **Conversation state:** persisted in Postgres via `conversationSessionService.js` so the bot survives restarts mid-confirmation. Look at this service before adding new multi-turn flows; in-memory state is a bug.
- **Intent parsing:** `geminiService.js` (Google Generative AI) classifies intents and extracts transfer slots, with regex fallbacks. Prompts live under `backend/src/services/telegramConversation/` (prompts module).
- **Execution + history + status + notifications:** split across `telegramExecutionService`, `telegramHistoryService`, `telegramTxStatusService`, `telegramNotificationService`. Don't lump them together — each has its own responsibility surface.
- **Stealth integration:** `stealthLifecycleService` + `stealthWalletService` issue and claim stealth receive addresses. Issuance is wired through both the Telegram flow and the frontend stealth panel; claim/sweep is partial.

### Agent loop (when `TELEGRAM_AGENT_ENABLED=true`)

Free-text messages route to `backend/src/services/agent/` instead of `handleFreeText`:

- **Entry:** `handleAgentMessage(text, ctx)` in `agent/index.js`
- **Confirmation gate (runs first):** `confirmationFlow` intercepts YES/NO — the ONLY path to `executeTransfer`. Model never calls executeTransfer.
- **Agent loop:** `runAgentTurn` (Gemini function-calling) → model picks tool → handler → result fed back → loop until final text
- **Tools (read/prepare only):** `get_balance`, `list_recipients`, `prepare_transfer`, `get_tx_status`
- **Pending transfer:** staged in `pendingIntent` session column (Postgres-backed via `conversationSessionService`), single-use + 2-min TTL
- **MCP mode (`TELEGRAM_AGENT_USE_MCP=true`):** tool calls proxied to a standalone MCP server (`backend/src/mcp/start.js`) spawned as a stdio child process. Same tools, same security invariant.
- **Flag off** → old `handleFreeText` path runs unchanged (instant rollback)
- **Known gap:** un-migrated free-text flows (stealth/claim/link-code/save-recipient) do not work when flag is on — no fallback yet

### Database

Single Prisma schema at `backend/prisma/schema.prisma`. Models cover users, wallet groups, Telegram link + bot wallets, saved recipients, conversation sessions, stealth profiles + issues, smart accounts + guardians + UserOperations, transactions, and activity logs. There are no migrations in the repo — dev uses `prisma db push`. If you change the schema, push (or generate a migration if intentional) and remember the client regenerates on `npm run dev`.

### Security model (what's load-bearing)

- User wallet keys: AES-256-GCM with PBKDF2-SHA256, password-derived.
- Auth passwords: Argon2id.
- Telegram bot wallet keys: separately encrypted with `SERVER_SIGNING_KEY` — never reuse the user-password code path here.
- The Telegram bot's blast radius is intentionally limited to the bot wallet balance. Do not "simplify" by signing user-wallet transactions from the Telegram path.

More detail in `docs/SECURITY_PRACTICES.md` and `SECURITY_OVERVIEW.md`.

## Graphify Knowledge Graph

This repo is mapped with [graphify](graphify/) and the output lives at `graphify-out/` (root) plus per-workspace `backend/graphify-out/`, `frontend/graphify-out/`, `contracts/graphify-out/`.

Per `AGENTS.md`:

- For architecture or "where does X live" questions, read `graphify-out/GRAPH_REPORT.md` first — it lists god nodes, community hubs (one per subsystem), and surprising edges. Top god nodes today: `handleFreeText`, `sendBotPlain`, `sendBotMessage`, `getContext`, `handleWebhook` (all Telegram), then `PriceService`, `EthereumService`, `StealthAddressService`, `SmartVaultService`.
- If `graphify-out/wiki/index.md` exists, navigate community pages instead of grepping raw files.
- After modifying code in a session, run `graphify update .` to refresh the AST graph (no API cost).

## Current Caveats (don't be surprised)

- Bitcoin: balance + address derivation work; the full send flow is not symmetric with EVM/Solana on the frontend.
- Stealth: issuance + claim preview + claim are on `main`; full sweep lifecycle is still future work.
- Smart vaults / multisig: code exists, contracts compile, but they are not the polished user path — Telegram still executes from the dedicated bot EOA, not via the smart-account/bundler path.
- Two auth systems (Clerk + legacy JWT) coexist intentionally; don't collapse them without a wider conversation.
- "Omnichain / auto-swap" — not on `main`; it lives on `dev`. See Branch Map below.

## Branch Map (as of 2026-05-30)

Two branches exist: `main` and `dev`, both local and on `origin`.

### `main`
Production-stable. Everything in the architecture sections above is on this branch. Head commit: `0433111 fixes - telegram service`.

### `dev`  ← active development branch
Three commits ahead of main, +6,400 LOC. Formerly `codex/premium-opened-wallet-ui`. This is where the **Sepolia auto-swap / premium dashboard / one-collateral** work lives. Commits:
1. `c7fab62` — Add premium wallet UI and Sepolia demo token flow
2. `fdee343` — Add Sepolia liquidity layer design spec
3. `1acf3c8` — Auto swap integrated with telegramservice

What `dev` adds on top of `main`:
- **Contracts** (`contracts/`): `WalletrixSepoliaRouter.sol`, `mocks/WalletrixMockERC20.sol`, Foundry deploy script `script/DeploySepoliaAutoSwap.s.sol`, Forge tests, `config/sepoliaAutoSwapCatalog.json`, and a `deployments/` JSON snapshot.
- **Frontend libs** (`frontend/lib/`): `sepoliaAutoSwap.mjs`, `sepoliaAutoSwapExecution.mjs`, `sepoliaAutoSwapManifest.mjs`, `sepoliaAutoSwapViewModels.mjs`, plus helpers `mainnetHoldings.mjs`, `networkBalances.mjs`, `sendFee.mjs`, and a generated manifest under `lib/generated/`.
- **Frontend UI**: substantial rewrites of `Dashboard.js`, `SendModal.js`, `NetworkSelector.js`, `ReceiveModal.js`, `app/page.js`, `globals.css`; ~8 frontend test files under `frontend/tests/` (`.mjs` — frontend on `main` has no tests).
- **Backend**: `config/sepoliaAutoSwap.js`, `config/transferTokens.js`, `services/sepoliaAutoSwapService.js`, and edits to `telegramExecutionService.js`, `geminiService.js`, `telegramConversation/orchestrator.js` + `transferHandlers.js` so the Telegram bot can call the router.
- **Plans / designs** under `docs/superpowers/plans/`: Sepolia auto-swap and premium dashboard plans (March–April 2026).

The Sepolia auto-swap is a scoped-down demo of the "one collateral" concept — Walletrix-owned router contract, Sepolia testnet, bot can execute. The fuller CCTP/ERC-7683 production plan is documented at [docs/superpowers/plans/2026-04-09-omnichain-collateral.md](docs/superpowers/plans/2026-04-09-omnichain-collateral.md) (418 lines, no code yet).

### Working-tree notes (on `main`)
Untracked items: `CLAUDE.md`, `docs/SYSTEM_WIRING.md`, `docs/superpowers/` (incl. the omnichain plan), `graphify/`, `.obsidian/` — none committed on any branch. `package-lock.json` has an unstaged modification. If `git status` looks alarming, this is why.
