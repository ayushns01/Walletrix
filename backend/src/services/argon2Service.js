import argon2 from 'argon2';

const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
  saltLength: 16,
};

class Argon2Service {

  async hashPassword(password) {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const hash = await argon2.hash(password, ARGON2_CONFIG);
      return hash;
    } catch (error) {
      console.error('Argon2 hashing error:', error.message);
      throw new Error('Password hashing failed');
    }
  }

  async verifyPassword(hash, password) {
    try {
      if (!hash || !password) {
        return false;
      }

      return await argon2.verify(hash, password);
    } catch (error) {
      console.error('Argon2 verification error:', error.message);
      return false;
    }
  }

  async needsRehash(hash) {
    try {
      if (!hash) {
        return true;
      }

      return argon2.needsRehash(hash, ARGON2_CONFIG);
    } catch (error) {
      console.error('Argon2 rehash check error:', error.message);
      return true;
    }
  }

  getHashAlgorithm(hash) {
    if (!hash) {
      return 'unknown';
    }

    if (hash.startsWith('$argon2id$')) {
      return 'argon2id';
    } else if (hash.startsWith('$argon2i$')) {
      return 'argon2i';
    } else if (hash.startsWith('$argon2d$')) {
      return 'argon2d';
    } else if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
      return 'bcrypt';
    }

    return 'unknown';
  }

  async verifyWithMigration(hash, password) {
    const algorithm = this.getHashAlgorithm(hash);

    if (algorithm.startsWith('argon2')) {
      const valid = await this.verifyPassword(hash, password);
      const needsRehash = valid ? await this.needsRehash(hash) : false;

      return {
        valid,
        algorithm,
        needsRehash,
      };
    } else if (algorithm === 'bcrypt') {

      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, hash);

      return {
        valid,
        algorithm,
        needsRehash: valid,
      };
    }

    return {
      valid: false,
      algorithm: 'unknown',
      needsRehash: false,
    };
  }

  getConfig() {
    return {
      ...ARGON2_CONFIG,
      type: 'argon2id',
      memoryCostMB: ARGON2_CONFIG.memoryCost / 1024,
    };
  }
}

export default new Argon2Service();
