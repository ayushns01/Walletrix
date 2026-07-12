# Opened-Wallet Premium Dashboard Design

**Date:** 2026-03-29  
**Project:** Walletrix  
**Scope:** Desktop-first redesign of the full opened-wallet experience

## Goal

Redesign the opened-wallet experience so Walletrix feels premium, productized, and recruiter-impressive the moment a wallet opens, while keeping the existing wallet functionality intact.

The redesign target is:

- Apple / Linear inspired
- ultra-clean, minimal, premium
- information-dense without feeling crowded
- desktop-first
- focused on the full opened-wallet shell, not just the inner dashboard cards

## Design Direction

The opened-wallet experience should feel like a luxury operating system for digital assets rather than a typical dark crypto dashboard.

The screen should communicate three things immediately:

1. Walletrix is a serious product
2. the user’s portfolio and wallet state are clear at a glance
3. advanced features such as Telegram and stealth receives are integrated into the product, not bolted on

## Layout Blueprint

The opened-wallet desktop experience will be restructured into the approved **Option A: Workstation Rail** shell.

This shell is the canonical layout for the redesign and consists of the three zones below.

### 1. Left Utility Rail

A slim premium vertical rail that replaces the current top-heavy navigation pattern.

It will contain:

- Walletrix brand mark
- primary navigation / key actions
- wallet switching entry
- settings entry
- lock/logout controls

This rail should feel like product infrastructure, not a decorative sidebar.

### 2. Center Main Stage

This is the visual anchor of the experience and the first recruiter-facing surface.

It will contain:

- a large hero portfolio panel with total balance
- selected wallet identity
- active network
- 24h movement
- compact portfolio summary chips
- integrated quick actions
- a stronger top-holdings module
- recent activity module

This center column should communicate financial clarity, confidence, and polish.

### 3. Right Intelligence Column

This column will hold compact high-signal modules.

It will contain:

- Telegram bot wallet status
- stealth receive / claim status
- wallet identity and address context
- system signals such as linked state, funding state, and health indicators

The right column should feel like intelligence and control, not like repeated generic cards.

## Existing Control Placement

The redesign must preserve reachability for all opened-wallet controls that already exist in the desktop shell.

| Control | Current owner | New placement |
| --- | --- | --- |
| Back to welcome | `frontend/app/page.js` desktop header | left utility rail, top cluster |
| Network selector | `frontend/app/page.js` desktop header | center-stage shell header |
| Wallet switcher | `frontend/app/page.js` desktop header | left utility rail, upper utility cluster |
| Notifications | `frontend/components/NotificationBell.js` in desktop header | center-stage shell header, right utility cluster |
| Settings | `frontend/app/page.js` desktop header | left utility rail, lower utility cluster |
| Lock wallet | `frontend/app/page.js` desktop header | left utility rail, lower utility cluster |
| Sign in / user profile | `frontend/app/page.js` desktop header | center-stage shell header, right utility cluster |
| Send | standalone quick-actions bar in `frontend/app/page.js` | hero portfolio panel |
| Receive | standalone quick-actions bar in `frontend/app/page.js` | hero portfolio panel |
| Fund Bot | standalone quick-actions bar in `frontend/app/page.js` | hero portfolio panel and optional Telegram intelligence module affordance |

The standalone desktop quick-actions bar is removed in this redesign. Its actions are absorbed into the hero portfolio module.

## Visual Language

### Background

The current cosmic / nebula treatment should be removed from the opened-wallet experience.

Replace it with:

- restrained graphite base
- soft charcoal gradients
- very subtle highlight falloff
- minimal ambient glow only where hierarchy needs emphasis

The result should feel expensive and calm.

### Color System

Use a tightly controlled palette:

- graphite / charcoal / slate for structure
- soft white for primary text
- blue-silver for active product states
- emerald for positive financial signals
- red only for alerts and destructive actions

Avoid loud multicolor gradients across most surfaces.

### Typography

Typography should carry hierarchy in an editorial, premium way:

- large crisp numeric hero for portfolio value
- restrained uppercase micro-labels
- medium-weight module headers
- compact dense support text in smaller modules

The goal is visual authority, not flashy decoration.

### Surfaces

Panels should feel precise and milled:

- larger radii
- thin borders
- softer, lower-noise shadows
- selective glass only when useful
- fewer but more important surfaces

### Motion

Motion should be subtle and product-grade:

- small hover lifts
- refined refresh motion
- gentle fade / slide on load

Avoid dramatic animated backgrounds and unnecessary motion.

## Module Design

### Hero Portfolio Panel

This becomes the primary statement piece.

It should include:

- total portfolio value
- selected wallet name
- active network
- 24h movement
- 3 to 5 compact status chips
- integrated quick actions such as send, receive, and fund bot

The hero should replace the current separation between balance display and quick-actions bar.

### Hero Chips Data Contract

The compact hero chips must only use state already present in the opened-wallet route.

| Chip | Source state | Fallback behavior |
| --- | --- | --- |
| Active wallet | `wallet`, `activeWalletId`, `userWallets` | use `Main Wallet` if no user-facing wallet label is available |
| Active network | `selectedNetwork` | show normalized selected network label, fallback `Ethereum Mainnet` |
| Assets shown | derived from rendered asset rows in `Dashboard.js` | show `0 assets` when no balances exist |
| Telegram state | `telegramAPI.getStatus()` and bot wallet fetch already used in `Dashboard.js` | show `Telegram unavailable` when unlinked or request fails |
| Sync state | `refreshInProgress`, `dataLoading`, `portfolioLoading` | show `Syncing` while refresh is active, otherwise `Live` |

### Top Holdings Module

This should evolve from a plain asset list into an executive summary.

It should:

- prioritize top 4 to 6 assets
- improve icon treatment
- align value and balance more cleanly
- reduce repeated visual patterns

### Recent Activity Module

For this redesign pass, this module will be implemented as a **recent wallet state / operational snapshot** rather than a true transaction-history feed.

Reason: a dedicated recent-transaction source is not currently loaded into the opened-wallet route in `frontend/app/page.js` or `frontend/components/Dashboard.js`.

Allowed rows:

- selected network
- Telegram bot linked or unlinked state
- bot wallet funding state if available
- stealth-related readiness if it is already available cleanly during this pass
- sync / refresh state

Row count target: 3 to 5 rows.

Empty-state copy:

`Wallet intelligence will appear here as your account becomes active.`

### Intelligence Modules

The following modules should move into the right-side intelligence column:

- Telegram bot wallet
- stealth receives / claim readiness
- wallet identity
- system signals

These modules should be smaller and sharper than the main center modules.

### Intelligence Module Data Contract

Only use existing data already available from the opened-wallet route or current dashboard fetches.

| Module | Source state | Loading / empty / error behavior |
| --- | --- | --- |
| Telegram bot wallet | `telegramAPI.getStatus()`, `telegramAPI.getBotBalance()` | show setup / unavailable state instead of hiding the module completely |
| Wallet identity | current network-specific address from `wallet` plus `selectedNetwork` | show truncated preview with copy action; do not render oversized raw address blocks |
| System signals | `refreshInProgress`, `dataLoading`, `portfolioLoading`, Telegram state | show concise status pills such as `Syncing`, `Live`, `Linked`, `Unavailable` |
| Stealth / operational status | only if already available in the opened-wallet route during this pass; otherwise omit rather than invent unsupported live data | if omitted, replace with another compact module backed by existing wallet state |

## What Will Be Reduced or Removed

The redesign should deliberately reduce the following from the opened-wallet experience:

- cosmic animated background visuals
- repeated saturated gradients
- oversized raw address blocks
- multiple stacked cards with equal weight
- visual duplication between shell and dashboard content

### Address Treatment

Addresses in the redesigned desktop shell should use:

- truncated inline preview
- copy action
- optional compact network label

Full raw addresses should not occupy a large standalone desktop card in this pass. Full-address visibility remains available in existing detail flows such as account details and receive surfaces.

## Implementation Boundaries

This pass is specifically for the opened-wallet experience.

### In scope

- desktop opened-wallet shell
- dashboard hierarchy and visual redesign
- shell composition and spacing
- premium styling system for this experience
- existing module reorganization

### Out of scope

- major wallet logic changes
- new product features
- deep mobile redesign
- unrelated flows such as create/import/landing

Mobile should remain clean and functional, but desktop is the primary focus of this pass.

### Breakpoint Rule

The full Workstation Rail shell applies at Tailwind `lg` and above.

Below `lg`, the current mobile structure remains in place with only minor visual compatibility cleanup if needed. This redesign does not attempt to port the full three-zone shell to smaller breakpoints.

## Expected File Touches

The design is intended to center around:

- `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/app/page.js`
- `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/components/Dashboard.js`
- `/Users/ayushns01/Desktop/Repositories/Walletrix/frontend/app/globals.css`

Implementation may introduce small supporting UI components if that keeps the opened-wallet shell maintainable.

## Acceptance Criteria

The redesign is successful if all of the following are true:

- the opened-wallet desktop route uses a three-zone shell with left utility rail, center stage, and right intelligence column
- the standalone desktop quick-actions bar is removed
- the hero portfolio module contains the listed fields and integrated actions
- the right column contains only modules backed by the data contracts above
- the large cosmic desktop background treatment is removed from the opened-wallet route
- wallet actions that were reachable before remain reachable after the redesign
- the redesigned desktop screen feels calmer and more premium than the current stacked-card layout
- the existing mobile opened-wallet route remains functional

## Recommendation

The recommended implementation direction is the approved **Option A: Workstation Rail** shell.

This is the best fit because it combines:

- premium restraint
- professional density
- strong recruiter-facing first impression
- clearer layout hierarchy than the current top-bar-plus-stacked-cards structure
