'use client'

// The aurora canvas now lives at components/AuroraBackground.js so the wallet
// shell can reuse it. This shim keeps the landing's import path stable.
export { default } from '../AuroraBackground'
