# Sepolia Liquidity Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an on-chain Sepolia demo liquidity layer so users can deposit only SepETH into any of the five mock-token pools, accrue router-generated ETH fees, and claim or withdraw through the dashboard without changing the current fixed-rate swap math.

**Architecture:** Keep `WalletrixSepoliaRouter` as the current fixed-rate token delivery engine and add a separate `WalletrixSepoliaLiquidityManager` contract for LP accounting and fee distribution. The router forwards a small ETH fee for supported token sends into the matching pool, while the frontend reads liquidity state from chain and exposes provide/claim/withdraw actions only on the Sepolia dashboard.

**Tech Stack:** Solidity + Foundry, Next.js/React, ethers v6, existing Sepolia manifest/config pipeline, Clerk-authenticated frontend wallet context.

---

## File Map

### Contracts
- Create: `contracts/src/WalletrixSepoliaLiquidityManager.sol`
  - Pool registry, ETH-only deposits, LP share accounting, fee-per-share accounting, claim, withdraw.
- Modify: `contracts/src/WalletrixSepoliaRouter.sol`
  - Add configurable fee BPS, liquidity-manager hook, supported-token fee forwarding, and owner setters guarded so current send flow stays intact.
- Modify: `contracts/script/DeploySepoliaAutoSwap.s.sol`
  - Deploy liquidity manager, register all five pools, connect router -> manager, and write both addresses into deployment artifacts.
- Modify: `contracts/config/sepoliaAutoSwapCatalog.json` only if new metadata keys are required for UI labels.

### Contract Tests
- Create: `contracts/test/WalletrixSepoliaLiquidityManager.t.sol`
  - Deposit, multi-provider share split, fee distribution, claim, withdraw, invalid pool/zero deposit cases.
- Modify: `contracts/test/WalletrixSepoliaRouter.t.sol`
  - Verify router fee forwarding, legacy swap flow still works, fee-disabled path still behaves, unsupported token behavior unchanged.

### Shared Manifest / Frontend Reads
- Modify: `contracts/deployments/sepolia-auto-swap.sepolia.json`
  - Written by deployment script once live deployment is rerun.
- Modify: `frontend/lib/generated/sepoliaAutoSwapManifest.json`
  - Generated output should include liquidity manager address and any pool metadata required by the UI.
- Modify: `frontend/lib/sepoliaAutoSwapManifest.mjs`
  - Validate the added liquidity-manager shape.
- Create: `frontend/lib/sepoliaLiquidity.mjs`
  - Pure helpers for pool list derivation, LP share formatting, fee formatting, and parsing on-chain results into dashboard-friendly models.
- Create: `frontend/lib/sepoliaLiquidityExecution.mjs`
  - Build calldata + transaction plan helpers for deposit, claim, and withdraw against the new liquidity manager.
- Modify: `frontend/lib/api.js`
  - Add `quoteSepoliaLiquidityAction`, `provideSepoliaLiquidity`, `claimSepoliaLiquidityFees`, and `withdrawSepoliaLiquidity` using ethers.

### Frontend State + UI
- Modify: `frontend/contexts/DatabaseWalletContext.js`
  - Load Sepolia liquidity pools/positions when `selectedNetwork === 'ethereum-sepolia'`, refresh after actions, expose liquidity state and action helpers.
- Create: `frontend/components/SepoliaLiquidityPanel.js`
  - Render all five pools, user positions, earned fees, and action buttons.
- Create: `frontend/components/SepoliaLiquidityModal.js`
  - Reusable modal for deposit/claim/withdraw with plain-language confirmation.
- Modify: `frontend/components/Dashboard.js`
  - Mount the liquidity panel in the Sepolia dashboard only.
- Optionally modify: `frontend/app/globals.css`
  - Only if the new panel/modal needs small shell-consistent styling hooks not expressible via existing classes.

### Frontend Tests
- Create: `frontend/tests/sepoliaLiquidity.test.mjs`
  - Helper/model tests for pool derivation and fee/share formatting.
- Create: `frontend/tests/sepoliaLiquidityExecution.test.mjs`
  - Execution-plan tests for deposit/claim/withdraw calldata and value rules.
- Modify: `frontend/tests/sepoliaAutoSwapManifestShape.test.mjs`
  - Assert liquidity manager data exists in generated manifest.

---

### Task 1: Build the Liquidity Manager Contract Under TDD

**Files:**
- Create: `contracts/src/WalletrixSepoliaLiquidityManager.sol`
- Create: `contracts/test/WalletrixSepoliaLiquidityManager.t.sol`

- [ ] **Step 1: Write the failing contract tests for pool registration, ETH-only deposits, fee accrual, claim, and withdraw**

```solidity
function test_DepositEthOnlyMintsSharesForSelectedPool() public {
    liquidityManager.depositLiquidity{value: 1 ether}(address(wgld));
    (uint256 depositedEth, uint256 shares,,) = liquidityManager.getPosition(address(wgld), lpProvider);
    assertEq(depositedEth, 1 ether);
    assertEq(shares, 1 ether);
}

function test_FeeDistributionIsSharedProRataAcrossProviders() public {
    // two providers deposit, router injects fee, each claims proportional ETH
}
```

- [ ] **Step 2: Run Foundry tests to verify the new tests fail for the expected reason**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts && forge test --offline --match-contract WalletrixSepoliaLiquidityManagerTest`
Expected: FAIL because the liquidity manager contract and functions do not exist yet.

- [ ] **Step 3: Implement the minimal liquidity manager contract**

Add a focused contract with:
- pool registration for the five supported mock tokens
- `depositLiquidity(address token)` payable
- `depositFees(address token)` payable, callable only by the router
- `claimFees(address token)`
- `withdrawLiquidity(address token, uint256 shareAmount)`
- `getPool(address token)` and `getPosition(address token, address provider)` views

Use share accounting + accumulated fee per share in ETH. Keep storage minimal and strictly pool-scoped.

- [ ] **Step 4: Re-run the contract tests until they pass**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts && forge test --offline --match-contract WalletrixSepoliaLiquidityManagerTest`
Expected: PASS with coverage for deposit, claim, and withdraw paths.

- [ ] **Step 5: Commit the liquidity manager contract work**

```bash
git add contracts/src/WalletrixSepoliaLiquidityManager.sol contracts/test/WalletrixSepoliaLiquidityManager.t.sol
git commit -m "feat: add sepolia liquidity manager"
```

### Task 2: Extend the Existing Router to Forward Pool Fees Without Breaking Send Flow

**Files:**
- Modify: `contracts/src/WalletrixSepoliaRouter.sol`
- Modify: `contracts/test/WalletrixSepoliaRouter.t.sol`

- [ ] **Step 1: Write failing router tests for fee forwarding and fee-disabled safety**

```solidity
function test_SwapAndSendForwardsFeeToLiquidityManager() public {
    router.setLiquidityManager(address(liquidityManager));
    router.setFeeBps(30);
    router.swapAndSend{value: requiredWei}(address(wgld), recipient, amount);
    assertEq(address(liquidityManager).balance, expectedFeeWei);
}

function test_SwapAndSendStillWorksWhenLiquidityManagerIsUnset() public {
    router.swapAndSend{value: requiredWei}(address(wusd), recipient, amount);
    assertEq(wusd.balanceOf(recipient), amount);
}
```

- [ ] **Step 2: Run the router test subset and confirm the new assertions fail correctly**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts && forge test --offline --match-contract WalletrixSepoliaRouterTest`
Expected: FAIL on missing fee-routing config and assertions.

- [ ] **Step 3: Implement the smallest router changes needed**

Add:
- owner-settable `liquidityManager` address
- owner-settable `feeBps`
- `feeBps` bounds check (e.g. cap at 1000)
- fee calculation inside `swapAndSend`
- forwarding to `liquidityManager.depositFees(token)` only when configured and fee > 0
- preserve current refund logic and token transfer logic

Do not change the quote function or token pricing math.

- [ ] **Step 4: Re-run router tests and confirm all legacy swap assertions remain green**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts && forge test --offline --match-contract WalletrixSepoliaRouterTest`
Expected: PASS including old token-send scenarios and new fee-routing assertions.

- [ ] **Step 5: Commit the router fee-routing changes**

```bash
git add contracts/src/WalletrixSepoliaRouter.sol contracts/test/WalletrixSepoliaRouter.t.sol
git commit -m "feat: route sepolia swap fees to liquidity pools"
```

### Task 3: Update Deployment and Manifest Outputs for the New Contract Shape

**Files:**
- Modify: `contracts/script/DeploySepoliaAutoSwap.s.sol`
- Modify: `frontend/lib/sepoliaAutoSwapManifest.mjs`
- Test: `frontend/tests/sepoliaAutoSwapManifestShape.test.mjs`

- [ ] **Step 1: Write/extend manifest-shape tests to require liquidity manager data**

```javascript
test('generated manifest includes the liquidity manager address', () => {
  assert.ok(manifest.liquidityManager?.address);
});
```

- [ ] **Step 2: Run the manifest-shape test and verify it fails because the output schema is missing the new field**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && node --test tests/sepoliaAutoSwapManifestShape.test.mjs`
Expected: FAIL on missing `liquidityManager.address`.

- [ ] **Step 3: Update the deploy script and manifest validator**

Make the deploy script:
- deploy the liquidity manager after token deployment
- register all five token pools
- deploy the router pointing to the same token set
- configure router fee BPS + liquidity manager hook
- emit `liquidityManager.address` into both deployment outputs

Update frontend manifest validation to require the new field but keep existing token validation intact.

- [ ] **Step 4: Re-run the manifest-shape test**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && node --test tests/sepoliaAutoSwapManifestShape.test.mjs`
Expected: PASS against the checked-in generated manifest shape (fixture may need a temporary update or test-local manifest sample).

- [ ] **Step 5: Commit deployment + manifest schema changes**

```bash
git add contracts/script/DeploySepoliaAutoSwap.s.sol frontend/lib/sepoliaAutoSwapManifest.mjs frontend/tests/sepoliaAutoSwapManifestShape.test.mjs
git commit -m "feat: add liquidity manager to sepolia deployment manifest"
```

### Task 4: Add Frontend Helpers and Execution Paths for Liquidity Actions

**Files:**
- Create: `frontend/lib/sepoliaLiquidity.mjs`
- Create: `frontend/lib/sepoliaLiquidityExecution.mjs`
- Modify: `frontend/lib/api.js`
- Create: `frontend/tests/sepoliaLiquidity.test.mjs`
- Create: `frontend/tests/sepoliaLiquidityExecution.test.mjs`

- [ ] **Step 1: Write failing helper tests for pool models and transaction plans**

```javascript
test('buildLiquidityPools returns five Sepolia pools with user-facing metrics', () => {
  const pools = buildLiquidityPools({ manifest, onChainState, positions });
  assert.equal(pools.length, 5);
  assert.equal(pools[0].poolLabel, 'SepETH / WUSD');
});

test('buildProvideLiquidityPlan requires ETH value and selected pool token', () => {
  const plan = buildProvideLiquidityPlan({ manifest, token, amountEth: '0.5' });
  assert.equal(plan.valueWei, parseEther('0.5').toString());
});
```

- [ ] **Step 2: Run the new Node tests to confirm they fail correctly**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && node --test tests/sepoliaLiquidity.test.mjs tests/sepoliaLiquidityExecution.test.mjs`
Expected: FAIL because the helper modules do not exist yet.

- [ ] **Step 3: Implement the pure helpers and API wrappers**

Implement:
- pool view-model builder that combines manifest token metadata with on-chain state
- formatting helpers for total liquidity, shares, and claimable fees
- execution-plan builders for deposit, claim, withdraw
- `api.js` wrappers that send these contract calls using ethers + the local wallet private key pattern already used for Sepolia auto-swap sends

Keep reads pure and deterministic so the UI layer stays thin.

- [ ] **Step 4: Re-run the helper tests**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && node --test tests/sepoliaLiquidity.test.mjs tests/sepoliaLiquidityExecution.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit frontend helper and execution-path work**

```bash
git add frontend/lib/sepoliaLiquidity.mjs frontend/lib/sepoliaLiquidityExecution.mjs frontend/lib/api.js frontend/tests/sepoliaLiquidity.test.mjs frontend/tests/sepoliaLiquidityExecution.test.mjs
git commit -m "feat: add sepolia liquidity action helpers"
```

### Task 5: Load Liquidity State Into the Wallet Context

**Files:**
- Modify: `frontend/contexts/DatabaseWalletContext.js`
- Reuse: `frontend/lib/sepoliaLiquidity.mjs`

- [ ] **Step 1: Add a failing test or at minimum a narrow helper assertion for the context-facing data shape**

If a dedicated context test is too heavy tonight, add a helper-level assertion that the context can consume, such as:

```javascript
test('buildLiquidityPools returns zeroed positions when the user has no LP shares', () => {
  const pools = buildLiquidityPools({ manifest, onChainState, positions: {} });
  assert.equal(pools.every((pool) => pool.userSharePercent === '0.00%'), true);
});
```

- [ ] **Step 2: Wire liquidity reads into the Sepolia branch of the wallet context**

Add state for:
- `sepoliaLiquidityPools`
- `sepoliaLiquidityLoading`
- `liquidityActionsInFlight`

On Sepolia selection + unlocked wallet, read the liquidity manager contract and populate pool + user position data. Expose refresh helpers for deposit/claim/withdraw.

- [ ] **Step 3: Verify the frontend still builds after context changes**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit the wallet-context integration**

```bash
git add frontend/contexts/DatabaseWalletContext.js frontend/lib/sepoliaLiquidity.mjs
 git commit -m "feat: load sepolia liquidity state into wallet context"
```

### Task 6: Add the Liquidity UI to the Sepolia Dashboard

**Files:**
- Create: `frontend/components/SepoliaLiquidityPanel.js`
- Create: `frontend/components/SepoliaLiquidityModal.js`
- Modify: `frontend/components/Dashboard.js`
- Optionally modify: `frontend/app/globals.css`

- [ ] **Step 1: Write the failing UI/model test or snapshot-equivalent helper assertion**

Prefer a helper-driven assertion if no UI test harness exists:

```javascript
test('liquidity panel rows present all five pools in dashboard order', () => {
  const pools = buildLiquidityPools({ manifest, onChainState, positions });
  assert.deepEqual(pools.map((pool) => pool.symbol), ['WUSD', 'WDAI', 'WLINK', 'WWBTC', 'WGLD']);
});
```

- [ ] **Step 2: Implement the panel and modal with plain-language summaries**

UI requirements:
- show all five pools only on Sepolia
- each pool card shows total liquidity, total fees, user share, earned fees
- provide-liquidity modal uses ETH-only entry
- claim and withdraw actions are clearly labeled
- copy tone must explicitly say the pool earns ETH fees from router activity

Keep the UI shell-native and avoid adding unrelated navigation.

- [ ] **Step 3: Verify the full frontend build**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && npm run build`
Expected: PASS with the new liquidity section rendered in the app bundle.

- [ ] **Step 4: Commit the dashboard liquidity UI**

```bash
git add frontend/components/SepoliaLiquidityPanel.js frontend/components/SepoliaLiquidityModal.js frontend/components/Dashboard.js frontend/app/globals.css
git commit -m "feat: add sepolia liquidity dashboard"
```

### Task 7: End-to-End Verification for Tomorrow’s Demo

**Files:**
- Modify as needed only if verification finds a real bug.

- [ ] **Step 1: Run the full contract verification set**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/contracts && forge test --offline`
Expected: PASS for router + liquidity manager.

- [ ] **Step 2: Run the frontend verification set**

Run: `cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && node --test tests/sepoliaLiquidity.test.mjs tests/sepoliaLiquidityExecution.test.mjs tests/sepoliaAutoSwapManifestShape.test.mjs && npm run build`
Expected: PASS.

- [ ] **Step 3: If time permits, perform one live Sepolia smoke test after redeployment**

Manual live flow:
1. provide liquidity to one pool
2. send the matching token through the router
3. refresh the dashboard
4. confirm fee growth
5. claim fees

- [ ] **Step 4: Commit any final verification fixes only if they were necessary**

```bash
git add <touched-files>
git commit -m "fix: stabilize sepolia liquidity demo"
```
