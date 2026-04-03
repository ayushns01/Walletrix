# Sepolia Liquidity Layer Design

## Goal
Add an on-chain demo liquidity layer for the existing Sepolia mock-token router so users can provide ETH-only liquidity to all five supported mock-token pools and earn modeled router fees on-chain, without changing the current fixed-rate swap math.

## Problem Being Solved
Walletrix currently demonstrates simplified token sending on Sepolia, but users cannot participate as liquidity providers. Adding a demo liquidity layer strengthens the platform story while preserving the core product message: reducing Web3 hassle for normal users.

The feature should:
- accept only SepETH from the user
- support all five mock-token pools: WUSD, WDAI, WLINK, WWBTC, WGLD
- keep the existing router-based token send flow stable
- route a portion of router fees into pool-specific fee buckets
- store LP positions, shares, and claimable fees on-chain

## Non-Goals
This feature does not attempt to become a full AMM tonight.

Not in scope:
- reserve-based price movement
- slippage and price impact modeling
- token-side liquidity withdrawal
- multi-hop routing or pool-to-pool swaps
- impermanent loss analytics
- Telegram liquidity actions

## Current Baseline
The current Sepolia router is a fixed-rate demo router with seeded mock-token inventory. Users pay SepETH and receive a supported token. Router pricing does not currently depend on reserves.

This design keeps that router model intact and adds a separate on-chain liquidity and fee-distribution layer.

## Proposed Architecture
### Contracts
Add a new contract:
- `WalletrixSepoliaLiquidityManager.sol`

Keep and extend the existing contract:
- `WalletrixSepoliaRouter.sol`

### Liquidity Manager Responsibilities
The liquidity manager will:
- register and manage the five supported pools
- accept ETH-only deposits into a chosen token pool
- mint or account LP shares per depositor
- receive ETH fee contributions from the router for a specific pool
- track pool fee growth and user claimable rewards
- allow LP fee claiming
- allow LP liquidity withdrawal

### Router Responsibilities
The router will continue to:
- receive SepETH for mock-token sends
- deliver mock tokens from seeded inventory

The router will be extended to:
- compute a small fee cut from each token send
- forward that fee in ETH to the liquidity manager tagged to the token pool
- preserve the existing fixed-rate token-send behavior

## Pool Model
There will be one pool per mock token:
- SepETH / WUSD
- SepETH / WDAI
- SepETH / WLINK
- SepETH / WWBTC
- SepETH / WGLD

Each pool stores:
- token address
- total ETH liquidity deposited
- total LP shares
- accumulated fee-per-share value
- optional total fees received metric

Each user position stores:
- shares
- deposited ETH amount
- fee debt or equivalent accounting checkpoint

## Single-Asset ETH Entry
Users provide only SepETH.

The system treats the deposit as entry into a chosen token pool without requiring the user to already hold that token. This is the key accessibility angle for the feature and keeps the product aligned with the "reduced hassle" message.

The token side remains conceptual for LP exposure. Fee earnings are real on-chain ETH distributions.

## User Flow
### Dashboard
Add a new liquidity section showing all five pools.

Each pool card shows:
- pool name
- total ETH liquidity
- total fees received
- user LP share
- user earned fees
- provide liquidity action

### Deposit
User selects a pool and enters an ETH amount.

The UI shows a plain-language summary:
- chosen pool
- ETH being deposited
- LP shares will be received
- fees are earned from router usage
- this is a Sepolia demo liquidity model

After confirmation:
- an on-chain deposit transaction is sent
- LP shares are recorded on-chain
- the dashboard refreshes pool and position data

### Fee Accrual
When a user sends a supported Sepolia demo token through the router:
- a configured fee portion is carved out in ETH
- that ETH is forwarded to the liquidity manager for the matching token pool
- LP providers earn ETH fees pro-rata by share ownership

### Claim
Users can claim accrued ETH fees from their position.

### Withdraw
Users can withdraw their ETH principal plus any already-accounted position value according to the simplified demo model.

## Fee Model
Use a simple fee basis points setting in the router, for example 30 bps.

For a supported token send:
- required ETH still funds the current router behavior
- a fee portion is forwarded to the liquidity manager
- fee accrual is tracked by pool

This creates real on-chain fee accounting without changing the swap price mechanics.

## UI Scope For Tonight
Build only a simple dashboard-facing liquidity view.

Required UI pieces:
- five pool cards
- provide-liquidity modal or panel
- user position summary
- claim-fees action
- withdraw-liquidity action
- pool/user refresh after transactions

Do not build:
- deep APR analytics
- token-side LP visuals
- Telegram liquidity commands
- advanced pool analytics

## Error Handling
Handle these cases explicitly:
- zero-value deposit
- insufficient ETH
- unsupported pool or token
- claim with zero earned fees
- withdraw without position
- stale UI after deposit/claim/withdraw
- router fee routing to an unregistered pool

## Testing Strategy
### Contract Tests
Add tests for:
- ETH-only deposit mints shares
- multiple providers get proportional shares
- router fee deposit updates pool fee accounting
- fee claim pays the right ETH amount
- liquidity withdrawal returns expected ETH
- unsupported pool operations revert cleanly

### Integration Verification
Minimum live Sepolia validation:
1. provide liquidity to one pool
2. execute a supported token send through the current router
3. confirm fee accrual increases for the pool
4. claim fees successfully

### UI Verification
Check that:
- all five pools render
- deposits refresh correctly
- fee claims refresh correctly
- withdrawals refresh correctly

## Demo Story For Presentation
Tomorrow’s demo should show:
1. open Walletrix dashboard
2. show five supported liquidity pools
3. deposit SepETH into one pool
4. execute a Sepolia token send using the existing router
5. return to liquidity view and show earned fees increased
6. claim fees on-chain

## Presentation Positioning
Describe this feature as:

"An on-chain demo liquidity layer built on top of Walletrix’s fixed-rate Sepolia router, where users provide ETH-backed liquidity to mock-token pools and earn ETH fees from router activity."

Avoid claiming:
- full production AMM
- real market-price discovery
- complete DEX-grade liquidity mechanics

## Recommendation
Proceed with:
- on-chain ETH-only liquidity manager
- support for all five mock-token pools
- fee routing from the current router
- simple dashboard UI only
- no AMM reserve-price rewrite
- no Telegram liquidity support tonight
