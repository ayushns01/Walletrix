# Sepolia Auto-Swap Send Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Sepolia-only flow where Walletrix users can send supported mock ERC-20 tokens from their Sepolia ETH balance through a fixed-rate router, while the dashboard shows supported tokens and the final deployment output includes importable token addresses.

**Architecture:** A Foundry-based Sepolia router contract will hold seeded inventory of mock ERC-20s and accept payable ETH-backed token send requests. A deployment script will generate both a contract deployment artifact and a frontend manifest with the canonical token metadata, demo pricing, and deployed addresses. The frontend will read that generated manifest to render supported tokens on Sepolia and extend the existing send modal to quote and submit router-backed token sends.

**Tech Stack:** Solidity 0.8.28, Foundry, ethers v6, Next.js 14, React, node:test

---

## File Structure

### Contracts and deployment

- Create: `contracts/src/mocks/WalletrixMockERC20.sol`
  - Fixed-metadata mock ERC-20 used only for the Sepolia demo.
- Create: `contracts/src/WalletrixSepoliaRouter.sol`
  - Payable fixed-rate router that receives ETH, transfers seeded tokens, and refunds overpayment.
- Create: `contracts/test/WalletrixSepoliaRouter.t.sol`
  - Foundry tests for router math, token delivery, refund behavior, and failure cases.
- Create: `contracts/script/DeploySepoliaAutoSwap.s.sol`
  - Forge deployment/bootstrap script for tokens, router, inventory seeding, and JSON output writing.
- Create: `contracts/config/sepoliaAutoSwapCatalog.json`
  - The single static shared manifest source of truth for token metadata, canonical rates, UI support metadata, mint amounts, and seeded inventory.
- Create: `contracts/deployments/sepolia-auto-swap.sepolia.json`
  - Generated deployment artifact; checked in after Sepolia deployment so addresses are reproducible.

### Frontend manifest and helpers

- Create: `frontend/lib/generated/sepoliaAutoSwapManifest.json`
  - Generated frontend-consumable output derived from the static shared catalog plus deployed addresses. This is not the canonical source file.
- Create: `frontend/lib/sepoliaAutoSwapManifest.mjs`
  - The single frontend owner for loading and normalizing the generated Sepolia manifest. `Dashboard.js`, `SendModal.js`, and any page handoff code must consume this module instead of parsing the JSON independently.
- Create: `frontend/lib/sepoliaAutoSwap.mjs`
  - Pure helpers for Sepolia detection, token lists, `requiredWei` quote math, and preflight ETH sufficiency.
- Create: `frontend/lib/sepoliaAutoSwapViewModels.mjs`
  - Pure UI-facing builders for dashboard supported-token cards, send-modal token picker options, and review-step copy/data.
- Create: `frontend/tests/sepoliaAutoSwap.test.mjs`
  - `node:test` coverage for quote math, supported-token list shaping, and ETH sufficiency calculation.
- Create: `frontend/tests/sepoliaAutoSwapUi.test.mjs`
  - `node:test` coverage for dashboard-facing token presentation, send-modal option lists, review-step copy, and non-Sepolia regression behavior.

### Frontend integration

- Modify: `frontend/lib/api.js`
  - Add a direct ethers-based router send helper for Sepolia auto-swap transactions.
- Modify: `frontend/components/Dashboard.js`
  - Render supported tokens on Sepolia instead of token balances and show fixed demo prices.
- Modify: `frontend/components/SendModal.js`
  - Add Sepolia token picker, supportive swap copy, router quote display, and router-backed transaction submission.
- Modify: `frontend/app/page.js`
  - Keep page ownership narrow: pass only selected network and selected asset context into the send modal. Do not let `page.js` compute Sepolia token lists, router addresses, or quote math.

### Documentation

- Modify: `README.md`
  - Document the Sepolia auto-swap demo lane and where the generated token/router addresses live.
- Create or modify as needed: `contracts/README.md`
  - Add deployment and verification commands for the Sepolia auto-swap demo.

---

## Task 1: Add the Canonical Sepolia Catalog and Frontend Quote Helpers

**Files:**
- Create: `contracts/config/sepoliaAutoSwapCatalog.json`
- Create: `frontend/lib/sepoliaAutoSwap.mjs`
- Create: `frontend/lib/sepoliaAutoSwapManifest.mjs`
- Test: `frontend/tests/sepoliaAutoSwap.test.mjs`

- [ ] **Step 1: Write the failing frontend helper tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isSepoliaAutoSwapNetwork,
  calculateRequiredWei,
  canAffordSepoliaAutoSwap,
} from '../lib/sepoliaAutoSwap.mjs';

test('calculateRequiredWei rounds up using weiPerToken and 18 decimals', () => {
  const result = calculateRequiredWei({
    amount: '1.5',
    decimals: 18,
    weiPerToken: '500000000000000',
  });

  assert.equal(result.toString(), '750000000000000');
});

test('canAffordSepoliaAutoSwap requires token cost plus estimated gas', () => {
  assert.equal(
    canAffordSepoliaAutoSwap({
      availableEthWei: '2000000000000000',
      requiredWei: '750000000000000',
      estimatedGasWei: '210000000000000',
    }),
    true
  );
});
```

- [ ] **Step 2: Run the helper tests to verify they fail**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwap.test.mjs
```

Expected:
- FAIL because the helper module does not exist yet

- [ ] **Step 3: Create the single static shared Sepolia catalog**

Create `contracts/config/sepoliaAutoSwapCatalog.json` with the exact canonical values from the spec:

```json
{
  "network": "ethereum-sepolia",
  "ethUsdReference": "2000.00",
  "tokens": [
    {
      "name": "Walletrix USD",
      "symbol": "WUSD",
      "decimals": 18,
      "displayPriceUsd": "1.00",
      "weiPerToken": "500000000000000",
      "availabilityLabel": "Sendable from Sepolia ETH",
      "shortDescription": "Stable-value demo dollar token for ETH-backed sends.",
      "initialMintWholeTokens": "100000",
      "seededRouterInventoryWholeTokens": "100000"
    },
    {
      "name": "Walletrix DAI",
      "symbol": "WDAI",
      "decimals": 18,
      "displayPriceUsd": "1.00",
      "weiPerToken": "500000000000000",
      "availabilityLabel": "Sendable from Sepolia ETH",
      "shortDescription": "Stable-value demo DAI lane for frictionless token sends.",
      "initialMintWholeTokens": "100000",
      "seededRouterInventoryWholeTokens": "100000"
    },
    {
      "name": "Walletrix LINK",
      "symbol": "WLINK",
      "decimals": 18,
      "displayPriceUsd": "0.80",
      "weiPerToken": "400000000000000",
      "availabilityLabel": "Sendable from Sepolia ETH",
      "shortDescription": "Low-cost utility token demo sourced directly from ETH.",
      "initialMintWholeTokens": "50000",
      "seededRouterInventoryWholeTokens": "50000"
    },
    {
      "name": "Walletrix WBTC",
      "symbol": "WWBTC",
      "decimals": 18,
      "displayPriceUsd": "25.00",
      "weiPerToken": "12500000000000000",
      "availabilityLabel": "Sendable from Sepolia ETH",
      "shortDescription": "High-value demo asset showing larger ETH-backed token sends.",
      "initialMintWholeTokens": "1000",
      "seededRouterInventoryWholeTokens": "1000"
    },
    {
      "name": "Walletrix Gold",
      "symbol": "WGLD",
      "decimals": 18,
      "displayPriceUsd": "2.50",
      "weiPerToken": "1250000000000000",
      "availabilityLabel": "Sendable from Sepolia ETH",
      "shortDescription": "Branded Walletrix demo asset for polished Sepolia showcases.",
      "initialMintWholeTokens": "20000",
      "seededRouterInventoryWholeTokens": "20000"
    }
  ]
}
```

- [ ] **Step 4: Implement the minimal frontend helper module**

Create `frontend/lib/sepoliaAutoSwap.mjs` with:

- `isSepoliaAutoSwapNetwork(selectedNetwork)`
- `calculateRequiredWei({ amount, decimals, weiPerToken })`
- `calculateEstimatedTotalWei({ requiredWei, estimatedGasWei })`
- `canAffordSepoliaAutoSwap({ availableEthWei, requiredWei, estimatedGasWei })`
- `getSupportedSepoliaTokens(manifest)`

Use `BigInt` for all wei math and round up exactly as defined in the spec.

- [ ] **Step 5: Add the shared frontend manifest loader**

Create `frontend/lib/sepoliaAutoSwapManifest.mjs` so there is one explicit owner for:

- importing `frontend/lib/generated/sepoliaAutoSwapManifest.json`
- validating the top-level shape
- validating per-token UI support metadata such as:
  - `availabilityLabel`
  - `shortDescription`
- returning a normalized object for the rest of the frontend

Keep `Dashboard.js`, `SendModal.js`, and any page-level handoff code from importing the generated JSON directly.

- [ ] **Step 6: Run the helper tests to verify they pass**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwap.test.mjs
```

Expected:
- PASS for all helper tests

- [ ] **Step 7: Commit**

```bash
git add contracts/config/sepoliaAutoSwapCatalog.json frontend/lib/sepoliaAutoSwap.mjs frontend/lib/sepoliaAutoSwapManifest.mjs frontend/tests/sepoliaAutoSwap.test.mjs
git commit -m "feat: add Sepolia auto-swap catalog and quote helpers"
```

---

## Task 2: Write Failing Contract Tests for the Sepolia Router

**Files:**
- Create: `contracts/test/WalletrixSepoliaRouter.t.sol`
- Test: `contracts/test/WalletrixSepoliaRouter.t.sol`

- [ ] **Step 1: Write the failing Foundry tests**

Add tests covering:

- exact `requiredWei` math for supported tokens
- fixed `18 decimals` on the mock token
- owner-only `mint` on the mock token
- successful token delivery to the recipient
- refund of excess ETH
- revert on insufficient ETH
- revert on unsupported token
- revert on insufficient router inventory

Example skeleton:

```solidity
function test_QuoteRoundsUpForFractionalTokenAmount() public view {
    uint256 requiredWei = router.quoteRequiredWei(address(wusd), 1.5 ether);
    assertEq(requiredWei, 750000000000000);
}

function test_SwapAndSendTransfersTokensToRecipient() public {
    vm.deal(sender, 10 ether);

    vm.prank(sender);
    router.swapAndSend{value: 750000000000000}(address(wusd), recipient, 1.5 ether);

    assertEq(wusd.balanceOf(recipient), 1.5 ether);
}
```

- [ ] **Step 2: Run the router tests to verify they fail**

Run:

```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts
forge test --match-contract WalletrixSepoliaRouterTest
```

Expected:
- FAIL because router and token contracts do not exist yet

- [ ] **Step 3: Commit the failing tests**

```bash
git add contracts/test/WalletrixSepoliaRouter.t.sol
git commit -m "test: add failing tests for Sepolia auto-swap router"
```

---

## Task 3: Implement the Mock ERC-20 and Sepolia Router Contracts

**Files:**
- Create: `contracts/src/mocks/WalletrixMockERC20.sol`
- Create: `contracts/src/WalletrixSepoliaRouter.sol`
- Test: `contracts/test/WalletrixSepoliaRouter.t.sol`

- [ ] **Step 1: Implement the mock ERC-20 contract**

Use OpenZeppelin ERC-20 as the base and expose only the minimum needed:

- constructor for `name`, `symbol`, and initial owner
- fixed `18 decimals`
- owner-only `mint(address to, uint256 amount)`

- [ ] **Step 2: Implement the router contract minimally to satisfy the tests**

The router should support:

- immutable or configured owner
- per-token support configuration
- per-token `weiPerToken`
- `quoteRequiredWei(address token, uint256 amountBaseUnits) view returns (uint256)`
- `swapAndSend(address token, address recipient, uint256 amountBaseUnits) payable`
- refund of `msg.value - requiredWei`

Suggested constructor shape:

```solidity
constructor(
    address owner_,
    address[] memory supportedTokens_,
    uint256[] memory weiPerToken_
) { ... }
```

- [ ] **Step 3: Re-run the router test target**

Run:

```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts
forge test --match-contract WalletrixSepoliaRouterTest
```

Expected:
- PASS for the new router contract tests

- [ ] **Step 4: Run the full contract suite**

Run:

```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts
forge test
```

Expected:
- PASS for the router tests
- no regressions in existing vault tests

- [ ] **Step 5: Commit**

```bash
git add contracts/src/mocks/WalletrixMockERC20.sol contracts/src/WalletrixSepoliaRouter.sol contracts/test/WalletrixSepoliaRouter.t.sol
git commit -m "feat: implement Sepolia auto-swap router contracts"
```

---

## Task 4: Add the Sepolia Deployment and Manifest Generation Pipeline

**Files:**
- Create: `contracts/script/DeploySepoliaAutoSwap.s.sol`
- Create: `contracts/deployments/sepolia-auto-swap.sepolia.json`
- Create: `frontend/lib/generated/sepoliaAutoSwapManifest.json`
- Modify: `contracts/README.md`
- Test: `frontend/tests/sepoliaAutoSwapManifestShape.test.mjs`

- [ ] **Step 1: Write a failing deployment-output test**

Because there is no existing deployment test harness, write a small `node:test` file that asserts the generated manifest and deployment artifact match the canonical checked-in catalog content after deployment.

Create:
- `frontend/tests/sepoliaAutoSwapManifestShape.test.mjs`

Example:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('generated Sepolia manifest preserves canonical token metadata and includes deployed addresses', () => {
  const manifest = JSON.parse(readFileSync(new URL('../lib/generated/sepoliaAutoSwapManifest.json', import.meta.url), 'utf8'));
  const catalog = JSON.parse(readFileSync(new URL('../../contracts/config/sepoliaAutoSwapCatalog.json', import.meta.url), 'utf8'));
  const deployment = JSON.parse(readFileSync(new URL('../../contracts/deployments/sepolia-auto-swap.sepolia.json', import.meta.url), 'utf8'));

  assert.equal(manifest.tokens.length, 5);
  assert.equal(manifest.tokens.length, catalog.tokens.length);
  assert.ok(manifest.router?.address);
  assert.ok(manifest.tokens.every((token) => token.address));
  assert.equal(deployment.router.address, manifest.router.address);
});
```

- [ ] **Step 2: Run the manifest-shape test to verify it fails**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwapManifestShape.test.mjs
```

Expected:
- FAIL because the generated frontend manifest and deployment artifact do not exist yet

- [ ] **Step 3: Implement the Forge deployment/bootstrap script**

Create `contracts/script/DeploySepoliaAutoSwap.s.sol` that:

- reads `contracts/config/sepoliaAutoSwapCatalog.json`
- deploys all mock tokens
- deploys the router
- mints the exact initial whole-token amounts from the spec
- transfers the exact seeded inventory into the router
- writes `contracts/deployments/sepolia-auto-swap.sepolia.json`
- writes `frontend/lib/generated/sepoliaAutoSwapManifest.json` from the static catalog plus deployed router/token addresses

Use deterministic JSON keys so the frontend manifest is stable across deployments.
The generated frontend manifest must include, per token:

- `name`
- `symbol`
- `decimals`
- `displayPriceUsd`
- `weiPerToken`
- `availabilityLabel`
- `shortDescription`
- deployed `address`

Use explicit Foundry JSON I/O helpers in the script:

- `vm.readFile`
- `vm.parseJson`
- `vm.serializeString`
- `vm.serializeUint`
- `vm.serializeAddress`
- `vm.writeJson`

- [ ] **Step 4: Run a non-broadcast dry run first**

Run:

```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts
forge script script/DeploySepoliaAutoSwap.s.sol:DeploySepoliaAutoSwap --rpc-url $ETHEREUM_SEPOLIA_RPC -vvv
```

Expected:
- dry-run completes without revert
- deployment artifact writing path is exercised
- updated manifest writing path is exercised

- [ ] **Step 5: Run the Sepolia deployment script**

Run:

```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts
forge script script/DeploySepoliaAutoSwap.s.sol:DeploySepoliaAutoSwap --rpc-url $ETHEREUM_SEPOLIA_RPC --broadcast
```

Expected:
- token contracts deployed
- router deployed
- contract deployment artifact written
- frontend generated manifest written

- [ ] **Step 6: Run the manifest-shape test again**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwapManifestShape.test.mjs
```

Expected:
- PASS

- [ ] **Step 7: Add explicit cross-file content checks**

Extend the same test file to compare:

- `contracts/config/sepoliaAutoSwapCatalog.json`
- `contracts/deployments/sepolia-auto-swap.sepolia.json`
- `frontend/lib/generated/sepoliaAutoSwapManifest.json`

Assert that:

- token symbols match exactly against the five canonical symbols
- `decimals` match exactly
- `displayPriceUsd` matches exactly
- `weiPerToken` matches exactly
- `availabilityLabel` matches exactly
- `shortDescription` matches exactly
- router address exists in both deployment outputs

- [ ] **Step 8: Re-run the manifest verification**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwapManifestShape.test.mjs
```

Expected:
- PASS with content equality, not just shape
- [ ] **Step 9: Document the deploy flow**

Add to `contracts/README.md`:

- required env vars
- deploy command
- verification commands for checking:
  - deployed router address
  - generated manifest contents
  - token import readiness in a second wallet
- where the generated manifest lands
- how to import tokens into another wallet after deployment

- [ ] **Step 10: Commit**

```bash
git add contracts/script/DeploySepoliaAutoSwap.s.sol contracts/deployments/sepolia-auto-swap.sepolia.json frontend/lib/generated/sepoliaAutoSwapManifest.json frontend/tests/sepoliaAutoSwapManifestShape.test.mjs contracts/README.md
git commit -m "feat: add Sepolia auto-swap deployment pipeline"
```

---

## Task 5: Show Supported Sepolia Tokens on the Dashboard

**Files:**
- Modify: `frontend/components/Dashboard.js`
- Modify: `frontend/lib/sepoliaAutoSwap.mjs`
- Modify: `frontend/lib/sepoliaAutoSwapManifest.mjs`
- Create: `frontend/lib/sepoliaAutoSwapViewModels.mjs`
- Test: `frontend/tests/sepoliaAutoSwap.test.mjs`
- Test: `frontend/tests/sepoliaAutoSwapUi.test.mjs`

- [ ] **Step 1: Write failing UI-behavior tests for dashboard token presentation**

Add `node:test` coverage in `frontend/tests/sepoliaAutoSwapUi.test.mjs` for the Sepolia dashboard view-model:

- Sepolia returns supported tokens from the generated manifest
- non-Sepolia keeps the normal token list behavior signal
- supported tokens expose display price and availability text
- supported tokens expose the manifest-provided short description or badge metadata
- supported tokens do not expose balances

Example:

```js
test('supported Sepolia tokens expose fixed demo prices with no balances', () => {
  const assets = buildSepoliaDashboardRows(manifest);
  assert.equal(assets[0].showBalance, false);
  assert.equal(assets[0].displayPriceUsd, '1.00');
});
```

- [ ] **Step 2: Run the UI-behavior tests to verify the new assertions fail**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwapUi.test.mjs
```

Expected:
- FAIL on the new presentation assertions

- [ ] **Step 3: Add the shared dashboard/send view-model helper**

Create `frontend/lib/sepoliaAutoSwapViewModels.mjs` with pure builders for:

- `buildSepoliaDashboardRows(manifest)`
- `buildSepoliaSendTokenOptions(manifest)`
- `buildSepoliaReviewModel(...)`

For dashboard rows include:

- `name`
- `symbol`
- `displayPriceUsd`
- `availabilityLabel`
- `shortDescription`
- `showBalance: false`

- [ ] **Step 4: Update `Dashboard.js` to render supported Sepolia tokens**

Implementation requirements:

- keep ETH as the real primary asset in the hero
- on `ethereum-sepolia`, load the manifest through `frontend/lib/sepoliaAutoSwapManifest.mjs`
- build rows through `frontend/lib/sepoliaAutoSwapViewModels.mjs`
- swap the token-balance rendering for the supported-token presentation
- show fixed demo prices
- do not show mock-token balances
- leave non-Sepolia behavior unchanged

- [ ] **Step 5: Re-run the UI-behavior tests**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwapUi.test.mjs
```

Expected:
- PASS

- [ ] **Step 6: Build the frontend**

Run:

```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend
npm run build
```

Expected:
- PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/components/Dashboard.js frontend/lib/sepoliaAutoSwapManifest.mjs frontend/lib/sepoliaAutoSwapViewModels.mjs frontend/tests/sepoliaAutoSwapUi.test.mjs
git commit -m "feat: show supported Sepolia tokens on dashboard"
```

---

## Task 6: Extend the Send Modal for Sepolia Auto-Swap Quotes and Submission

**Files:**
- Modify: `frontend/components/SendModal.js`
- Modify: `frontend/lib/api.js`
- Modify: `frontend/app/page.js`
- Modify: `frontend/lib/sepoliaAutoSwap.mjs`
- Modify: `frontend/lib/sepoliaAutoSwapManifest.mjs`
- Modify: `frontend/lib/sepoliaAutoSwapViewModels.mjs`
- Test: `frontend/tests/sepoliaAutoSwap.test.mjs`
- Test: `frontend/tests/sepoliaAutoSwapUi.test.mjs`

- [ ] **Step 1: Extend the failing helper tests for send-flow math**

Add tests for:

- supported Sepolia token quote uses canonical `weiPerToken`
- sufficiency requires token cost plus gas
- insufficient ETH fails the preflight rule
- gas-estimation failure produces a blocked-send state or explicit error result
- ETH itself does not route through the auto-swap helper path

Example:

```js
test('auto-swap quote includes sourcing plus estimated gas', () => {
  const total = calculateEstimatedTotalWei({
    requiredWei: '750000000000000',
    estimatedGasWei: '210000000000000'
  });

  assert.equal(total.toString(), '960000000000000');
});
```

- [ ] **Step 2: Run the helper tests to verify the new assertions fail**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwap.test.mjs
```

Expected:
- FAIL on the new send-flow assertions

- [ ] **Step 3: Add the router transaction helper to `frontend/lib/api.js`**

Add a helper such as:

```js
sendSepoliaAutoSwapTransaction(privateKey, routerAddress, tokenAddress, recipient, amountBaseUnits, options = {})
```

Implementation requirements:

- use ethers v6
- connect to Sepolia RPC
- estimate gas for the actual router call
- use the same Sepolia gas quote source as the existing Ethereum send flow by reading `blockchainAPI.getGasPrice('sepolia')` for `quotedGasPriceWei`
- send a payable transaction with the quoted ETH value
- return the same success/error structure as the existing transaction helpers

- [ ] **Step 4: Update the send modal for Sepolia supported-token selection**

Requirements:

- on `ethereum-sepolia`, load token/router data only through `frontend/lib/sepoliaAutoSwapManifest.mjs`
- build token picker options and review-step display data through `frontend/lib/sepoliaAutoSwapViewModels.mjs`
- let the user choose `ETH` or supported tokens from the generated manifest
- if a supported token is selected, show:
  - supportive copy: `You don’t need to worry about swaps. Walletrix got you.`
  - recipient address
  - fixed demo token price
  - fixed conversion rate derived from `weiPerToken`
  - token amount the recipient will receive
  - ETH required for token sourcing
  - estimated gas
  - total ETH outflow
- preflight-check ETH with:
  - `availableEthWei >= requiredWei + estimatedGasWei`
- if gas estimation fails, block submission with a clear error
- keep ETH sends on the existing path

- [ ] **Step 5: Write failing UI-behavior tests for the send modal**

Add `node:test` coverage in `frontend/tests/sepoliaAutoSwapUi.test.mjs` for:

- Sepolia token picker options
- review-step copy including `Walletrix got you`
- review-step recipient address
- review-step fixed demo token price
- review-step fixed conversion rate
- review-step token sourcing ETH, estimated gas, and total outflow
- non-Sepolia regression where the extra Sepolia token options are absent

These tests should target the view-model outputs consumed by the modal so the Sepolia UI behavior remains deterministic without adding a new browser test framework.

- [ ] **Step 6: Run the UI-behavior tests to verify they fail**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwapUi.test.mjs
```

Expected:
- FAIL on the new token-picker or review-copy assertions

- [ ] **Step 7: Keep page-level send integration compatible**

Update `frontend/app/page.js` only if needed so the send modal always receives enough asset metadata for:

- ETH sends
- supported Sepolia token sends
- existing non-Sepolia sends

Boundary contract for `frontend/app/page.js`:

- it may pass the initially selected asset
- it may pass the current selected network
- it must not load the generated manifest
- it must not compute supported Sepolia token options
- it must not compute router quotes or fee math

Avoid broad rewrites here; keep the page changes minimal.

- [ ] **Step 8: Re-run the helper tests**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwap.test.mjs
```

Expected:
- PASS

- [ ] **Step 9: Re-run the UI-behavior tests**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwapUi.test.mjs
```

Expected:
- PASS

- [ ] **Step 10: Build the frontend**

Run:

```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend
npm run build
```

Expected:
- PASS

- [ ] **Step 11: Commit**

```bash
git add frontend/components/SendModal.js frontend/lib/api.js frontend/app/page.js frontend/lib/sepoliaAutoSwap.mjs frontend/lib/sepoliaAutoSwapManifest.mjs frontend/lib/sepoliaAutoSwapViewModels.mjs frontend/tests/sepoliaAutoSwap.test.mjs frontend/tests/sepoliaAutoSwapUi.test.mjs
git commit -m "feat: add Sepolia auto-swap send flow"
```

---

## Task 7: Final Verification and Project Documentation

**Files:**
- Modify: `README.md`
- Modify as needed: `contracts/README.md`
- Verify generated file: `frontend/lib/generated/sepoliaAutoSwapManifest.json`

- [ ] **Step 1: Document the feature in the main README**

Add:

- what the Sepolia auto-swap demo does
- that it is fixed-rate and Sepolia-only
- where the generated token/router addresses live
- how to import the supported tokens into another wallet

- [ ] **Step 2: Run the focused frontend tests**

Run:

```bash
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwap.test.mjs
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwapManifestShape.test.mjs
node --test /Users/ayushns01/Desktop/Repositories/Walletrix/frontend/tests/sepoliaAutoSwapUi.test.mjs
```

Expected:
- PASS

- [ ] **Step 3: Run the contract tests**

Run:

```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts
forge test --match-contract WalletrixSepoliaRouterTest
forge test
```

Expected:
- PASS

- [ ] **Step 4: Run the frontend production build**

Run:

```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend
npm run build
```

Expected:
- PASS

- [ ] **Step 5: Manual Sepolia sanity check**

Verify manually:

1. Select `Ethereum Sepolia`
2. Open the dashboard and confirm supported tokens appear without balances
3. Open the send modal and choose a supported token
4. Confirm the review step explains ETH-backed sourcing
5. Send a supported token to a second wallet
6. Import the token into the second wallet using the generated token address
7. Confirm receipt

- [ ] **Step 6: Commit**

```bash
git add README.md contracts/README.md
git commit -m "docs: describe Sepolia auto-swap demo flow"
```

---

## Notes for the Implementer

- Keep the generated frontend manifest checked in after Sepolia deployment so the UI has stable addresses.
- Do not add a separate faucet panel or fake token balances.
- Do not add AMM logic, liquidity pools, or borrowing/liquidation behavior.
- Keep all wei math in helpers and contracts aligned to the exact same formula.
- Prefer small helper extraction over cramming math directly into `SendModal.js`.
