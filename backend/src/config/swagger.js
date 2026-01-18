import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Walletrix API',
      version: '1.0.0',
      description: `
# Walletrix Cryptocurrency Wallet API

A comprehensive REST API for cryptocurrency wallet operations supporting multiple networks including Ethereum, Bitcoin, Polygon, Arbitrum, Optimism, Base, BSC, and Avalanche.

## Features

- 🔐 **Authentication**: JWT-based auth with 2FA support
- 💰 **Multi-Network**: Support for 8+ blockchain networks
- 🏦 **Wallet Management**: Create, import, encrypt wallets
- 💸 **Transactions**: Send, receive, monitor transactions
- 📊 **Prices**: Real-time cryptocurrency price data
- 🎯 **Tokens**: ERC-20 token support and balances
- 📈 **Portfolio**: Track balances and transaction history

## Security

- Rate limiting on all endpoints
- Input validation and sanitization
- Two-factor authentication (TOTP, SMS)
- Session management with refresh tokens
- Comprehensive error handling

## Networks Supported

| Network | Chain ID | Symbol | Type |
|---------|----------|---------|------|
| Ethereum | 1 | ETH | EVM |
| Ethereum Sepolia | 11155111 | ETH | EVM (Testnet) |
| Polygon | 137 | MATIC | EVM |
| Arbitrum | 42161 | ETH | EVM |
| Optimism | 10 | ETH | EVM |
| Base | 8453 | ETH | EVM |
| BSC | 56 | BNB | EVM |
| Avalanche | 43114 | AVAX | EVM |
| Bitcoin | - | BTC | UTXO |

## Rate Limits

- **Authentication**: 5 attempts per 15 minutes
- **Wallet Generation**: 10 per hour
- **Transactions**: 10 per minute
- **Blockchain Queries**: 60 per minute
- **Price Data**: 100 per minute

## Error Responses

All errors follow this format:
\`\`\`json
{
  "success": false,
  "error": "Human readable error message",
  "errorCode": "MACHINE_READABLE_CODE",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "details": {}
}
\`\`\`
      `,
      contact: {
        name: 'Walletrix Support',
        email: 'support@walletrix.com',
        url: 'https://walletrix.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.walletrix.com/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from login or registration'
        }
      },
      parameters: {
        networkParam: {
          name: 'network',
          in: 'path',
          required: true,
          description: 'Blockchain network identifier',
          schema: {
            type: 'string',
            enum: [
              'ethereum', 'ethereum-sepolia', 'polygon', 'arbitrum',
              'optimism', 'base', 'bsc', 'avalanche', 'bitcoin'
            ]
          },
          example: 'ethereum'
        },
        addressParam: {
          name: 'address',
          in: 'path',
          required: true,
          description: 'Blockchain address (Ethereum: 0x..., Bitcoin: 1... or 3... or bc1...)',
          schema: {
            type: 'string',
            pattern: '^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$'
          },
          example: '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95'
        },
        txHashParam: {
          name: 'txHash',
          in: 'path',
          required: true,
          description: 'Transaction hash',
          schema: {
            type: 'string',
            pattern: '^0x[a-fA-F0-9]{64}$'
          },
          example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['success', 'error', 'timestamp'],
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Human-readable error message',
              example: 'Invalid input provided'
            },
            errorCode: {
              type: 'string',
              description: 'Machine-readable error code',
              example: 'VALIDATION_ERROR'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-11-12T10:30:00.000Z'
            },
            details: {
              type: 'object',
              description: 'Additional error context',
              additionalProperties: true
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          required: ['success'],
          properties: {
            success: {
              type: 'boolean',
              example: true
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique user identifier',
              example: 'clp1234567890'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            name: {
              type: 'string',
              nullable: true,
              example: 'John Doe'
            },
            preferences: {
              $ref: '#/components/schemas/UserPreferences'
            }
          }
        },
        UserPreferences: {
          type: 'object',
          properties: {
            defaultNetwork: {
              type: 'string',
              example: 'ethereum-mainnet'
            },
            currency: {
              type: 'string',
              example: 'USD'
            },
            theme: {
              type: 'string',
              example: 'dark'
            },
            language: {
              type: 'string',
              example: 'en'
            },
            timezone: {
              type: 'string',
              example: 'UTC'
            }
          }
        },
        Wallet: {
          type: 'object',
          properties: {
            mnemonic: {
              type: 'string',
              description: '12 or 24 word recovery phrase',
              example: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
            },
            addresses: {
              type: 'object',
              description: 'Generated addresses for different networks',
              properties: {
                ethereum: { type: 'string', example: '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95' },
                bitcoin: { type: 'string', example: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
                polygon: { type: 'string', example: '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95' }
              }
            },
            privateKeys: {
              type: 'object',
              description: 'Private keys for different networks (NEVER expose in production)',
              properties: {
                ethereum: { type: 'string', example: '0x1234...abcd' },
                bitcoin: { type: 'string', example: 'L1234...abcd' }
              }
            }
          }
        },
        Balance: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              example: '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95'
            },
            balance: {
              type: 'string',
              description: 'Balance in wei/satoshis (string to handle large numbers)',
              example: '1500000000000000000'
            },
            balanceFormatted: {
              type: 'string',
              description: 'Human-readable balance',
              example: '1.5'
            },
            symbol: {
              type: 'string',
              example: 'ETH'
            },
            network: {
              type: 'string',
              example: 'ethereum'
            }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            hash: {
              type: 'string',
              example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            },
            from: {
              type: 'string',
              example: '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95'
            },
            to: {
              type: 'string',
              example: '0x8ba1f109551bD432803012645Hac136c'
            },
            value: {
              type: 'string',
              example: '1000000000000000000'
            },
            gasPrice: {
              type: 'string',
              example: '20000000000'
            },
            gasLimit: {
              type: 'string',
              example: '21000'
            },
            nonce: {
              type: 'number',
              example: 42
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'success', 'failed', 'dropped'],
              example: 'success'
            },
            blockNumber: {
              type: 'number',
              example: 18500000
            },
            blockHash: {
              type: 'string',
              example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-11-12T10:30:00.000Z'
            }
          }
        },
        TokenInfo: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
            },
            name: {
              type: 'string',
              example: 'USD Coin'
            },
            symbol: {
              type: 'string',
              example: 'USDC'
            },
            decimals: {
              type: 'number',
              example: 6
            },
            totalSupply: {
              type: 'string',
              example: '25000000000000000'
            }
          }
        },
        PriceData: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'ethereum'
            },
            symbol: {
              type: 'string',
              example: 'eth'
            },
            name: {
              type: 'string',
              example: 'Ethereum'
            },
            current_price: {
              type: 'number',
              example: 2340.75
            },
            market_cap: {
              type: 'number',
              example: 281234567890
            },
            price_change_24h: {
              type: 'number',
              example: 125.50
            },
            price_change_percentage_24h: {
              type: 'number',
              example: 5.67
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or token invalid',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Error' },
                  {
                    properties: {
                      errorCode: {
                        enum: ['TOKEN_MISSING', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'USER_NOT_FOUND']
                      }
                    }
                  }
                ]
              },
              example: {
                success: false,
                error: 'Access token required',
                errorCode: 'TOKEN_MISSING',
                timestamp: '2025-11-12T10:30:00.000Z'
              }
            }
          }
        },
        ValidationError: {
          description: 'Input validation failed',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Error' },
                  {
                    properties: {
                      errorCode: {
                        enum: ['VALIDATION_ERROR', 'INVALID_INPUT']
                      }
                    }
                  }
                ]
              },
              example: {
                success: false,
                error: 'Validation failed',
                errorCode: 'VALIDATION_ERROR',
                details: {
                  fields: ['email must be a valid email address']
                },
                timestamp: '2025-11-12T10:30:00.000Z'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Error' },
                  {
                    properties: {
                      errorCode: {
                        const: 'RATE_LIMIT_EXCEEDED'
                      }
                    }
                  }
                ]
              },
              example: {
                success: false,
                error: 'Too many requests',
                errorCode: 'RATE_LIMIT_EXCEEDED',
                timestamp: '2025-11-12T10:30:00.000Z'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User registration, login, and session management'
      },
      {
        name: 'Two-Factor Auth',
        description: 'Two-factor authentication setup and verification'
      },
      {
        name: 'Session Management',
        description: 'Session refresh, invalidation, and monitoring'
      },
      {
        name: 'Wallet Generation',
        description: 'Create and import cryptocurrency wallets'
      },
      {
        name: 'Database Wallets',
        description: 'Encrypted wallet storage and management'
      },
      {
        name: 'Blockchain',
        description: 'Blockchain data queries and network operations'
      },
      {
        name: 'Transactions',
        description: 'Send transactions and monitor status'
      },
      {
        name: 'Tokens',
        description: 'ERC-20 token information and balances'
      },
      {
        name: 'Prices',
        description: 'Cryptocurrency price data and market information'
      },
      {
        name: 'System',
        description: 'Health checks and system status'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './docs/swagger/*.yaml'
  ],
};

const specs = swaggerJsdoc(options);

export { specs };

export const swaggerConfig = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    tryItOutEnabled: true,
    syntaxHighlight: {
      theme: 'arta'
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin-bottom: 20px; }
    .swagger-ui .scheme-container { margin-bottom: 20px; }
  `,
  customSiteTitle: 'Walletrix API Documentation'
};

export default swaggerUi;
