# Sepolia Auto-Swap Send Design

**Date:** March 29, 2026  
**Status:** Draft for review  
**Scope:** Sepolia-only demo flow for sending supported ERC-20 tokens using Sepolia ETH as the source asset

---

## Goal

Add a Sepolia demo flow where a user can hold only Sepolia ETH, choose a supported ERC-20 token in the existing send flow, and have Walletrix source that token from ETH automatically before sending it to the recipient.

The user should not need to pre-buy or pre-hold the token. The product story should be:

> You do not need to worry about swaps. Walletrix got you.

---

## Product Outcome

When the selected network is `ethereum-sepolia`:

- The dashboard should show **supported Sepolia tokens** instead of user-held mock token balances.
- Each supported token should display:
  - token name
  - symbol
  - a small predetermined demo USD price
  - a short status such as `Sendable from Sepolia ETH`
- The send modal should let the user choose `ETH` or one of the supported Sepolia tokens.
- If the user chooses a supported Sepolia token, Walletrix should explain that it will source the token from Sepolia ETH before sending.
- The review step should show:
  - token amount to be delivered
  - demo token price
  - ETH that will be spent
  - estimated gas
  - total ETH outflow

This is a Sepolia demo of frictionless token sending from ETH-backed value. It is not a production swap engine.

---

## Chosen Approach

Use a **fixed-rate Sepolia router contract** plus mock ERC-20 tokens.

### Why this approach

- It produces a real on-chain demo instead of a frontend-only illusion.
- It is much simpler and safer than building a mini AMM.
- It avoids external liquidity or third-party protocol dependencies.
- It is straightforward to explain in a project demo and in code review.

### Rejected alternatives

#### Mini AMM pool

Rejected for the first pass because it adds liquidity provisioning, slippage logic, and more contract risk than needed for the demo.

#### Backend-assisted fake swap

Rejected because it weakens the product architecture and makes the feature feel less trustworthy in a demo.

#### True collateralized borrow flow

Rejected because it requires position management, repay logic, health factors, and liquidation handling, which is far beyond the intended Sepolia demo scope.

---

## Contract Architecture

### 1. Mock ERC-20 tokens

Deploy a small set of Sepolia-only mock tokens.

Recommended first-pass set:

- `WUSD` with demo display price `$1.00`
- `WDAI` with demo display price `$1.00`
- `WLINK` with demo display price `$0.80`
- `WWBTC` with demo display price `$25.00`
- `WGLD` with demo display price `$2.50`

All demo tokens will use:

- `18 decimals`

Each token should:

- be a standard ERC-20
- use fixed metadata
- support an owner-only initial mint at deployment
- have enough minted supply allocated to the router inventory

### Canonical Sepolia demo pricing

Use a fixed Sepolia demo reference price of:

- `1 ETH = $2,000.00`

That produces the following canonical token sourcing rates:

| Token | Display price | ETH per 1 whole token | Wei per 1 whole token |
|-------|---------------|------------------------|------------------------|
| WUSD  | $1.00         | 0.0005 ETH             | 500000000000000        |
| WDAI  | $1.00         | 0.0005 ETH             | 500000000000000        |
| WLINK | $0.80         | 0.0004 ETH             | 400000000000000        |
| WWBTC | $25.00        | 0.0125 ETH             | 12500000000000000      |
| WGLD  | $2.50         | 0.00125 ETH            | 1250000000000000       |

These values are fixed for the demo and must be treated as the source of truth everywhere.

### Canonical mint and router inventory

To keep deployments and depletion tests deterministic, use these fixed seeded inventory values:

| Token | Initial mint amount | Seeded router inventory |
|-------|---------------------|-------------------------|
| WUSD  | 100000              | 100000                  |
| WDAI  | 100000              | 100000                  |
| WLINK | 50000               | 50000                   |
| WWBTC | 1000                | 1000                    |
| WGLD  | 20000               | 20000                   |

All values above are whole-token amounts and should be minted/transferred using 18 decimals.

The deployment script should mint exactly the listed amount for each token and seed exactly that full amount into the router inventory for the first pass.

### Canonical pricing formula and rounding

Store `weiPerToken` as the wei required for exactly one whole token, where one whole token means `10^decimals` base units.

For a requested token amount in base units:

`requiredWei = ceil(tokenAmountBaseUnits * weiPerToken / 10^decimals)`

Rules:

- contract math must always round **up** to the next wei
- frontend quote math must mirror the same formula
- review-step quotes must be derived from the same `weiPerToken` values
- tests must assert against the same canonical formula

### 2. Walletrix Sepolia router

Deploy a single payable router contract that:

- stores supported token metadata and fixed demo rates
- accepts Sepolia ETH from the sender
- calculates required ETH for the requested token amount
- transfers the requested token amount from router inventory directly to the recipient
- refunds any ETH sent above the required amount

The router is not a generic swap router. It is a Sepolia demo router for fixed-rate token sourcing.

### Router responsibilities

- validate that the requested token is supported
- validate that enough ETH was sent
- validate that enough token inventory exists
- transfer token amount to recipient
- refund excess ETH to sender

### Out of scope for router

- AMM logic
- dynamic pricing
- slippage protection
- real market discovery
- borrowing positions
- liquidation logic

---

## Shared Token Manifest

Use a single shared manifest as the source of truth for Sepolia token demo data.

It should contain:

- token name
- symbol
- decimals
- fixed demo USD price
- fixed `weiPerToken`
- Sepolia token address
- router address
- UI support metadata such as short description or badge text

The manifest should power:

- dashboard supported-token cards
- send modal token picker
- review step cost explanation
- router interaction parameters
- final deployment output for importing tokens into external wallets

The manifest should be simple enough to be reused by both frontend and backend/helpers if needed.

### Deployment artifact and manifest ownership

The deployment/bootstrap path must be explicit.

Use these two outputs:

1. A canonical deployment artifact generated by the contracts workspace:
   - `contracts/deployments/sepolia-auto-swap.sepolia.json`
2. A frontend-consumable generated manifest:
   - `frontend/lib/generated/sepoliaAutoSwapManifest.json`

The deployment script is responsible for:

- deploying all mock tokens
- deploying the router
- minting the initial mock token supply to the deployer
- transferring the seeded token inventory from the deployer to the router
- writing the final deployed token and router addresses into both generated outputs

The generated frontend manifest must contain the same canonical pricing data plus the newly deployed addresses so the UI and contract calls stay aligned after each deployment.

---

## Frontend Design

### Dashboard behavior on Sepolia

When `selectedNetwork === 'ethereum-sepolia'`:

- Keep ETH as the real balance-bearing asset in the portfolio hero.
- Replace the normal token-balance list with a **Supported Tokens** presentation.
- Do not show a user token balance for supported Sepolia mock tokens.
- Show each supported token with:
  - name
  - symbol
  - small demo USD price
  - availability/status text

Suggested status copy:

- `Sendable from Sepolia ETH`
- or a similar short variation consistent with the shell styling

When the selected network is not Sepolia, existing dashboard behavior should remain unchanged.

### Send modal behavior on Sepolia

The send modal should become the primary interaction surface for this feature.

When the selected network is `ethereum-sepolia`:

- the asset selection should allow:
  - `ETH`
  - all supported Sepolia tokens from the manifest
- selecting `ETH` should preserve the normal ETH send flow
- selecting a supported token should not require a token balance

If the user selects a supported Sepolia token, show supportive copy that makes the auto-swap value explicit:

> You don’t need to worry about swaps. Walletrix got you. We’ll source this token from your Sepolia ETH right before sending.

### Review step requirements

The confirm/review step should clearly show:

- recipient address
- chosen token and amount
- fixed demo conversion rate
- ETH required for token sourcing
- estimated gas
- total ETH outflow

The goal is to make the flow transparent without forcing the user to think about swapping mechanics.

### Preflight ETH sufficiency rule

The send modal must validate Sepolia ETH using:

`availableEthWei >= requiredWei + estimatedGasWei`

Where:

- `requiredWei` uses the canonical `weiPerToken` formula
- `estimatedGasWei = estimatedGasLimit * quotedGasPriceWei`

Gas estimation rules:

- estimate gas from the actual router call before confirmation
- get the quoted Sepolia gas price from the same provider/network quote used by the existing send flow
- if gas estimation cannot be produced, block submission and show a clear `Unable to estimate transaction cost right now` style error

The preflight rule must cover both token sourcing cost and gas, not just token sourcing.

---

## User Flow

### Supported token send on Sepolia

1. User selects the Sepolia network.
2. Dashboard shows supported Sepolia tokens with display prices, but no balances.
3. User opens the existing send modal.
4. User selects a supported token such as `WUSD`.
5. User enters recipient and token amount.
6. Walletrix calculates the ETH required based on the fixed demo rate.
7. Review step explains that Walletrix will source the token from Sepolia ETH.
8. User confirms the transaction.
9. Frontend sends a payable contract call to the router.
10. Router delivers the token to the recipient.
11. UI shows success with transaction hash and refreshes state.

### ETH send on Sepolia

ETH sends should continue to work through the normal path without involving the router.

---

## Data Flow

### Token send from ETH-backed value

1. Frontend reads the selected supported token from the manifest.
2. Frontend calculates required ETH for the token amount using the fixed rate.
3. Frontend builds the review step with token amount, ETH spend, gas, and total outflow.
4. On confirm, frontend calls the router contract with:
   - recipient
   - token address
   - token amount
   - ETH value
5. Router validates the request and transfers tokens to the recipient.
6. Router refunds excess ETH if overpayment occurred.
7. Frontend reports success and refreshes user-facing data.

### Deployment and bootstrap flow

1. Read the static Sepolia token catalog with token metadata and canonical pricing.
2. Deploy all mock ERC-20 tokens.
3. Deploy the Sepolia router.
4. Mint initial supply for each token to the deployment wallet.
5. Transfer the seeded inventory amount for each token into the router.
6. Write the canonical deployment artifact under `contracts/deployments/`.
7. Write the generated frontend manifest under `frontend/lib/generated/`.
8. Use that generated frontend manifest as the address source for dashboard cards and send flow interactions.

---

## Error Handling

### User-facing conditions

If a user attempts a Sepolia supported-token send:

- and does not have enough Sepolia ETH, show a clear insufficiency error
- and the router inventory for the token is too low, show `Temporarily unavailable`
- and the contract call fails, show a normal transaction failure with useful context

### Scope gates

This feature should be hidden or inactive when:

- the selected network is not `ethereum-sepolia`
- the chosen asset is not one of the supported Sepolia mock tokens

---

## Deliverables

At the end of implementation, provide a clean deployment output that includes:

- token name
- symbol
- decimals
- Sepolia token address
- router address
- fixed demo USD price
- fixed ETH conversion rate

This output should be easy to copy into MetaMask or another wallet so received tokens can be imported and verified externally.

---

## Testing Strategy

### Contract tests

Add contract coverage for:

- exact `requiredWei` calculation for supported tokens
- correct ETH required for a token amount
- successful token transfer to recipient
- refund of excess ETH
- revert on insufficient ETH
- revert on unsupported token
- revert on insufficient router inventory

### Frontend tests

Add focused coverage for:

- Sepolia dashboard showing supported tokens instead of token balances
- send modal showing the Sepolia token picker
- review step showing the ETH-backed sourcing explanation
- cost calculation for supported tokens
- normal non-Sepolia behavior remaining unchanged
- frontend quote math matching the canonical `weiPerToken` formula

### Integration sanity

Run a Sepolia sanity flow:

1. deploy mock tokens and router
2. record deployed addresses
3. send a supported token to a second wallet
4. import the token in that wallet using the deployed token address
5. verify receipt

---

## Non-Goals

This feature does **not** aim to provide:

- real market-priced swaps
- a production DEX router
- collateralized borrowing
- repayment flows
- liquidation logic
- cross-chain routing
- general-purpose token faucet UI

---

## Success Criteria

The feature is successful if:

- a user on Sepolia can hold only ETH
- choose a supported token in the send modal
- confirm a clear ETH-backed token sourcing review
- send the token successfully to another wallet
- import that token into another wallet using the deployed token address and see the received balance

That is the intended demo story for Walletrix.
