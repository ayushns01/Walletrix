import request from 'supertest';
import app from '../../src/index.js';

describe('Wallet Routes', () => {
  describe('POST /api/v1/wallet/generate', () => {
    test('should generate new wallet successfully', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/generate')
        .send({
          strength: 128,
          networks: ['ethereum', 'bitcoin']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Wallet generated successfully');
      expect(response.body).toHaveProperty('wallet');

      const { wallet } = response.body;
      expect(wallet).toHaveProperty('mnemonic');
      expect(wallet).toHaveProperty('addresses');
      expect(wallet).toHaveProperty('privateKeys');

      expect(wallet.mnemonic).toBeValidMnemonic();

      expect(wallet.addresses).toHaveProperty('ethereum');
      expect(wallet.addresses).toHaveProperty('bitcoin');
      expect(wallet.addresses.ethereum).toBeValidEthereumAddress();
      expect(wallet.addresses.bitcoin).toBeValidBitcoinAddress();

      expect(wallet.privateKeys).toHaveProperty('ethereum');
      expect(wallet.privateKeys).toHaveProperty('bitcoin');
    });

    test('should generate 24-word mnemonic with strength 256', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/generate')
        .send({ strength: 256 })
        .expect(200);

      const words = response.body.wallet.mnemonic.split(' ');
      expect(words).toHaveLength(24);
    });

    test('should generate only requested networks', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/generate')
        .send({
          networks: ['ethereum', 'polygon']
        })
        .expect(200);

      const { addresses } = response.body.wallet;
      expect(addresses).toHaveProperty('ethereum');
      expect(addresses).toHaveProperty('polygon');
      expect(addresses).not.toHaveProperty('bitcoin');
    });

    test('should fail with invalid strength', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/generate')
        .send({ strength: 96 })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode', 'VALIDATION_ERROR');
    });

    test('should fail with unsupported network', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/generate')
        .send({
          networks: ['unsupported-network']
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should respect rate limiting', async () => {
      const promises = Array(12).fill().map(() =>
        request(app)
          .post('/api/v1/wallet/generate')
          .send({})
      );

      const responses = await Promise.all(promises);

      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('POST /api/v1/wallet/import/mnemonic', () => {
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    test('should import wallet from valid mnemonic', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/import/mnemonic')
        .send({
          mnemonic: testMnemonic,
          networks: ['ethereum', 'bitcoin']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('wallet');

      const { wallet } = response.body;
      expect(wallet).toHaveProperty('mnemonic', testMnemonic);
      expect(wallet.addresses).toHaveProperty('ethereum');
      expect(wallet.addresses).toHaveProperty('bitcoin');
      expect(wallet.addresses.ethereum).toBeValidEthereumAddress();
    });

    test('should generate deterministic addresses', async () => {
      const response1 = await request(app)
        .post('/api/v1/wallet/import/mnemonic')
        .send({ mnemonic: testMnemonic })
        .expect(200);

      const response2 = await request(app)
        .post('/api/v1/wallet/import/mnemonic')
        .send({ mnemonic: testMnemonic })
        .expect(200);

      expect(response1.body.wallet.addresses.ethereum)
        .toBe(response2.body.wallet.addresses.ethereum);
    });

    test('should handle passphrase correctly', async () => {
      const response1 = await request(app)
        .post('/api/v1/wallet/import/mnemonic')
        .send({ mnemonic: testMnemonic })
        .expect(200);

      const response2 = await request(app)
        .post('/api/v1/wallet/import/mnemonic')
        .send({
          mnemonic: testMnemonic,
          passphrase: 'test-passphrase'
        })
        .expect(200);

      expect(response1.body.wallet.addresses.ethereum)
        .not.toBe(response2.body.wallet.addresses.ethereum);
    });

    test('should fail with invalid mnemonic', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/import/mnemonic')
        .send({
          mnemonic: 'invalid mnemonic phrase'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode', 'INVALID_MNEMONIC');
    });

    test('should fail with missing mnemonic', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/import/mnemonic')
        .send({
          networks: ['ethereum']
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/wallet/import/private-key', () => {
    const testPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    test('should import wallet from private key', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/import/private-key')
        .send({
          privateKey: testPrivateKey,
          network: 'ethereum'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('wallet');

      const { wallet } = response.body;
      expect(wallet).toHaveProperty('address');
      expect(wallet).toHaveProperty('privateKey');
      expect(wallet).toHaveProperty('network', 'ethereum');
      expect(wallet.address).toBeValidEthereumAddress();
    });

    test('should handle private key without 0x prefix', async () => {
      const privateKeyWithoutPrefix = testPrivateKey.slice(2);

      const response = await request(app)
        .post('/api/v1/wallet/import/private-key')
        .send({
          privateKey: privateKeyWithoutPrefix,
          network: 'ethereum'
        })
        .expect(200);

      expect(response.body.wallet.address).toBeValidEthereumAddress();
    });

    test('should generate consistent address for same private key', async () => {
      const response1 = await request(app)
        .post('/api/v1/wallet/import/private-key')
        .send({
          privateKey: testPrivateKey,
          network: 'ethereum'
        })
        .expect(200);

      const response2 = await request(app)
        .post('/api/v1/wallet/import/private-key')
        .send({
          privateKey: testPrivateKey,
          network: 'ethereum'
        })
        .expect(200);

      expect(response1.body.wallet.address).toBe(response2.body.wallet.address);
    });

    test('should fail with invalid private key', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/import/private-key')
        .send({
          privateKey: 'invalid-key',
          network: 'ethereum'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode', 'INVALID_PRIVATE_KEY');
    });

    test('should fail with unsupported network', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/import/private-key')
        .send({
          privateKey: testPrivateKey,
          network: 'unsupported'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/import/private-key')
        .send({
          privateKey: testPrivateKey
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/wallet/validate/:network/:address', () => {
    test('should validate correct Ethereum address', async () => {
      const address = '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95';

      const response = await request(app)
        .get(`/api/v1/wallet/validate/ethereum/${address}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('address', address);
      expect(response.body).toHaveProperty('network', 'ethereum');
      expect(response.body).toHaveProperty('checksumAddress');
    });

    test('should validate correct Bitcoin address', async () => {
      const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

      const response = await request(app)
        .get(`/api/v1/wallet/validate/bitcoin/${address}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('address', address);
      expect(response.body).toHaveProperty('network', 'bitcoin');
    });

    test('should handle case insensitive Ethereum addresses', async () => {
      const address = '0x742d35cc6465c395c6de4d83f2e47aa4e6aa6b95';

      const response = await request(app)
        .get(`/api/v1/wallet/validate/ethereum/${address}`)
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body.checksumAddress).toBe('0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95');
    });

    test('should reject invalid Ethereum address', async () => {
      const response = await request(app)
        .get('/api/v1/wallet/validate/ethereum/0xinvalid')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('valid', false);
    });

    test('should reject invalid Bitcoin address', async () => {
      const response = await request(app)
        .get('/api/v1/wallet/validate/bitcoin/invalid-bitcoin-address')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('valid', false);
    });

    test('should reject address for wrong network', async () => {
      const ethAddress = '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95';

      const response = await request(app)
        .get(`/api/v1/wallet/validate/bitcoin/${ethAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('valid', false);
    });

    test('should fail with unsupported network', async () => {
      const address = '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95';

      const response = await request(app)
        .get(`/api/v1/wallet/validate/unsupported/${address}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/wallet/encrypt', () => {
    test('should encrypt data successfully', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/encrypt')
        .send({
          data: 'sensitive wallet data',
          password: 'secure-password-123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('encrypted');

      const { encrypted } = response.body;
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
    });

    test('should produce different ciphertext for same data', async () => {
      const payload = {
        data: 'test data',
        password: 'test-password'
      };

      const response1 = await request(app)
        .post('/api/v1/wallet/encrypt')
        .send(payload)
        .expect(200);

      const response2 = await request(app)
        .post('/api/v1/wallet/encrypt')
        .send(payload)
        .expect(200);

      expect(response1.body.encrypted.encryptedData)
        .not.toBe(response2.body.encrypted.encryptedData);
    });

    test('should fail with empty data', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/encrypt')
        .send({
          data: '',
          password: 'secure-password-123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/encrypt')
        .send({
          data: 'test data',
          password: '123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/wallet/decrypt', () => {
    let encryptedData;
    const password = 'secure-password-123';

    beforeEach(async () => {
      const encryptResponse = await request(app)
        .post('/api/v1/wallet/encrypt')
        .send({
          data: 'sensitive wallet data',
          password
        })
        .expect(200);

      encryptedData = encryptResponse.body.encrypted;
    });

    test('should decrypt data successfully', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/decrypt')
        .send({
          encryptedData,
          password
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('decryptedData', 'sensitive wallet data');
    });

    test('should fail with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/decrypt')
        .send({
          encryptedData,
          password: 'wrong-password'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Decryption failed');
    });

    test('should fail with tampered data', async () => {
      const tamperedData = {
        ...encryptedData,
        encryptedData: encryptedData.encryptedData.slice(0, -2) + 'XX'
      };

      const response = await request(app)
        .post('/api/v1/wallet/decrypt')
        .send({
          encryptedData: tamperedData,
          password
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should fail with incomplete encrypted data', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/decrypt')
        .send({
          encryptedData: { encryptedData: 'incomplete' },
          password
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
