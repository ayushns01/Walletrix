import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log('🔍 Testing Walletrix Database Connection...\n');

  try {

    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');

    console.log('2️⃣ Testing users table...');
    const testUser = await prisma.user.create({
      data: {
        email: 'test@walletrix.com',
        passwordHash: await bcrypt.hash('TestPassword123', 12),
        displayName: 'Test User',
        emailVerified: true,
      },
    });
    console.log(`✅ User created: ${testUser.email} (ID: ${testUser.id})\n`);

    console.log('3️⃣ Testing user_preferences table...');
    const preferences = await prisma.userPreferences.create({
      data: {
        userId: testUser.id,
        defaultNetwork: 'ethereum',
        preferredCurrency: 'USD',
        theme: 'dark',
      },
    });
    console.log(`✅ Preferences created for user: ${testUser.email}\n`);

    console.log('4️⃣ Testing user_sessions table...');
    const session = await prisma.userSession.create({
      data: {
        userId: testUser.id,
        sessionToken: 'test_session_token_' + Date.now(),
        refreshToken: 'test_refresh_token_' + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      },
    });
    console.log(`✅ Session created: ${session.sessionToken}\n`);

    console.log('5️⃣ Testing wallets table...');
    const wallet = await prisma.wallet.create({
      data: {
        userId: testUser.id,
        name: 'Test Wallet',
        walletType: 'hd',
        encryptedPrivateKeys: { ethereum: 'encrypted_key_here', bitcoin: 'encrypted_key_here' },
        addresses: { ethereum: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
        derivationPath: "m/44'/60'/0'/0/0",
      },
    });
    console.log(`✅ Wallet created: ${wallet.name} (ID: ${wallet.id})\n`);

    console.log('6️⃣ Testing transactions table...');
    const transaction = await prisma.transaction.create({
      data: {
        walletId: wallet.id,
        network: 'ethereum-mainnet',
        txHash: '0x' + 'a'.repeat(64),
        fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        toAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEc',
        amount: '1.5',
        tokenSymbol: 'ETH',
        status: 'confirmed',
        timestamp: new Date(),
        isIncoming: false,
        category: 'transfer',
      },
    });
    console.log(`✅ Transaction created: ${transaction.txHash.substring(0, 10)}...\n`);

    console.log('7️⃣ Testing address_book table...');
    const addressEntry = await prisma.addressBookEntry.create({
      data: {
        userId: testUser.id,
        name: 'Friend Wallet',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEd',
        network: 'ethereum',
        notes: 'My friend\'s wallet',
        isFavorite: true,
      },
    });
    console.log(`✅ Address book entry created: ${addressEntry.name}\n`);

    console.log('8️⃣ Testing activity_logs table...');
    const activityLog = await prisma.activityLog.create({
      data: {
        userId: testUser.id,
        action: 'LOGIN',
        resourceType: 'user',
        resourceId: testUser.id,
        details: { method: 'email', timestamp: new Date() },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        success: true,
      },
    });
    console.log(`✅ Activity log created: ${activityLog.action}\n`);

    console.log('9️⃣ Testing price_cache table...');
    const priceCache = await prisma.priceCache.upsert({
      where: { symbol: 'ETH' },
      update: {
        name: 'Ethereum',
        priceUsd: '2000.50',
        marketCap: '240000000000',
        change24h: '2.5',
      },
      create: {
        symbol: 'ETH',
        name: 'Ethereum',
        priceUsd: '2000.50',
        marketCap: '240000000000',
        change24h: '2.5',
      },
    });
    console.log(`✅ Price cache created: ${priceCache.symbol} @ $${priceCache.priceUsd}\n`);

    console.log('🔟 Testing data retrieval...');
    const allUsers = await prisma.user.count();
    const allWallets = await prisma.wallet.count();
    const allTransactions = await prisma.transaction.count();
    const allSessions = await prisma.userSession.count();
    const allPreferences = await prisma.userPreferences.count();
    const allAddresses = await prisma.addressBookEntry.count();
    const allLogs = await prisma.activityLog.count();
    const allPrices = await prisma.priceCache.count();

    console.log('📊 Database Statistics:');
    console.log(`   Users: ${allUsers}`);
    console.log(`   Wallets: ${allWallets}`);
    console.log(`   Transactions: ${allTransactions}`);
    console.log(`   Sessions: ${allSessions}`);
    console.log(`   Preferences: ${allPreferences}`);
    console.log(`   Address Book: ${allAddresses}`);
    console.log(`   Activity Logs: ${allLogs}`);
    console.log(`   Price Cache: ${allPrices}\n`);

    console.log('🧹 Cleaning up test data...');
    await prisma.transaction.deleteMany({ where: { walletId: wallet.id } });
    await prisma.wallet.deleteMany({ where: { userId: testUser.id } });
    await prisma.addressBookEntry.deleteMany({ where: { userId: testUser.id } });
    await prisma.activityLog.deleteMany({ where: { userId: testUser.id } });
    await prisma.userSession.deleteMany({ where: { userId: testUser.id } });
    await prisma.userPreferences.delete({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 ALL DATABASE TESTS PASSED!');
    console.log('✅ All 8 tables are working correctly');
    console.log('✅ Data can be stored and retrieved');
    console.log('✅ Relationships are properly configured\n');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
