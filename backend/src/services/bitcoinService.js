import axios from 'axios';

class BitcoinService {
  constructor() {
    this.networks = {
      mainnet: 'main',
      testnet: 'test3',
    };
    this.baseUrl = 'https://api.blockcypher.com/v1/btc';
  }

  async getBalance(address, network = 'mainnet') {
    try {
      const networkName = this.networks[network] || this.networks.mainnet;
      const url = `${this.baseUrl}/${networkName}/addrs/${address}/balance`;

      const response = await axios.get(url);
      const data = response.data;

      const balanceBTC = data.balance / 100000000;
      const unconfirmedBalanceBTC = data.unconfirmed_balance / 100000000;

      return {
        success: true,
        address,
        network,
        balance: {
          satoshis: data.balance,
          btc: balanceBTC.toFixed(8),
          unconfirmed: {
            satoshis: data.unconfirmed_balance,
            btc: unconfirmedBalanceBTC.toFixed(8),
          },
        },
        totalReceived: (data.total_received / 100000000).toFixed(8),
        totalSent: (data.total_sent / 100000000).toFixed(8),
        txCount: data.n_tx,
      };
    } catch (error) {
      console.error('Error getting Bitcoin balance:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async getTransactionHistory(address, network = 'mainnet', limit = 50) {
    try {
      const networkName = this.networks[network] || this.networks.mainnet;
      const url = `${this.baseUrl}/${networkName}/addrs/${address}/full?limit=${limit}`;

      const response = await axios.get(url);
      const data = response.data;

      const transactions = data.txs.map(tx => ({
        hash: tx.hash,
        blockHeight: tx.block_height,
        confirmed: tx.confirmed ? new Date(tx.confirmed).toISOString() : null,
        received: new Date(tx.received).toISOString(),
        confirmations: tx.confirmations,
        inputs: tx.inputs.map(input => ({
          address: input.addresses?.[0] || 'Unknown',
          value: (input.output_value / 100000000).toFixed(8),
        })),
        outputs: tx.outputs.map(output => ({
          address: output.addresses?.[0] || 'Unknown',
          value: (output.value / 100000000).toFixed(8),
        })),
        total: (tx.total / 100000000).toFixed(8),
        fees: (tx.fees / 100000000).toFixed(8),
        size: tx.size,
      }));

      return {
        success: true,
        address,
        network,
        transactions,
        count: transactions.length,
      };
    } catch (error) {
      console.error('Error getting Bitcoin transaction history:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async getTransaction(txHash, network = 'mainnet') {
    try {
      const networkName = this.networks[network] || this.networks.mainnet;
      const url = `${this.baseUrl}/${networkName}/txs/${txHash}`;

      const response = await axios.get(url);
      const tx = response.data;

      return {
        success: true,
        transaction: {
          hash: tx.hash,
          blockHeight: tx.block_height,
          blockHash: tx.block_hash,
          confirmed: tx.confirmed ? new Date(tx.confirmed).toISOString() : null,
          received: new Date(tx.received).toISOString(),
          confirmations: tx.confirmations,
          inputs: tx.inputs.map(input => ({
            address: input.addresses?.[0] || 'Unknown',
            value: (input.output_value / 100000000).toFixed(8),
          })),
          outputs: tx.outputs.map(output => ({
            address: output.addresses?.[0] || 'Unknown',
            value: (output.value / 100000000).toFixed(8),
          })),
          total: (tx.total / 100000000).toFixed(8),
          fees: (tx.fees / 100000000).toFixed(8),
          size: tx.size,
          preference: tx.preference,
        },
      };
    } catch (error) {
      console.error('Error getting Bitcoin transaction:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async getUTXOs(address, network = 'mainnet') {
    try {
      const networkName = this.networks[network] || this.networks.mainnet;
      const url = `${this.baseUrl}/${networkName}/addrs/${address}?unspentOnly=true`;

      const response = await axios.get(url);
      const data = response.data;

      const utxos = data.txrefs?.map(utxo => ({
        txHash: utxo.tx_hash,
        outputIndex: utxo.tx_output_n,
        value: utxo.value,
        valueBTC: (utxo.value / 100000000).toFixed(8),
        confirmations: utxo.confirmations,
        scriptPubKey: utxo.script,
      })) || [];

      return {
        success: true,
        address,
        network,
        utxos,
        count: utxos.length,
        totalValue: utxos.reduce((sum, utxo) => sum + utxo.value, 0),
        totalValueBTC: (utxos.reduce((sum, utxo) => sum + utxo.value, 0) / 100000000).toFixed(8),
      };
    } catch (error) {
      console.error('Error getting UTXOs:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async sendTransaction(signedTxHex, network = 'mainnet') {
    try {
      const networkName = this.networks[network] || this.networks.mainnet;
      const url = `${this.baseUrl}/${networkName}/txs/push`;

      const response = await axios.post(url, {
        tx: signedTxHex,
      });

      return {
        success: true,
        txHash: response.data.tx.hash,
        message: 'Transaction broadcast successfully',
      };
    } catch (error) {
      console.error('Error broadcasting Bitcoin transaction:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async getFeeEstimate(network = 'mainnet') {
    try {
      const networkName = this.networks[network] || this.networks.mainnet;
      const url = `${this.baseUrl}/${networkName}`;

      const response = await axios.get(url);
      const data = response.data;

      return {
        success: true,
        network,
        fees: {
          high: data.high_fee_per_kb,
          medium: data.medium_fee_per_kb,
          low: data.low_fee_per_kb,
        },
        feesPerByte: {
          high: Math.ceil(data.high_fee_per_kb / 1024),
          medium: Math.ceil(data.medium_fee_per_kb / 1024),
          low: Math.ceil(data.low_fee_per_kb / 1024),
        },
      };
    } catch (error) {
      console.error('Error getting fee estimate:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async getBlockHeight(network = 'mainnet') {
    try {
      const networkName = this.networks[network] || this.networks.mainnet;
      const url = `${this.baseUrl}/${networkName}`;

      const response = await axios.get(url);

      return {
        success: true,
        network,
        blockHeight: response.data.height,
        lastBlockHash: response.data.hash,
        lastBlockTime: new Date(response.data.time).toISOString(),
      };
    } catch (error) {
      console.error('Error getting block height:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }
}

export default new BitcoinService();
