export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Rebalancing Engine API',
    version: '0.9.0',
    description: `API for the generic portfolio rebalancing engine.

## Authentication
Authentication is handled via a JWT token.
- Call \`POST /api/auth/login\` with \`{ "email": "...", "password": "..." }\`.
- Include the returned token in the \`Authorization\` header as \`Bearer <token>\`.
- **Note**: The token is currently a Base64-encoded payload (unsigned) with no expiry window during the MVP phase. It will be upgraded to an RS256 signed token with a 1-hour expiry prior to public launch.

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
    '/api/auth/login': {
      post: {
        summary: 'Login to obtain Mock JWT token',
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
                    strategyType: { type: 'string', enum: ['threshold', 'calendar', 'manual'] },
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
          strategyType: { type: 'string', enum: ['threshold', 'manual', 'calendar'] },
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
