import argon2 from 'argon2';

/**
 * Argon2id Service - Industry-leading password hashing
 * Argon2id combines Argon2i (data-independent) and Argon2d (data-dependent)
 * for optimal resistance against side-channel and GPU attacks
 * 
 * Winner of the Password Hashing Competition (2015)
 * Recommended by: OWASP, NIST, and major security organizations
 */

const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536,      // 64 MB (OWASP recommendation for server-side)
  timeCost: 3,            // 3 iterations
  parallelism: 4,         // 4 parallel threads
  hashLength: 32,         // 256-bit output
  saltLength: 16,         // 128-bit salt (automatically generated)
};

class Argon2Service {
  /**
   * Hash password using Argon2id
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Argon2 hash string (includes salt and parameters)
   */
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

  /**
   * Verify password against Argon2 hash
   * @param {string} hash - Stored Argon2 hash
   * @param {string} password - Password to verify
   * @returns {Promise<boolean>} - True if password matches
   */
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

  /**
   * Check if hash needs rehashing (parameters changed)
   * Useful for upgrading security parameters over time
   * @param {string} hash - Stored hash
   * @returns {Promise<boolean>} - True if rehash needed
   */
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

  /**
   * Get hash algorithm identifier
   * @param {string} hash - Password hash
   * @returns {string} - Algorithm identifier ('argon2id', 'bcrypt', 'unknown')
   */
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

  /**
   * Verify password with automatic algorithm detection
   * Supports both Argon2 and bcrypt for backward compatibility
   * @param {string} hash - Stored hash
   * @param {string} password - Password to verify
   * @returns {Promise<Object>} - { valid: boolean, algorithm: string, needsRehash: boolean }
   */
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
      // For bcrypt hashes, we'll need to import bcrypt
      // This allows gradual migration from bcrypt to Argon2
      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, hash);

      return {
        valid,
        algorithm,
        needsRehash: valid, // Always rehash bcrypt to Argon2
      };
    }

    return {
      valid: false,
      algorithm: 'unknown',
      needsRehash: false,
    };
  }

  /**
   * Get configuration details (for debugging/monitoring)
   * @returns {Object} - Current Argon2 configuration
   */
  getConfig() {
    return {
      ...ARGON2_CONFIG,
      type: 'argon2id',
      memoryCostMB: ARGON2_CONFIG.memoryCost / 1024,
    };
  }
}

export default new Argon2Service();
