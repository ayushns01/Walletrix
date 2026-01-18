import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bip39 from 'bip39';
import crypto from 'crypto';

const bip32 = BIP32Factory(ecc);

class MultiSigService {

    createBitcoinMultisig(publicKeys, requiredSignatures, network = 'mainnet') {

        if (!publicKeys || !Array.isArray(publicKeys) || publicKeys.length < 2) {
            throw new Error('At least 2 public keys required');
        }

        if (requiredSignatures < 1 || requiredSignatures > publicKeys.length) {
            throw new Error('Invalid threshold: must be between 1 and total signers');
        }

        if (publicKeys.length > 15) {
            throw new Error('Maximum 15 signers supported for P2SH multisig');
        }

        try {
            const btcNetwork = network === 'mainnet'
                ? bitcoin.networks.bitcoin
                : bitcoin.networks.testnet;

            const pubkeys = publicKeys.map(pk => {

                const cleanPk = pk.startsWith('0x') ? pk.slice(2) : pk;
                return Buffer.from(cleanPk, 'hex');
            });

            const p2ms = bitcoin.payments.p2ms({
                m: requiredSignatures,
                pubkeys,
                network: btcNetwork,
            });

            const p2sh = bitcoin.payments.p2sh({
                redeem: p2ms,
                network: btcNetwork,
            });

            return {
                address: p2sh.address,
                redeemScript: p2ms.output.toString('hex'),
                scriptHash: p2sh.hash.toString('hex'),
                requiredSignatures,
                totalSigners: publicKeys.length,
                network,
                type: 'P2SH',
            };
        } catch (error) {
            console.error('Bitcoin multisig creation error:', error.message);
            throw new Error('Failed to create Bitcoin multisig: ' + error.message);
        }
    }

    createBitcoinSegWitMultisig(publicKeys, requiredSignatures, network = 'mainnet') {
        if (!publicKeys || !Array.isArray(publicKeys) || publicKeys.length < 2) {
            throw new Error('At least 2 public keys required');
        }

        if (requiredSignatures < 1 || requiredSignatures > publicKeys.length) {
            throw new Error('Invalid threshold');
        }

        try {
            const btcNetwork = network === 'mainnet'
                ? bitcoin.networks.bitcoin
                : bitcoin.networks.testnet;

            const pubkeys = publicKeys.map(pk => {
                const cleanPk = pk.startsWith('0x') ? pk.slice(2) : pk;
                return Buffer.from(cleanPk, 'hex');
            });

            const p2ms = bitcoin.payments.p2ms({
                m: requiredSignatures,
                pubkeys,
                network: btcNetwork,
            });

            const p2wsh = bitcoin.payments.p2wsh({
                redeem: p2ms,
                network: btcNetwork,
            });

            return {
                address: p2wsh.address,
                witnessScript: p2ms.output.toString('hex'),
                witnessScriptHash: p2wsh.hash.toString('hex'),
                requiredSignatures,
                totalSigners: publicKeys.length,
                network,
                type: 'P2WSH',
            };
        } catch (error) {
            console.error('SegWit multisig creation error:', error.message);
            throw new Error('Failed to create SegWit multisig: ' + error.message);
        }
    }

    createEthereumMultisig(owners, threshold) {
        if (!owners || !Array.isArray(owners) || owners.length < 1) {
            throw new Error('At least 1 owner required');
        }

        if (threshold < 1 || threshold > owners.length) {
            throw new Error('Invalid threshold');
        }

        owners.forEach((owner, index) => {
            if (!ethers.isAddress(owner)) {
                throw new Error(`Invalid Ethereum address at index ${index}: ${owner}`);
            }
        });

        const checksummedOwners = owners.map(addr => ethers.getAddress(addr));

        const saltNonce = crypto.randomBytes(4).readUInt32BE(0);

        const initDataHash = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ['address[]', 'uint256', 'uint256'],
                [checksummedOwners.sort(), threshold, saltNonce]
            )
        );

        const safeFactoryAddress = '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2';

        const predictedAddress = ethers.getCreate2Address(
            safeFactoryAddress,
            ethers.keccak256(ethers.toUtf8Bytes(saltNonce.toString())),
            initDataHash
        );

        return {
            address: predictedAddress,
            type: 'gnosis-safe',
            owners: checksummedOwners,
            threshold,
            version: '1.3.0',
            configuration: {
                owners: checksummedOwners,
                threshold,
                saltNonce,
                initDataHash,
            },
            deploymentInfo: {
                note: 'This is a predicted address. Actual deployment requires gas fees.',
                safeFactoryAddress,
                predictedAddress,
                deployed: false,
            },
        };
    }

    createHDMultisig(mnemonics, threshold, network = 'mainnet', derivationPath = "m/48'/0'/0'/2'/0/0") {
        if (!mnemonics || !Array.isArray(mnemonics) || mnemonics.length < 2) {
            throw new Error('At least 2 mnemonics required');
        }

        mnemonics.forEach((mnemonic, index) => {
            if (!bip39.validateMnemonic(mnemonic)) {
                throw new Error(`Invalid mnemonic at index ${index}`);
            }
        });

        try {

            const publicKeys = mnemonics.map(mnemonic => {
                const seed = bip39.mnemonicToSeedSync(mnemonic);
                const root = bip32.fromSeed(seed);
                const child = root.derivePath(derivationPath);
                return child.publicKey.toString('hex');
            });

            const multisig = this.createBitcoinSegWitMultisig(publicKeys, threshold, network);

            return {
                ...multisig,
                derivationPath,
                signerCount: mnemonics.length,
                hdWallet: true,
            };
        } catch (error) {
            console.error('HD multisig creation error:', error.message);
            throw new Error('Failed to create HD multisig: ' + error.message);
        }
    }

    validateMultisigConfig(config) {
        const errors = [];
        const warnings = [];

        if (!config.requiredSignatures || !config.totalSigners) {
            errors.push('Missing required fields');
        }

        if (config.requiredSignatures > config.totalSigners) {
            errors.push('Threshold exceeds total signers');
        }

        if (config.requiredSignatures === 1 && config.totalSigners > 1) {
            warnings.push('1-of-N multisig provides no additional security');
        }

        if (config.requiredSignatures === config.totalSigners) {
            warnings.push('Requires ALL signers - loss of one key means loss of funds');
        }

        const ratio = config.requiredSignatures / config.totalSigners;
        if (ratio < 0.5) {
            warnings.push('Low threshold (< 50%) may be insecure');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            recommendation: this.getThresholdRecommendation(config.totalSigners),
        };
    }

    getThresholdRecommendation(totalSigners) {
        const recommendations = {
            2: { min: 2, recommended: 2, max: 2 },
            3: { min: 2, recommended: 2, max: 3 },
            4: { min: 2, recommended: 3, max: 4 },
            5: { min: 3, recommended: 3, max: 5 },
            7: { min: 4, recommended: 5, max: 7 },
        };

        const rec = recommendations[totalSigners] || {
            min: Math.ceil(totalSigners * 0.5),
            recommended: Math.ceil(totalSigners * 0.6),
            max: totalSigners,
        };

        return {
            ...rec,
            explanation: `For ${totalSigners} signers, recommend ${rec.recommended}-of-${totalSigners}`,
        };
    }

    generateSetupInstructions(multisigConfig) {
        return `
MULTI-SIGNATURE WALLET SETUP
=============================

Configuration:
- Type: ${multisigConfig.type || 'Bitcoin P2SH'}
- Required Signatures: ${multisigConfig.requiredSignatures}
- Total Signers: ${multisigConfig.totalSigners}
- Network: ${multisigConfig.network || 'mainnet'}
- Address: ${multisigConfig.address}

Security Level:
- Threshold: ${((multisigConfig.requiredSignatures / multisigConfig.totalSigners) * 100).toFixed(0)}%
- ${multisigConfig.requiredSignatures} out of ${multisigConfig.totalSigners} signatures required

Setup Steps:
1. Each signer generates their own mnemonic/private key
2. Share public keys (NEVER share private keys)
3. Create multisig address using shared public keys
4. All signers verify the multisig address matches
5. Fund the multisig address

To Spend:
1. Create unsigned transaction
2. Collect ${multisigConfig.requiredSignatures} signatures from different signers
3. Combine signatures
4. Broadcast signed transaction

Important:
- Each signer must backup their own keys
- Loss of ${multisigConfig.totalSigners - multisigConfig.requiredSignatures + 1} keys means loss of funds
- Never share private keys or mnemonics
- Verify all addresses before sending funds
    `.trim();
    }
}

export default new MultiSigService();
