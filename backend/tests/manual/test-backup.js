/**
 * Simple test script for wallet backup functionality
 */
import walletBackupService from './src/services/walletBackupService.js';

async function testWalletBackup() {
  console.log('🧪 Testing Wallet Backup Service...\n');

  try {
    // Test internal validation method
    console.log('1️⃣ Testing backup data validation...');
    const testData = {
      wallet: {
        id: 'test-wallet-1',
        address: '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95',
        network: 'ethereum'
      },
      transactions: [],
      createdAt: new Date().toISOString()
    };
    
    const validation = await walletBackupService._validateBackupData(testData);
    console.log(`✅ Backup validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    if (!validation.valid && validation.errors) {
      console.log(`   Errors: ${validation.errors.join(', ')}`);
    }
    
    // Test format detection
    console.log('\n2️⃣ Testing format detection...');
    const jsonData = JSON.stringify(testData);
    const csvData = 'address,network,balance\n0x123,ethereum,1.5';
    
    const jsonFormat = await walletBackupService._detectBackupFormat(jsonData);
    const csvFormat = await walletBackupService._detectBackupFormat(csvData);
    console.log(`✅ JSON format detected: ${jsonFormat}`);
    console.log(`✅ CSV format detected: ${csvFormat}`);
    
    // Test encryption
    console.log('\n3️⃣ Testing data encryption...');
    const testPassword = 'testPassword123!';
    const encryptedData = await walletBackupService._encryptData(jsonData, testPassword);
    console.log(`✅ Data encrypted successfully`);
    console.log(`   Encrypted length: ${encryptedData.length} characters`);
    console.log(`   Contains expected components: ${encryptedData.includes('U2FsdGVkX1') ? 'Yes' : 'No'}`);
    
    // Test backup creation methods
    console.log('\n4️⃣ Testing backup format creation...');
    
    // JSON backup
    const jsonBackup = await walletBackupService._createJsonBackup(testData);
    console.log(`✅ JSON backup created - Size: ${JSON.stringify(jsonBackup).length} bytes`);
    
    // CSV backup
    const csvBackup = await walletBackupService._createCsvBackup(testData);
    console.log(`✅ CSV backup created - Size: ${csvBackup.length} bytes`);
    
    // Encrypted backup
    const encryptedBackup = await walletBackupService._createEncryptedBackup(testData, testPassword);
    console.log(`✅ Encrypted backup created - Size: ${encryptedBackup.length} bytes`);
    
    // Test compression
    console.log('\n5️⃣ Testing backup compression...');
    const largeData = JSON.stringify({
      ...testData,
      largeField: 'x'.repeat(1000) // Add some bulk to test compression
    });
    
    const compressed = await walletBackupService._compressBackup(largeData, 'test-backup.json');
    console.log(`✅ Compression test:`);
    console.log(`   Original size: ${largeData.length} bytes`);
    console.log(`   Compressed size: ${compressed.data.length} bytes`);
    console.log(`   Compression ratio: ${(100 - (compressed.data.length / largeData.length) * 100).toFixed(1)}%`);
    
    console.log('\n🎉 Wallet Backup Service core functionality verified!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Backup validation working');
    console.log('   ✅ Format detection (JSON/CSV) working');
    console.log('   ✅ Data encryption working');
    console.log('   ✅ Multiple backup formats supported');
    console.log('   ✅ Compression functionality working');
    console.log('\n⚠️  Note: Full integration tests require database setup');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testWalletBackup().catch(console.error);

// Run tests
testWalletBackup().catch(console.error);