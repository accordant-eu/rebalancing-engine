export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Rebalancing Engine API',
    version: '0.9.0',
    description: `API for the generic portfolio rebalancing engine.

## Authentication
Authentication is handled via signed JWT tokens (HS256) with refresh token rotation, or single-use 30-second stream tickets for SSE connections. B2B programmatic access uses tenant API keys (\`sk_live_*\`).
- Call \`POST /api/auth/login\` with \`{ "email": "...", "password": "..." }\`.
- Include the returned token in the \`Authorization\` header as \`Bearer <token>\`.
- Exchange expired access tokens using \`POST /api/auth/refresh\`.
- Obtain single-use SSE stream tickets via \`POST /api/auth/stream-ticket\`.

## Audit Trail Event Types
- \`DRY_RUN_EXECUTION\`: A trade proposal was generated but not submitted to the broker.
- \`LIVE_EXECUTION\`: Trades were generated and submitted to the live broker (e.g., Alpaca).
- \`CIRCUIT_BREAKER_HALT\`: Evaluation was halted because a circuit breaker tripped.
- \`RECONCILIATION_PAUSE\`: Evaluation paused awaiting order confirmation from the broker.
- \`THRESHOLD_BREACH\`: Portfolio drift crossed the defined threshold limits.
- \`REBALANCE_NOT_DUE\`: Evaluation ran, but no action was needed.
`,
  },
  servers: [
    {
      url: '/',
      description: 'Current Environment',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Public health check endpoint for container and uptime monitoring',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Service is healthy and accepting traffic',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number', example: 123.45 },
                    timestamp: { type: 'string', example: '2026-10-19T08:00:00.000Z' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/health': {
      get: {
        summary: 'Public health check endpoint under API prefix',
        operationId: 'getApiHealth',
        responses: {
          '200': {
            description: 'Service is healthy and accepting traffic',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number', example: 123.45 },
                    timestamp: { type: 'string', example: '2026-10-19T08:00:00.000Z' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login to obtain signed JWT token',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful login',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    refreshToken: { type: 'string' },
                    tenantId: { type: 'string' },
                    role: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        summary: 'Exchange a valid refresh token for a new access token',
        operationId: 'refreshToken',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful token refresh',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/events/stream': {
      get: {
        summary: 'Server-Sent Events (SSE) stream for real-time portfolio updates',
        operationId: 'getEventsStream',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'portfolios', in: 'query', schema: { type: 'string' }, description: 'Comma-separated list of account IDs, or "all"' },
          { name: 'types', in: 'query', schema: { type: 'string' }, description: 'Comma-separated list of event types, or "all"' }
        ],
        responses: {
          '200': {
            description: 'SSE Event Stream',
            content: {
              'text/event-stream': {
                schema: { type: 'string' }
              }
            }
          }
        }
      }
    },
    '/api/portfolios/summary': {
      get: {
        summary: 'Aggregate summary across all portfolios',
        operationId: 'getPortfolioSummary',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Portfolio aggregate summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    asOf: { type: 'string', format: 'date-time' },
                    meta: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        lastEvaluatedAt: { type: 'string', format: 'date-time', nullable: true },
                      }
                    },
                    driftSummary: {
                      type: 'object',
                      properties: {
                        inBand: { type: 'integer' },
                        thresholdBreach: { type: 'integer' },
                        notEvaluated: { type: 'integer' },
                      }
                    },
                    totalAum: { type: 'number' },
                    openCircuitBreakers: { type: 'integer' },
                    recentExecutions: {
                      type: 'object',
                      properties: {
                        last24h: { type: 'integer' },
                        last7d: { type: 'integer' },
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/portfolios': {
      get: {
        summary: 'List portfolios with drift summary',
        operationId: 'listPortfolios',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of portfolios',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      accountId: { type: 'string' },
                      tenantId: { type: 'string' },
                      modelId: { type: 'string', nullable: true },
                      totalValue: { type: 'number' },
                      cash: { type: 'number' },
                      lastEvaluatedAt: { type: 'string', format: 'date-time' },
                      driftStatus: { type: 'string', enum: ['in_band', 'threshold_breach', 'not_evaluated'] },
                      holdings: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            instrumentId: { type: 'string' },
                            quantity: { type: 'number' },
                            currentWeight: { type: 'number' },
                            targetWeight: { type: 'number' },
                            driftPct: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/portfolios/{id}': {
      get: {
        summary: 'Get single portfolio detail',
        operationId: 'getPortfolio',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Portfolio detail',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accountId: { type: 'string' },
                    tenantId: { type: 'string' },
                    taxJurisdiction: { type: 'string', example: 'US' },
                    taxWrapper: { type: 'string', enum: ['TAXABLE', 'US_TRADITIONAL_IRA', 'US_ROTH_IRA', 'US_401K', 'UK_ISA', 'UK_SIPP', 'TAX_EXEMPT'], example: 'TAXABLE' },
                    modelId: { type: 'string', nullable: true },
                    totalValue: { type: 'number' },
                    cash: { type: 'number' },
                    lastEvaluatedAt: { type: 'string', format: 'date-time' },
                    driftStatus: { type: 'string', enum: ['in_band', 'threshold_breach', 'not_evaluated'] },
                    holdings: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          instrumentId: { type: 'string' },
                          quantity: { type: 'number' },
                          currentWeight: { type: 'number' },
                          targetWeight: { type: 'number' },
                          driftPct: { type: 'number' },
                        },
                      },
                    },
                    pendingCashFlows: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/CashFlow' },
                    },
                    circuitBreakerStatus: { $ref: '#/components/schemas/CircuitBreakerState' },
                    lastProposal: {
                      oneOf: [
                        { $ref: '#/components/schemas/TradeProposal' },
                        { type: 'null' },
                      ],
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/portfolios/{id}/trigger-rebalance': {
      post: {
        summary: 'Trigger a rebalance evaluation',
        operationId: 'triggerRebalance',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  dryRun: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Rebalance proposal or success message' }
        }
      }
    },
    '/api/portfolios/{id}/circuit-breaker/reset': {
      post: {
        summary: 'Reset circuit breaker',
        operationId: 'resetCircuitBreaker',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Circuit breaker reset successfully' }
        }
      }
    },
    '/api/portfolios/{id}/cashflows': {
      post: {
        summary: 'Submit pending cashflow',
        operationId: 'submitCashflow',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'direction'],
                properties: {
                  amount: { type: 'number' },
                  direction: { type: 'string', enum: ['DEPOSIT', 'WITHDRAWAL'] },
                  currency: { type: 'string', default: 'USD' },
                  expectedSettlementDate: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Cashflow submitted' }
        }
      }
    },
    '/api/portfolios/{id}/drift': {
      get: {
        summary: 'Get portfolio drift breakdown',
        operationId: 'getPortfolioDrift',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Drift detail',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accountId: { type: 'string' },
                    evaluatedAt: { type: 'string', format: 'date-time' },
                    strategyType: { type: 'string', enum: ['threshold', 'calendar', 'manual', 'tax_aware_us'] },
                    rebalanceDue: { type: 'boolean' },
                    reason: { type: 'string', nullable: true },
                    driftByInstrument: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          instrumentId: { type: 'string' },
                          currentWeight: { type: 'number' },
                          targetWeight: { type: 'number' },
                          absoluteDrift: { type: 'number' },
                          relativeDrift: { type: 'number' },
                          thresholdBreach: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/portfolios/{id}/proposals': {
      get: {
        summary: 'Get recent trade proposals for a portfolio',
        operationId: 'getPortfolioProposals',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'List of recent proposals',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accountId: { type: 'string' },
                    proposals: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          proposedAt: { type: 'string', format: 'date-time' },
                          executionMode: { type: 'string', enum: ['full_reset', 'boundary_band', 'dry_run'] },
                          executed: { type: 'boolean' },
                          trades: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                instrumentId: { type: 'string' },
                                direction: { type: 'string', enum: ['BUY', 'SELL'] },
                                quantity: { type: 'number' },
                                estimatedPrice: { type: 'number' },
                                estimatedValue: { type: 'number' },
                              },
                            },
                          },
                          warnings: {
                            type: 'array',
                            items: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/logs': {
      get: {
        summary: 'Get filtered and paginated audit logs',
        operationId: 'getLogs',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'portfolioId',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'since',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'type',
            in: 'query',
            schema: { 
              type: 'string',
              enum: [
                'DRY_RUN_EXECUTION',
                'LIVE_EXECUTION',
                'CIRCUIT_BREAKER_HALT',
                'RECONCILIATION_PAUSE',
                'THRESHOLD_BREACH',
                'REBALANCE_NOT_DUE'
              ]
            },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated logs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AuditRecord' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/prices': {
      get: {
        summary: 'Get current price snapshot',
        operationId: 'getPrices',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Price data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prices: {
                      type: 'object',
                      additionalProperties: { type: 'number' },
                    },
                    asOf: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/webhooks/alpaca': {
      post: {
        summary: 'Alpaca webhook endpoint',
        operationId: 'alpacaWebhook',
        description: 'Receives asynchronous trade fills from Alpaca. This endpoint is auth-exempt.',
        responses: {
          '200': { description: 'Webhook received' }
        }
      }
    },
    '/api/auth/stream-ticket': {
      post: {
        summary: 'Generate single-use 30-second ticket for SSE event streaming',
        operationId: 'createStreamTicket',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Stream ticket generated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ticket: { type: 'string' }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/api/state': {
      get: {
        summary: 'Get live states of all portfolios accessible to tenant',
        operationId: 'getState',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Portfolio states dictionary',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/api/metrics': {
      get: {
        summary: 'Get operational metrics and telemetry for current tenant',
        operationId: 'getMetrics',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Tenant operational metrics',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/api/assets': {
      get: {
        summary: 'List active asset master records',
        operationId: 'getAssets',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of assets',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/api/users': {
      post: {
        summary: 'Create a new user within tenant',
        operationId: 'createTenantUser',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string', enum: ['Admin', 'Advisor', 'Viewer'] }
                },
                required: ['email', 'password', 'role']
              }
            }
          }
        },
        responses: {
          '201': { description: 'User created' },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/api/admin/users': {
      get: {
        summary: 'List all users across tenants (Superadmin)',
        operationId: 'getAdminUsers',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'List of users' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { description: 'Forbidden' }
        }
      },
      post: {
        summary: 'Create user across any tenant (Superadmin)',
        operationId: 'createAdminUser',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  tenantId: { type: 'string' },
                  role: { type: 'string' }
                },
                required: ['email', 'password', 'tenantId', 'role']
              }
            }
          }
        },
        responses: {
          '201': { description: 'User created' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { description: 'Forbidden' }
        }
      }
    },
    '/api/admin/tenants': {
      get: {
        summary: 'List all tenants (Superadmin)',
        operationId: 'getAdminTenants',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'List of tenants' }
        }
      },
      post: {
        summary: 'Create a new tenant (Superadmin)',
        operationId: 'createAdminTenant',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tenantId: { type: 'string' },
                  name: { type: 'string' },
                  brokerType: { type: 'string' },
                  brokerApiKey: { type: 'string' },
                  brokerSecretKey: { type: 'string' }
                },
                required: ['tenantId', 'name']
              }
            }
          }
        },
        responses: {
          '201': { description: 'Tenant created' }
        }
      }
    },
    '/api/admin/assets': {
      get: {
        summary: 'List all assets (Admin / Superadmin)',
        operationId: 'getAdminAssets',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'List of assets' }
        }
      },
      post: {
        summary: 'Register or update an asset',
        operationId: 'createAdminAsset',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  instrumentId: { type: 'string' },
                  isin: { type: 'string' },
                  ticker: { type: 'string' },
                  exchangeMic: { type: 'string' },
                  currency: { type: 'string' }
                },
                required: ['instrumentId', 'isin', 'ticker', 'exchangeMic', 'currency']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Asset registered' }
        }
      }
    },
    '/api/admin/scheduler/status': {
      get: {
        summary: 'Get recurring mandate scheduler service status',
        operationId: 'getSchedulerStatus',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Scheduler status' }
        }
      }
    },
    '/api/admin/scheduler/scan': {
      post: {
        summary: 'Trigger immediate on-demand scan of calendar mandates',
        operationId: 'triggerSchedulerScan',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Scan triggered and portfolios enqueued' }
        }
      }
    },
    '/api/admin/circuit-breaker/trip': {
      post: {
        summary: 'Trip global emergency circuit breaker',
        operationId: 'tripGlobalCircuitBreaker',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Global circuit breaker tripped' }
        }
      }
    },
    '/api/admin/circuit-breaker/reset': {
      post: {
        summary: 'Reset global emergency circuit breaker',
        operationId: 'resetGlobalCircuitBreaker',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Global circuit breaker reset' }
        }
      }
    },
    '/api/models': {
      get: {
        summary: 'List model portfolio mandates',
        operationId: 'getModels',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'List of models' }
        }
      },
      post: {
        summary: 'Create a new model portfolio mandate',
        operationId: 'createModel',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: {
          '201': { description: 'Model mandate created' }
        }
      }
    },
    '/api/models/{id}': {
      get: {
        summary: 'Get a model portfolio mandate by ID',
        operationId: 'getModelById',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Model mandate details' }
        }
      },
      put: {
        summary: 'Update model portfolio mandate and cascade changes',
        operationId: 'updateModelById',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: {
          '200': { description: 'Model mandate updated' }
        }
      }
    },
    '/api/models/{id}/fan-out': {
      post: {
        summary: 'Fan out model changes to all subscribed portfolios and enqueue for evaluation',
        operationId: 'fanOutModel',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Subscribed portfolios enqueued' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    '/api/queue/status': {
      get: {
        summary: 'Get evaluation queue depth and batch worker status',
        operationId: 'getQueueStatus',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Queue status' }
        }
      }
    },
    '/api/queue/batches': {
      get: {
        summary: 'Get recent evaluation batch execution telemetry',
        operationId: 'getQueueBatches',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Recent batches' }
        }
      }
    },
    '/api/queue/run': {
      post: {
        summary: 'Trigger immediate batch evaluation worker cycle',
        operationId: 'runQueueWorker',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Worker batch processed' }
        }
      }
    },
    '/api/queue/drain': {
      post: {
        summary: 'Drain all pending queue entries (Superadmin)',
        operationId: 'drainQueue',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Queue drained' }
        }
      }
    },
    '/api/optimizer/run': {
      post: {
        summary: 'Execute dynamic risk optimizer solver for dynamic model mandates',
        operationId: 'runOptimizer',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Optimization executed' }
        }
      }
    },
    '/api/portfolios/{id}/policy': {
      put: {
        summary: 'Update portfolio rebalancing policy and tax routing parameters',
        operationId: 'updatePortfolioPolicy',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: {
          '200': { description: 'Policy updated and persisted' }
        }
      }
    },
    '/api/portfolios/{id}/mandate': {
      put: {
        summary: 'Update bespoke portfolio mandate archetype and constraints',
        operationId: 'updatePortfolioMandate',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: {
          '200': { description: 'Portfolio mandate updated' }
        }
      }
    },
    '/api/portfolios/{id}/subscription': {
      put: {
        summary: 'Subscribe portfolio to a model portfolio mandate',
        operationId: 'subscribePortfolioToModel',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  modelId: { type: 'string' }
                },
                required: ['modelId']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Subscription updated' }
        }
      }
    },
    '/api/portfolios/{id}/execution-status': {
      get: {
        summary: 'Get latest execution status and audit metadata for portfolio',
        operationId: 'getPortfolioExecutionStatus',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Execution status' }
        }
      }
    },
    '/api/portfolios/{id}/audit-trail': {
      get: {
        summary: 'Get historical audit trail records for portfolio',
        operationId: 'getPortfolioAuditTrail',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Historical audit trail' }
        }
      }
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      InternalError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      Portfolio: {
        type: 'object',
        properties: {
          accountId: { type: 'string' },
          tenantId: { type: 'string' },
          modelId: { type: 'string' },
          cash: { type: 'number' },
          holdings: {
            type: 'array',
            items: { $ref: '#/components/schemas/Position' },
          },
          cashFlows: {
            type: 'array',
            items: { $ref: '#/components/schemas/CashFlow' },
          },
        },
      },
      Position: {
        type: 'object',
        properties: {
          instrumentId: { type: 'string' },
          quantity: { type: 'number' },
        },
      },
      TradeProposal: {
        type: 'object',
        properties: {
          trades: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                instrumentId: { type: 'string' },
                direction: { type: 'string', enum: ['BUY', 'SELL'] },
                quantity: { type: 'number' },
                estimatedPrice: { type: 'number' },
                estimatedValue: { type: 'number' },
              },
            },
          },
          estimatedPostTradeCash: { type: 'number' },
          warnings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
          executionTargetMode: { type: 'string' },
        },
      },
      AuditRecord: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          accountId: { type: 'string' },
          type: { 
            type: 'string',
            enum: [
              'DRY_RUN_EXECUTION',
              'LIVE_EXECUTION',
              'CIRCUIT_BREAKER_HALT',
              'RECONCILIATION_PAUSE',
              'THRESHOLD_BREACH',
              'REBALANCE_NOT_DUE'
            ]
          },
          inputs: { type: 'object' },
          outputs: { type: 'object' },
        },
      },
      ModelMandate: {
        type: 'object',
        properties: {
          modelId: { type: 'string' },
          tenantId: { type: 'string' },
          name: { type: 'string' },
          archetype: { type: 'string', enum: ['StaticWeights', 'EfficientFrontier', 'MinimumVariance'] },
          evaluationFrequency: { type: 'string', enum: ['realtime', 'daily', 'weekly', 'monthly'] },
          targetAllocation: { $ref: '#/components/schemas/TargetAllocation' },
          policy: { $ref: '#/components/schemas/RebalancingPolicy' },
          constraints: {
            type: 'array',
            items: { $ref: '#/components/schemas/ConstraintIndicator' }
          }
        },
      },
      PortfolioMandateOverride: {
        type: 'object',
        properties: {
          archetype: { type: 'string', enum: ['StaticWeights', 'EfficientFrontier', 'MinimumVariance'] },
          targetAllocation: { $ref: '#/components/schemas/TargetAllocation' },
          policy: { $ref: '#/components/schemas/RebalancingPolicy' },
          constraints: {
            type: 'array',
            items: { $ref: '#/components/schemas/ConstraintIndicator' }
          }
        },
        required: ['archetype', 'targetAllocation', 'policy']
      },
      TargetAllocation: {
        type: 'object',
        properties: {
          targets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                instrumentId: { type: 'string' },
                weight: { type: 'number' }
              }
            }
          },
          cashBuffer: { type: 'number' }
        }
      },
      RebalancingPolicy: {
        type: 'object',
        properties: {
          evaluationDate: { type: 'string', format: 'date' },
          strategyType: { type: 'string', enum: ['threshold', 'manual', 'calendar', 'tax_aware_us'] },
          optimizerType: { type: 'string', enum: ['standard_rule_based', 'tax_aware_us'] },
          executionTargetMode: { type: 'string', enum: ['full_reset', 'boundary'] },
          boundaryBandMode: { type: 'string', enum: ['absolute', 'relative'] },
          sellSelectionMode: { type: 'string', enum: ['FIFO', 'LIFO', 'HIGHEST_COST', 'LOWEST_COST'] },
          depositAllocationMode: { type: 'string', enum: ['REBALANCING', 'CURRENT_WEIGHT', 'FIXED_TARGET'] },
          absoluteDriftThreshold: { type: 'number' },
          relativeDriftThreshold: { type: 'number' },
          minimumTradeSize: { type: 'number' },
          calendarConfig: {
            type: 'object',
            properties: {
              evaluationDate: { type: 'string' },
              nextRebalanceDate: { type: 'string' },
              frequency: { type: 'string', enum: ['monthly', 'quarterly', 'annually', 'explicit'] }
            }
          }
        }
      },
      ConstraintIndicator: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['concentration_limit', 'wash_sale_lockout'] },
          parameters: {
            type: 'object',
            additionalProperties: true
          }
        }
      },
      CashFlow: {
        type: 'object',
        properties: {
          cashFlowId: { type: 'string' },
          direction: { type: 'string', enum: ['DEPOSIT', 'WITHDRAWAL'] },
          status: { type: 'string', enum: ['PENDING', 'SETTLED'] },
          amount: { type: 'number' },
          effectiveDate: { type: 'string' },
        },
      },
      CircuitBreakerState: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['OPEN', 'CLOSED', 'HALF_OPEN'] },
          reason: { type: 'string', nullable: true },
          lastTrippedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
};
