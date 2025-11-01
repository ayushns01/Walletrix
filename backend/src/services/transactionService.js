import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import { ECPairFactory } from 'ecpair';
import ethereumService from './ethereumService.js';
import bitcoinService from './bitcoinService.js';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

/**
 * Transaction Service
 * Handles transaction creation, signing, and broadcasting
 */

class TransactionService {
  /**
   * Create and sign Ethereum transaction
   * @param {string} privateKey - Sender's private key
   * @param {string} toAddress - Recipient address
   * @param {string} amount - Amount in ETH
   * @param {string} network - Network name
   */
  async createEthereumTransaction(privateKey, toAddress, amount, network = 'mainnet') {
    try {
      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey);
      const provider = ethereumService.getProvider(network);
      const connectedWallet = wallet.connect(provider);

      // Get transaction parameters
      const [nonce, feeData] = await Promise.all([
        provider.getTransactionCount(wallet.address),
        provider.getFeeData(),
      ]);

      // Build transaction
      const tx = {
        to: toAddress,
        value: ethers.parseEther(amount.toString()),
        nonce,
        gasLimit: 21000, // Standard ETH transfer
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        chainId: (await provider.getNetwork()).chainId,
      };

      // Sign transaction
      const signedTx = await connectedWallet.signTransaction(tx);

      return {
        success: true,
        transaction: {
          from: wallet.address,
          to: toAddress,
          value: amount,
          nonce,
          gasLimit: 21000,
          maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas || 0, 'gwei'),
          signedTx,
        },
      };
    } catch (error) {
      console.error('Error creating Ethereum transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create and sign ERC-20 token transaction
   */
  async createTokenTransaction(privateKey, tokenAddress, toAddress, amount, decimals, network = 'mainnet') {
    try {
      const wallet = new ethers.Wallet(privateKey);
      const provider = ethereumService.getProvider(network);
      const connectedWallet = wallet.connect(provider);

      // ERC-20 transfer function signature
      const tokenInterface = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)',
      ]);

      const data = tokenInterface.encodeFunctionData('transfer', [
        toAddress,
        ethers.parseUnits(amount.toString(), decimals),
      ]);

      // Get transaction parameters
      const [nonce, feeData] = await Promise.all([
        provider.getTransactionCount(wallet.address),
        provider.getFeeData(),
      ]);

      // Estimate gas for token transfer
      const gasLimit = await provider.estimateGas({
        from: wallet.address,
        to: tokenAddress,
        data,
      });

      // Build transaction
      const tx = {
        to: tokenAddress,
        data,
        nonce,
        gasLimit,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        chainId: (await provider.getNetwork()).chainId,
      };

      // Sign transaction
      const signedTx = await connectedWallet.signTransaction(tx);

      return {
        success: true,
        transaction: {
          from: wallet.address,
          to: toAddress,
          token: tokenAddress,
          amount,
          nonce,
          gasLimit: gasLimit.toString(),
          signedTx,
        },
      };
    } catch (error) {
      console.error('Error creating token transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send Ethereum transaction
   */
  async sendEthereumTransaction(privateKey, toAddress, amount, network = 'mainnet') {
    try {
      // Create and sign transaction
      const txResult = await this.createEthereumTransaction(privateKey, toAddress, amount, network);
      
      if (!txResult.success) {
        return txResult;
      }

      // Broadcast transaction
      const broadcastResult = await ethereumService.sendTransaction(
        txResult.transaction.signedTx,
        network
      );

      return {
        success: true,
        txHash: broadcastResult.txHash,
        from: txResult.transaction.from,
        to: toAddress,
        value: amount,
        message: 'Transaction sent successfully',
      };
    } catch (error) {
      console.error('Error sending Ethereum transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send ERC-20 token transaction
   */
  async sendTokenTransaction(privateKey, tokenAddress, toAddress, amount, decimals, network = 'mainnet') {
    try {
      // Create and sign transaction
      const txResult = await this.createTokenTransaction(
        privateKey,
        tokenAddress,
        toAddress,
        amount,
        decimals,
        network
      );
      
      if (!txResult.success) {
        return txResult;
      }

      // Broadcast transaction
      const broadcastResult = await ethereumService.sendTransaction(
        txResult.transaction.signedTx,
        network
      );

      return {
        success: true,
        txHash: broadcastResult.txHash,
        from: txResult.transaction.from,
        to: toAddress,
        token: tokenAddress,
        amount,
        message: 'Token transaction sent successfully',
      };
    } catch (error) {
      console.error('Error sending token transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create Bitcoin transaction (simplified - requires UTXO selection)
   * Note: This is a basic implementation. Production apps need more sophisticated UTXO management
   */
  async createBitcoinTransaction(privateKeyWIF, toAddress, amount, network = 'mainnet') {
    try {
      const btcNetwork = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
      
      // Create key pair from WIF
      const keyPair = ECPair.fromWIF(privateKeyWIF, btcNetwork);
      const fromAddress = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: btcNetwork }).address;

      // Get UTXOs for the address
      const utxoResult = await bitcoinService.getUTXOs(fromAddress, network);
      
      if (!utxoResult.success || utxoResult.utxos.length === 0) {
        throw new Error('No UTXOs available for transaction');
      }

      // Get fee estimate
      const feeResult = await bitcoinService.getFeeEstimate(network);
      const feePerByte = feeResult.success ? feeResult.feesPerByte.medium : 10;

      // Create transaction builder
      const psbt = new bitcoin.Psbt({ network: btcNetwork });

      // Calculate required amount in satoshis
      const amountSatoshis = Math.floor(parseFloat(amount) * 100000000);
      const estimatedSize = 250; // Rough estimate
      const fee = feePerByte * estimatedSize;
      const totalRequired = amountSatoshis + fee;

      // Select UTXOs (simple selection - first fit)
      let totalInput = 0;
      const selectedUTXOs = [];

      for (const utxo of utxoResult.utxos) {
        if (totalInput >= totalRequired) break;
        selectedUTXOs.push(utxo);
        totalInput += utxo.value;
      }

      if (totalInput < totalRequired) {
        throw new Error('Insufficient funds');
      }

      // Add inputs
      for (const utxo of selectedUTXOs) {
        psbt.addInput({
          hash: utxo.txHash,
          index: utxo.outputIndex,
          witnessUtxo: {
            script: Buffer.from(utxo.scriptPubKey, 'hex'),
            value: utxo.value,
          },
        });
      }

      // Add output (recipient)
      psbt.addOutput({
        address: toAddress,
        value: amountSatoshis,
      });

      // Add change output if necessary
      const change = totalInput - totalRequired;
      if (change > 546) { // Dust limit
        psbt.addOutput({
          address: fromAddress,
          value: change,
        });
      }

      // Sign inputs
      psbt.signAllInputs(keyPair);
      psbt.finalizeAllInputs();

      const tx = psbt.extractTransaction();
      const txHex = tx.toHex();

      return {
        success: true,
        transaction: {
          from: fromAddress,
          to: toAddress,
          amount,
          fee: (fee / 100000000).toFixed(8),
          txHex,
          txId: tx.getId(),
        },
      };
    } catch (error) {
      console.error('Error creating Bitcoin transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send Bitcoin transaction
   */
  async sendBitcoinTransaction(privateKeyWIF, toAddress, amount, network = 'mainnet') {
    try {
      // Create transaction
      const txResult = await this.createBitcoinTransaction(privateKeyWIF, toAddress, amount, network);
      
      if (!txResult.success) {
        return txResult;
      }

      // Broadcast transaction
      const broadcastResult = await bitcoinService.sendTransaction(
        txResult.transaction.txHex,
        network
      );

      return {
        success: true,
        txHash: broadcastResult.txHash,
        from: txResult.transaction.from,
        to: toAddress,
        amount,
        fee: txResult.transaction.fee,
        message: 'Bitcoin transaction sent successfully',
      };
    } catch (error) {
      console.error('Error sending Bitcoin transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new TransactionService();
