#!/usr/bin/env node

import fetch from 'node-fetch';
import prisma from './src/lib/prisma.js';

const API_URL = 'http://localhost:3001/api/v1';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testTransactionAPIs() {
  log('cyan', '\n🧪 Testing Recent Transactions API\n' + '='.repeat(50) + '\n');

  try {

    log('blue', '📋 Step 1: Getting wallet from database...');
    const wallet = await prisma.wallet.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        userId: true,
        name: true,
        addresses: true
      }
    });

    if (!wallet) {
      log('red', '❌ No wallet found in database');
      log('yellow', '💡 Create a wallet first through the frontend');
      return;
    }

    log('green', `✅ Found wallet: ${wallet.name} (${wallet.id})`);
    log('cyan', `   Addresses: ${JSON.stringify(wallet.addresses)}`);
    console.log('');

    log('blue', '📋 Step 2: Checking existing transactions in database...');
    const existingTxs = await prisma.transaction.count({
      where: { walletId: wallet.id }
    });
    log('cyan', `   Found ${existingTxs} transactions in database`);
    console.log('');

    log('blue', '📋 Step 3: Testing GET /transactions/wallet/:walletId...');
    const walletTxResponse = await fetch(`${API_URL}/transactions/wallet/${wallet.id}`);
    const walletTxData = await walletTxResponse.json();

    if (walletTxResponse.ok) {
      log('green', `✅ API Response: ${walletTxResponse.status}`);
      log('cyan', `   Success: ${walletTxData.success}`);
      log('cyan', `   Transactions returned: ${walletTxData.data?.transactions?.length || 0}`);
      log('cyan', `   Total items: ${walletTxData.data?.pagination?.totalItems || 0}`);

      if (walletTxData.data?.transactions?.length > 0) {
        log('green', '\n   📊 Recent Transactions:');
        walletTxData.data.transactions.slice(0, 3).forEach((tx, i) => {
          log('cyan', `     ${i + 1}. ${tx.txHash?.slice(0, 10)}... - ${tx.amount} ${tx.tokenSymbol}`);
          log('cyan', `        Status: ${tx.status}, Network: ${tx.network}`);
        });
      } else {
        log('yellow', '   ⚠️  No transactions found (this is normal for new wallets)');
      }
    } else {
      log('red', `❌ API Error: ${walletTxResponse.status}`);
      log('red', `   ${JSON.stringify(walletTxData, null, 2)}`);
    }
    console.log('');

    log('blue', '📋 Step 4: Testing with filters (limit=5, status=confirmed)...');
    const filteredResponse = await fetch(
      `${API_URL}/transactions/wallet/${wallet.id}?limit=5&status=confirmed&sortBy=timestamp&sortOrder=desc`
    );
    const filteredData = await filteredResponse.json();

    if (filteredResponse.ok) {
      log('green', `✅ Filtered query working`);
      log('cyan', `   Returned: ${filteredData.data?.transactions?.length || 0} transactions`);
    } else {
      log('red', `❌ Filtered query failed: ${filteredResponse.status}`);
    }
    console.log('');

    log('blue', '📋 Step 5: Testing GET /transactions/wallet/:walletId/analytics...');
    const analyticsResponse = await fetch(
      `${API_URL}/transactions/wallet/${wallet.id}/analytics?timeframe=30d`
    );
    const analyticsData = await analyticsResponse.json();

    if (analyticsResponse.ok) {
      log('green', `✅ Analytics endpoint working`);
      if (analyticsData.data) {
        log('cyan', `   Total transactions: ${analyticsData.data.totalTransactions || 0}`);
        log('cyan', `   Incoming: ${analyticsData.data.incomingCount || 0}`);
        log('cyan', `   Outgoing: ${analyticsData.data.outgoingCount || 0}`);
      }
    } else {
      log('red', `❌ Analytics failed: ${analyticsResponse.status}`);
    }
    console.log('');

    if (wallet.addresses?.ethereum) {
      log('blue', '📋 Step 6: Testing blockchain transaction fetch...');
      const ethAddress = wallet.addresses.ethereum;
      log('cyan', `   Ethereum address: ${ethAddress}`);

      const blockchainResponse = await fetch(
        `${API_URL}/blockchain/ethereum/transactions/${ethAddress}?limit=5`
      );
      const blockchainData = await blockchainResponse.json();

      if (blockchainResponse.ok) {
        log('green', `✅ Blockchain API working`);
        log('cyan', `   Transactions found: ${blockchainData.transactions?.length || 0}`);

        if (blockchainData.transactions?.length > 0) {
          log('green', '   📊 Recent blockchain transactions:');
          blockchainData.transactions.slice(0, 2).forEach((tx, i) => {
            log('cyan', `     ${i + 1}. ${tx.hash?.slice(0, 10)}... - ${tx.value} ETH`);
          });
        }
      } else {
        log('yellow', `⚠️  Blockchain API: ${blockchainResponse.status}`);
        log('yellow', `   (This is expected if no transactions exist on-chain)`);
      }
      console.log('');
    }

    log('cyan', '\n' + '='.repeat(50));
    log('cyan', '📊 SUMMARY\n');

    const checks = [
      { name: 'Wallet found in database', status: !!wallet },
      { name: 'GET /transactions/wallet/:id endpoint', status: walletTxResponse.ok },
      { name: 'Response structure correct', status: !!walletTxData.data },
      { name: 'Pagination metadata present', status: !!walletTxData.data?.pagination },
      { name: 'Filtered queries working', status: filteredResponse.ok },
      { name: 'Analytics endpoint working', status: analyticsResponse.ok }
    ];

    checks.forEach(check => {
      const icon = check.status ? '✅' : '❌';
      const color = check.status ? 'green' : 'red';
      log(color, `${icon} ${check.name}`);
    });

    const allPassing = checks.every(c => c.status);
    console.log('');
    if (allPassing) {
      log('green', '🎉 All transaction API tests PASSED!');
      log('green', '✅ Recent transactions API is working properly\n');
    } else {
      log('yellow', '⚠️  Some tests failed - check errors above\n');
    }

  } catch (error) {
    log('red', `\n❌ Test failed with error:`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testTransactionAPIs();
