import axios from 'axios';

/**
 * Simple API Test
 * Just tests if the server is working
 */

console.log('Starting simple API test...\n');

// Wait a moment for server to be ready
setTimeout(async () => {
  try {
    const response = await axios.get('http://localhost:3001/health');
    console.log('✅ Health check passed');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Test API info
    const apiResponse = await axios.get('http://localhost:3001/api/v1');
    console.log('\n✅ API info passed');
    console.log('Endpoints available:', Object.keys(apiResponse.data.endpoints));
    
    // Test wallet generation
    const walletResponse = await axios.post('http://localhost:3001/api/v1/wallet/generate');
    console.log('\n✅ Wallet generation passed');
    console.log('Wallet has mnemonic:', !!walletResponse.data.data.mnemonic);
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}, 2000);
