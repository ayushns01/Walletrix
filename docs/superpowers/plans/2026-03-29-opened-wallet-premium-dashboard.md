# Opened-Wallet Premium Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the desktop opened-wallet experience so Walletrix feels premium, minimal, and recruiter-impressive while preserving existing wallet behavior.

**Architecture:** Keep the implementation centered on the existing opened-wallet entry point in `frontend/app/page.js` and the current dashboard surface in `frontend/components/Dashboard.js`. Introduce the new Apple/Linear-inspired shell by replacing the current desktop header and quick-actions composition with a three-zone layout, while adding a contained premium design layer in `frontend/app/globals.css`.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, existing `useWallet` context, Clerk auth hooks, Lucide icons

---

### Task 1: Establish The Premium Shell Styling Layer

**Files:**
- Modify: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/app/globals.css`
- Test: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/package.json`

- [ ] **Step 1: Add the failing design target to the plan context**

Document the target in comments near the new CSS block:
- graphite desktop canvas
- restrained borders and shadows
- premium opened-wallet shell classes
- no cosmic desktop background in opened-wallet mode

- [ ] **Step 2: Add opened-wallet specific CSS utilities**

Add a focused CSS block for:
- shell background gradient
- left rail surface
- panel surface variants
- soft border and shadow tokens
- subtle desktop-only glow accents
- restrained entrance animation utilities

Do not rewrite the entire global stylesheet. Add a scoped layer that the opened-wallet shell can opt into.

- [ ] **Step 3: Verify style additions don’t break the app**

Run:
```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && npm run build
```

Expected:
- build succeeds
- existing lint warnings may remain
- no CSS syntax error

### Task 2: Rebuild The Desktop Opened-Wallet Shell

**Files:**
- Modify: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/app/page.js`
- Test: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/package.json`

- [ ] **Step 1: Identify the current desktop shell blocks to replace**

Target the opened-wallet section only:
- animated desktop background
- desktop header
- quick-actions bar
- dashboard wrapper

Keep:
- mobile navigation behavior
- modal wiring
- wallet state/view routing

- [ ] **Step 2: Implement the new desktop shell layout**

Replace the current desktop opened-wallet composition with:
- left utility rail
- central content stage
- right intelligence column wrapper

The shell must preserve working controls for:
- back to welcome
- network selector
- wallet switching
- settings
- lock wallet
- user profile

- [ ] **Step 3: Move quick actions into the main shell context**

Remove the separate desktop quick-actions bar and instead place send / receive / fund bot actions inside the new center-stage composition.

Re-use the existing click handlers:
- `handleQuickAction`
- `handleFundBotWallet`

- [ ] **Step 4: Keep mobile safe**

Do not apply the full shell redesign to mobile. Keep the existing mobile navigation flow functional and visually compatible.

- [ ] **Step 5: Verify shell refactor**

Run:
```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && npm run build
```

Expected:
- build succeeds
- no broken references from removed desktop blocks

### Task 3: Redesign The Dashboard Content Surface

**Files:**
- Modify: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/components/Dashboard.js`
- Test: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/package.json`

- [ ] **Step 1: Keep the existing data flow intact**

Preserve current live dependencies:
- `useWallet()`
- `telegramAPI.getStatus`
- `telegramAPI.getBotBalance`
- `refreshData`
- selected-network-driven asset calculations

Do not change wallet business logic unless required for layout integrity.

- [ ] **Step 2: Replace stacked cards with a structured three-part dashboard**

Implement:
- hero portfolio module
- holdings / asset summary module
- compact intelligence modules

The component should visually support the shell rather than fighting it with repeated equal-weight cards.

- [ ] **Step 3: Upgrade the hero panel**

The hero should include:
- total balance
- selected network context
- 24h movement
- concise stat chips
- refresh affordance

It should look like the main statement piece of the product.

- [ ] **Step 4: Refine assets presentation**

Rework the current asset list into a premium summary:
- stronger icon treatment
- clearer balance/value hierarchy
- better spacing and scanability
- reduced visual repetition

- [ ] **Step 5: Build the right-column intelligence modules from existing data**

Use already-available data to show:
- Telegram bot wallet state
- wallet address identity
- stealth / operational signals where available
- refresh / loading / linked state

Do not invent unsupported live data. If recent transaction data is not already available cleanly in this component, use operational status modules instead of bolting in a half-finished activity feed.

- [ ] **Step 6: Verify dashboard render path**

Run:
```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && npm run build
```

Expected:
- build succeeds
- no React syntax/runtime compile failures

### Task 4: Polish The Visual Hierarchy And Desktop Responsiveness

**Files:**
- Modify: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/app/page.js`
- Modify: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/components/Dashboard.js`
- Modify: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/app/globals.css`
- Test: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/package.json`

- [ ] **Step 1: Tighten hierarchy and spacing**

Adjust:
- desktop gaps
- panel heights
- title and label rhythm
- action emphasis
- right-column density

The end result should feel dense but calm.

- [ ] **Step 2: Check desktop-first breakpoints**

Validate that the redesign holds on:
- large laptop widths
- typical recruiter/demo laptop widths
- narrower desktop widths before mobile layout

Use existing responsive utilities instead of creating a parallel breakpoint system.

- [ ] **Step 3: Keep visual noise low**

Remove or tone down:
- loud gradients
- excessive glow
- repetitive panel styling
- oversized decorative effects

- [ ] **Step 4: Run the final frontend verification**

Run:
```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix/frontend && npm run build
```

Expected:
- successful production build
- existing unrelated lint warnings may still appear
- no new blocking issues introduced by the redesign

### Task 5: Summarize The Redesign Outcome

**Files:**
- No file changes required unless a small follow-up tweak is needed
- Test: `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/package.json`

- [ ] **Step 1: Capture the outcome clearly**

Be ready to summarize:
- shell changes
- dashboard changes
- visual-system changes
- anything intentionally left for later

- [ ] **Step 2: Confirm repository state**

Run:
```bash
cd /Users/ayushns01/Desktop/Repositories/Walletrix && git status --short
```

Expected:
- only the intended redesign files plus the spec/plan docs show as modified/untracked

- [ ] **Step 3: Provide verification evidence**

Include the final build result and mention any residual pre-existing warnings instead of claiming a perfectly clean lint state.
