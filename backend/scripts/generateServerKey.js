#!/usr/bin/env node
/**
 * generateServerKey.js
 * Generates a fresh EOA keypair to use as SERVER_SIGNING_KEY.
 * Run once: node backend/scripts/generateServerKey.js
 * Copy the output to your .env file.
 */

import { ethers } from 'ethers';

const wallet = ethers.Wallet.createRandom();

console.log('\n🔑 Generated Server Signing Key\n');
console.log('Add these to your backend/.env:\n');
console.log(`SERVER_SIGNING_KEY=${wallet.privateKey}`);
console.log(`SERVER_SIGNING_ADDRESS=${wallet.address}`);
console.log('\n⚠️  Keep SERVER_SIGNING_KEY secret. Never commit it to git.');
console.log(`\n📋 Server key address: ${wallet.address}`);
console.log('   This address will be granted EXECUTOR role on users\' smart vaults (future 4337 upgrade).\n');
