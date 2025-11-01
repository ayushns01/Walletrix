# Multi-Network Support in Walletrix

## Overview

Walletrix now supports multiple blockchain networks with an easy-to-use network selector dropdown. Users can seamlessly switch between different networks to manage their crypto assets across Ethereum mainnet, testnets, and Bitcoin networks.

## Supported Networks

### Ethereum Networks
1. **Ethereum Mainnet** 🟢
   - Network ID: `ethereum-mainnet`
   - Chain ID: 1
   - Explorer: https://etherscan.io
   - Use: Production transactions with real ETH

2. **Sepolia Testnet** 🟣
   - Network ID: `ethereum-sepolia`
   - Chain ID: 11155111
   - Explorer: https://sepolia.etherscan.io
   - Use: Testing and development with free testnet ETH
   - Faucet: https://sepoliafaucet.com

3. **Goerli Testnet** 🟠
   - Network ID: `ethereum-goerli`
   - Chain ID: 5
   - Explorer: https://goerli.etherscan.io
   - Use: Testing and development (being phased out)
   - Faucet: https://goerlifaucet.com

### Bitcoin Networks
1. **Bitcoin Mainnet** 🟠
   - Network ID: `bitcoin-mainnet`
   - Explorer: https://blockchain.info
   - Use: Production transactions with real BTC

2. **Bitcoin Testnet** 🟡
   - Network ID: `bitcoin-testnet`
   - Explorer: https://blockstream.info/testnet
   - Use: Testing and development with testnet BTC
   - Faucet: https://testnet-faucet.mempool.co

## Features

### Network Selector Component
- **Location**: Top right of the Dashboard
- **Visual Indicator**: Shows current network with colored icon
- **Dropdown Menu**: Click to see all available networks
- **Persistent Selection**: Network choice is saved to localStorage

### Network-Specific Features

#### Balance Display
- Shows balance only for the selected network
- Automatically updates when switching networks
- Supports both native coins (ETH/BTC) and ERC-20 tokens (Ethereum only)

#### Address Display
- Shows only the relevant address for the selected network
- Easy copy-to-clipboard functionality
- Different addresses for Ethereum and Bitcoin chains

#### Transaction History
- Displays transactions for the selected network only
- Filters by network automatically
- Shows network-specific transaction details

#### Token Support
- ERC-20 tokens are only shown on Ethereum networks
- Token balances are network-specific
- No tokens on Bitcoin networks (BTC only)

## How to Use

### Switching Networks

1. **Open the Dashboard**
   - You'll see the network selector in the top right corner

2. **Click the Network Selector**
   - A dropdown menu will appear showing all available networks
   - Current network is highlighted with a green dot

3. **Select a Network**
   - Click on any network to switch to it
   - The page will automatically refresh data for the new network

4. **View Network-Specific Data**
   - Balances, transactions, and addresses update automatically
   - Only relevant assets are shown

### Testing with Testnets

1. **Switch to a Testnet**
   - Select either Sepolia or Goerli for Ethereum
   - Select Bitcoin Testnet for Bitcoin

2. **Get Test Funds**
   - Visit the faucet for your chosen testnet
   - Enter your wallet address
   - Receive free test coins

3. **Test Transactions**
   - Send test transactions without spending real money
   - Experiment with features safely
   - Debug issues before mainnet deployment

## Technical Implementation

### Frontend Components

#### NetworkSelector.js
```javascript
// Available networks configuration
const networks = [
  { id: 'ethereum-mainnet', name: 'Ethereum Mainnet', chain: 'ethereum', network: 'mainnet' },
  { id: 'ethereum-sepolia', name: 'Sepolia Testnet', chain: 'ethereum', network: 'sepolia' },
  { id: 'ethereum-goerli', name: 'Goerli Testnet', chain: 'ethereum', network: 'goerli' },
  { id: 'bitcoin-mainnet', name: 'Bitcoin Mainnet', chain: 'bitcoin', network: 'mainnet' },
  { id: 'bitcoin-testnet', name: 'Bitcoin Testnet', chain: 'bitcoin', network: 'testnet' },
];
```

#### WalletContext.js
- Manages `selectedNetwork` state
- Persists network selection to localStorage
- Automatically refetches data when network changes
- Passes network parameter to all API calls

### Backend Services

#### Ethereum Service
```javascript
// Supports multiple RPC providers
this.providers = {
  mainnet: new ethers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_RPC),
  sepolia: new ethers.JsonRpcProvider(process.env.ETHEREUM_SEPOLIA_RPC),
  goerli: new ethers.JsonRpcProvider(process.env.ETHEREUM_GOERLI_RPC),
};
```

#### Bitcoin Service
- Supports mainnet and testnet via different APIs
- Network parameter passed to all blockchain queries
- Different explorers for different networks

### API Endpoints

All blockchain API endpoints accept an optional `network` query parameter:

```javascript
// Ethereum balance
GET /api/v1/blockchain/ethereum/balance/:address?network=sepolia

// Bitcoin balance
GET /api/v1/blockchain/bitcoin/balance/:address?network=testnet

// Transactions
GET /api/v1/blockchain/ethereum/transactions/:address?network=mainnet

// Token balances
GET /api/v1/tokens/balances/popular/:address?network=sepolia
```

## Configuration

### Environment Variables

Add these to your `.env` file for RPC endpoints:

```env
# Ethereum Networks
ETHEREUM_MAINNET_RPC=https://eth.public-rpc.com
ETHEREUM_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_API_KEY
ETHEREUM_GOERLI_RPC=https://goerli.infura.io/v3/YOUR_API_KEY

# API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key
BLOCKCYPHER_API_KEY=your_blockcypher_api_key

# Bitcoin endpoints are configured in services
```

### RPC Provider Setup

For better reliability and rate limits, consider using:

1. **Infura** (https://infura.io)
   - Ethereum mainnet and testnets
   - Free tier: 100,000 requests/day

2. **Alchemy** (https://alchemy.com)
   - Ethereum mainnet and testnets
   - Free tier: 300M compute units/month

3. **Etherscan** (https://etherscan.io/apis)
   - Transaction history and gas prices
   - Free tier: 5 calls/second

## Best Practices

### Development Workflow
1. Start on **Sepolia Testnet** for development
2. Test all features with free testnet coins
3. Switch to **Mainnet** only when ready for production

### User Safety
1. Clear visual indicators showing current network
2. Different colors for mainnet vs testnet
3. Persistent network selection across sessions
4. Confirmation required for mainnet transactions

### Performance Optimization
1. Data is cached per network
2. Only relevant data is fetched
3. Network changes trigger minimal re-renders
4. LocalStorage prevents unnecessary API calls

## Troubleshooting

### Issue: Network Switch Not Working
**Solution**: 
- Clear browser cache and localStorage
- Refresh the page with Ctrl+Shift+R
- Check browser console for errors

### Issue: Wrong Balance Displayed
**Solution**:
- Click the refresh button in Dashboard
- Ensure you're on the correct network
- Check if RPC endpoint is working

### Issue: Transactions Not Showing
**Solution**:
- Verify Etherscan API key is configured
- Check if the network has transaction history
- Testnet transactions may take longer to appear

### Issue: Can't Get Testnet Funds
**Solution**:
- Use alternative faucets (multiple available)
- Try different times (faucets have rate limits)
- Join Discord communities for testnet tokens

## Future Enhancements

### Planned Features
- [ ] Layer 2 support (Polygon, Arbitrum, Optimism)
- [ ] Custom RPC endpoint configuration
- [ ] Network status indicators (latency, block height)
- [ ] Multi-network portfolio overview
- [ ] Cross-chain swaps
- [ ] Network-specific gas optimization

### Additional Networks
- Polygon (MATIC)
- Binance Smart Chain (BSC)
- Avalanche (AVAX)
- Fantom (FTM)
- Arbitrum
- Optimism

## Resources

### Documentation
- [Ethereum Networks](https://ethereum.org/en/developers/docs/networks/)
- [Bitcoin Testnet](https://en.bitcoin.it/wiki/Testnet)
- [ethers.js Providers](https://docs.ethers.org/v6/api/providers/)

### Tools
- [Chainlist](https://chainlist.org) - Network configurations
- [Testnet Faucets](https://faucetlink.to) - Get testnet coins
- [Block Explorers](https://www.blockchain.com/explorer) - View transactions

### Community
- [Ethereum Discord](https://discord.gg/ethereum)
- [Bitcoin Developer Network](https://bitcoin.org/en/development)

## Support

For issues or questions:
1. Check this documentation
2. Review the code in `frontend/components/NetworkSelector.js`
3. Check console logs for error messages
4. Open an issue on GitHub

---

**Note**: Always test on testnets before using real funds on mainnet!
