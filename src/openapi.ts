export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'DataHub Backend API',
    version: '1.0.0',
    description: 'Interactive API documentation for the DataHub backend.',
  },
  servers: [
    {
      url: '/',
      description: 'Local server root',
    },
  ],
  paths: {
    '/': {
      get: {
        summary: 'Health check',
        description: 'Returns the status of the backend server.',
        responses: {
          '200': {
            description: 'Server is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    version: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/paystack-public-key': {
      get: {
        summary: 'Get Paystack public key',
        tags: ['Configuration'],
        description: 'Returns the public Paystack key used by the client.',
        responses: {
          '200': {
            description: 'Paystack public key response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    publicKey: { type: 'string' },
                  },
                  required: ['publicKey'],
                },
              },
            },
          },
        },
      },
    },
    '/api/buy-data/initiate': {
      post: {
        summary: 'Initiate data purchase',
        tags: ['Data Purchase'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  bundleId: { type: 'string', format: 'uuid' },
                  phone: { type: 'string', example: '0244123456' },
                  payWithWallet: { type: 'boolean' },
                },
                required: ['accessToken', 'bundleId', 'phone'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Transaction created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    transactionId: { type: 'string' },
                    reference: { type: ['string', 'null'] },
                    paid: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation or bundle error' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/buy-data/verify': {
      post: {
        summary: 'Verify a Paystack data purchase',
        tags: ['Data Purchase'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  reference: { type: 'string' },
                },
                required: ['accessToken', 'reference'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    transactionId: { type: 'string' },
                    status: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': { description: 'Transaction not found' },
          '403': { description: 'Forbidden' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/wallet/topup': {
      post: {
        summary: 'Create a wallet top-up transaction',
        tags: ['Wallet'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  amountGhs: { type: 'number', minimum: 5, maximum: 10000 },
                },
                required: ['accessToken', 'amountGhs'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Top-up transaction created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    transactionId: { type: 'string' },
                    reference: { type: 'string' },
                    amountPesewas: { type: 'number' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '500': { description: 'Server error' },
        },
      },
    },
    // Authentication Module
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  full_name: { type: 'string' },
                  phone: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '201': { description: 'User registered' },
          '400': { description: 'Registration failed' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Login user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout user',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Logout successful' }
        }
      }
    },
    '/api/auth/refresh': {
      post: {
        summary: 'Refresh session',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refresh_token: { type: 'string' }
                },
                required: ['refresh_token']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Session refreshed' },
          '401': { description: 'Invalid refresh token' }
        }
      }
    },
    '/api/auth/log-event': {
      post: {
        summary: 'Log auth event',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  event: { type: 'string', enum: ['LOGIN', 'LOGOUT'] }
                },
                required: ['event']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Event logged' }
        }
      }
    },
    // Admin Module
    '/api/admin/users': {
      get: {
        summary: 'List all users',
        tags: ['Admin - Users'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or phone' }
        ],
        responses: { '200': { description: 'List of users' } }
      }
    },
    '/api/admin/users/wallet': {
      post: {
        summary: 'Update user wallet',
        tags: ['Admin - Users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  amountPesewas: { type: 'number' },
                  reason: { type: 'string' }
                },
                required: ['userId', 'amountPesewas', 'reason']
              }
            }
          }
        },
        responses: { '200': { description: 'Wallet updated' } }
      }
    },
    '/api/admin/users/status': {
      post: {
        summary: 'Update user status/role',
        tags: ['Admin - Users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  role: { type: 'string', enum: ['user', 'admin', 'super_admin', 'suspended'] }
                },
                required: ['userId', 'role']
              }
            }
          }
        },
        responses: { '200': { description: 'Status updated' } }
      }
    },
    '/api/admin/bundles': {
      get: {
        summary: 'List all bundles for management',
        tags: ['Admin - Bundles'],
        responses: { '200': { description: 'List of bundles' } }
      },
      post: {
        summary: 'Create a new bundle',
        tags: ['Admin - Bundles'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Bundle created' } }
      }
    },
    '/api/admin/bundles/{id}': {
      patch: {
        summary: 'Update a bundle',
        tags: ['Admin - Bundles'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Bundle updated' } }
      }
    },
    '/api/admin/transactions': {
      get: {
        summary: 'List all transactions',
        tags: ['Admin - Transactions'],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'userId', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'offset', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { '200': { description: 'List of transactions' } }
      }
    },
    '/api/admin/transactions/{id}': {
      patch: {
        summary: 'Update transaction status',
        tags: ['Admin - Transactions'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Transaction updated' } }
      }
    },
    '/api/admin/providers': {
      get: {
        summary: 'List providers',
        tags: ['Admin - Providers'],
        responses: { '200': { description: 'List of providers' } }
      },
      post: {
        summary: 'Add provider',
        tags: ['Admin - Providers'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Provider added' } }
      }
    },
    '/api/admin/providers/{id}': {
      patch: {
        summary: 'Update provider',
        tags: ['Admin - Providers'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Provider updated' } }
      }
    },
    '/api/admin/stats': {
      get: {
        summary: 'Get system stats',
        tags: ['Admin - System'],
        responses: { '200': { description: 'System statistics' } }
      }
    },
    '/api/admin/logs': {
      get: {
        summary: 'Get system logs',
        tags: ['Admin - System'],
        responses: { '200': { description: 'System logs' } }
      }
    },
    // User Module
    '/api/profile': {
      get: {
        summary: 'Get user profile',
        tags: ['Profile'],
        responses: { '200': { description: 'User profile' } }
      },
      patch: {
        summary: 'Update user profile',
        tags: ['Profile'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  full_name: { type: 'string' },
                  phone: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Profile updated' } }
      }
    },
    '/api/wallet': {
      get: {
        summary: 'Get wallet balance',
        tags: ['Wallet'],
        responses: { '200': { description: 'Wallet balance' } }
      }
    },
    '/api/wallet/ledger': {
      get: {
        summary: 'Get wallet ledger history',
        tags: ['Wallet'],
        responses: { '200': { description: 'Wallet ledger' } }
      }
    },
    '/api/bundles': {
      get: {
        summary: 'List active bundles for purchase',
        tags: ['Data Purchase'],
        responses: { '200': { description: 'List of active bundles' } }
      }
    },
    '/api/transactions': {
      get: {
        summary: 'Get user transaction history',
        tags: ['Data Purchase'],
        responses: { '200': { description: 'User transactions' } }
      }
    },
  },
};
