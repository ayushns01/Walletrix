import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/v1';
const TEST_ETHEREUM_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const TEST_BITCOIN_ADDRESS = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const TEST_TOKEN_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

let passCount = 0;
let failCount = 0;

function printResult(testName, passed, error = null) {
  if (passed) {
    console.log(`${colors.green}✅ PASS${colors.reset} - ${testName}`);
    passCount++;
  } else {
    console.log(`${colors.red}❌ FAIL${colors.reset} - ${testName}`);
    if (error) {
      console.log(`   ${colors.red}Error: ${error.message || error}${colors.reset}`);
      if (error.response) {
        console.log(`   ${colors.red}Response: ${JSON.stringify(error.response.data)}${colors.reset}`);
      }
      if (error.code) {
        console.log(`   ${colors.red}Code: ${error.code}${colors.reset}`);
      }
    }
    failCount++;
  }
}

function printSection(sectionName) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}${sectionName}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

async function testAPIInfo() {
  printSection('API INFO');

  try {
    const response = await axios.get(`${API_BASE_URL}`);
    const hasEndpoints = response.data.endpoints &&
                         response.data.endpoints.wallet &&
                         response.data.endpoints.blockchain &&
                         response.data.endpoints.tokens &&
                         response.data.endpoints.prices &&
                         response.data.endpoints.transactions;
    printResult('API info endpoint', hasEndpoints);
  } catch (error) {
    printResult('API info endpoint', false, error);
  }
}

async function testBlockchainEndpoints() {
  printSection('BLOCKCHAIN ENDPOINTS');

  try {
    const response = await axios.get(`${API_BASE_URL}/blockchain/ethereum/balance/${TEST_ETHEREUM_ADDRESS}`);
    printResult('Get Ethereum balance', response.data.success === true);
  } catch (error) {
    printResult('Get Ethereum balance', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/blockchain/bitcoin/balance/${TEST_BITCOIN_ADDRESS}`);
    printResult('Get Bitcoin balance', response.data.success === true);
  } catch (error) {
    printResult('Get Bitcoin balance', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/blockchain/ethereum/transactions/${TEST_ETHEREUM_ADDRESS}`);
    printResult('Get Ethereum transactions', response.data.success === true);
  } catch (error) {
    printResult('Get Ethereum transactions', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/blockchain/bitcoin/transactions/${TEST_BITCOIN_ADDRESS}`);
    printResult('Get Bitcoin transactions', response.data.success === true);
  } catch (error) {
    printResult('Get Bitcoin transactions', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/blockchain/ethereum/gas-price`);
    printResult('Get Ethereum gas price', response.data.success === true);
  } catch (error) {
    printResult('Get Ethereum gas price', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/blockchain/bitcoin/fee-estimate`);
    printResult('Get Bitcoin fee estimate', response.data.success === true);
  } catch (error) {
    printResult('Get Bitcoin fee estimate', false, error.message);
  }
}

async function testTokenEndpoints() {
  printSection('TOKEN ENDPOINTS');

  try {
    const response = await axios.get(`${API_BASE_URL}/tokens/info/${TEST_TOKEN_ADDRESS}`);
    printResult('Get token info', response.data.success === true);
  } catch (error) {
    printResult('Get token info', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/tokens/balance/${TEST_TOKEN_ADDRESS}/${TEST_ETHEREUM_ADDRESS}`);
    printResult('Get token balance', response.data.success === true);
  } catch (error) {
    printResult('Get token balance', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/tokens/popular`);
    printResult('Get popular tokens', response.data.success === true);
  } catch (error) {
    printResult('Get popular tokens', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/tokens/balances/popular/${TEST_ETHEREUM_ADDRESS}`);
    printResult('Get popular token balances', response.data.success === true);
  } catch (error) {
    printResult('Get popular token balances', false, error.message);
  }
}

async function testPriceEndpoints() {
  printSection('PRICE ENDPOINTS');

  try {
    const response = await axios.get(`${API_BASE_URL}/prices/bitcoin`);
    printResult('Get Bitcoin price', response.data.success === true);
  } catch (error) {
    printResult('Get Bitcoin price', false, error.message);
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/prices/multiple`, {
      coinIds: ['bitcoin', 'ethereum'],
      currency: 'usd',
    });
    printResult('Get multiple prices', response.data.success === true);
  } catch (error) {
    printResult('Get multiple prices', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/prices/list/popular`);
    printResult('Get popular prices', response.data.success === true);
  } catch (error) {
    printResult('Get popular prices', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/prices/coin/bitcoin`);
    printResult('Get coin data', response.data.success === true);
  } catch (error) {
    printResult('Get coin data', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/prices/chart/bitcoin?days=7`);
    printResult('Get price chart', response.data.success === true);
  } catch (error) {
    printResult('Get price chart', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/prices/search/query?q=bitcoin`);
    printResult('Search coins', response.data.success === true);
  } catch (error) {
    printResult('Search coins', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/prices/list/trending`);
    printResult('Get trending coins', response.data.success === true);
  } catch (error) {
    printResult('Get trending coins', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/prices/list/top?limit=10`);
    printResult('Get top coins', response.data.success === true);
  } catch (error) {
    printResult('Get top coins', false, error.message);
  }
}

async function testWalletEndpoints() {
  printSection('WALLET ENDPOINTS');

  try {
    const response = await axios.post(`${API_BASE_URL}/wallet/generate`);
    const isValid = response.data.success === true &&
                    response.data.data.mnemonic &&
                    response.data.data.ethereum &&
                    response.data.data.bitcoin;
    printResult('Generate wallet', isValid);
  } catch (error) {
    printResult('Generate wallet', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/wallet/validate/ethereum/${TEST_ETHEREUM_ADDRESS}`);
    printResult('Validate Ethereum address', response.data.isValid === true);
  } catch (error) {
    printResult('Validate Ethereum address', false, error.message);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/wallet/validate/bitcoin/${TEST_BITCOIN_ADDRESS}`);
    printResult('Validate Bitcoin address', response.data.isValid === true);
  } catch (error) {
    printResult('Validate Bitcoin address', false, error.message);
  }
}

async function runAllTests() {
  console.log(`${colors.yellow}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║           WALLETRIX API COMPREHENSIVE TEST SUITE          ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  await testAPIInfo();
  await testWalletEndpoints();
  await testBlockchainEndpoints();
  await testTokenEndpoints();
  await testPriceEndpoints();

  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  const totalTests = passCount + failCount;
  const passRate = ((passCount / totalTests) * 100).toFixed(1);

  console.log(`${colors.green}✅ Passed: ${passCount}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failCount}${colors.reset}`);
  console.log(`${colors.yellow}📊 Pass Rate: ${passRate}%${colors.reset}`);
  console.log(`\nTotal Tests: ${totalTests}\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

runAllTests().catch((error) => {
  console.error(`${colors.red}Fatal error running tests:${colors.reset}`, error);
  process.exit(1);
});
