---
title: Model Mandate Schema
description: API documentation for the Model Mandate structure
type: API Reference
timestamp: "2026-06-19"
---

# Model Mandate Schema

This document outlines the expected JSON structure for interacting with the `/api/models` and `/api/models/:id` endpoints. Týr (or other clients) must adhere to this schema when programmatically creating or updating Model Mandates.

## Core Mandate Object

```json
{
  "modelId": "string",                  // Unique identifier for the model (e.g. "growth-model-v1")
  "tenantId": "string",                 // The tenant this model belongs to
  "name": "string",                     // Human-readable name
  "archetype": "string",                // "StaticWeights" | "EfficientFrontier" | "MinimumVariance"
  "evaluationFrequency": "string",      // "realtime" | "daily" | "weekly" | "monthly"
  "targetAllocation": {                 // Object defining the target state
    "cashBuffer": 0.05,                 // Decimal, e.g., 0.05 for 5%
    "targets": [
      {
        "instrumentId": "string",       // Composite key (e.g., "US0378331005:XNAS:USD")
        "weight": 0.50                  // Decimal, e.g., 0.50 for 50%
      }
    ]
  },
  "policy": {                           // Core execution and mathematical policies
    "strategyType": "threshold",        // "threshold" | "calendar" | "manual"
    "executionTargetMode": "full_reset",// "full_reset" | "boundary"
    "boundaryBandMode": "absolute",     // "absolute" | "relative"
    "sellSelectionMode": "FIFO",        // "FIFO" | "LIFO" | "HIGHEST_COST" | "LOWEST_COST"
    "depositAllocationMode": "REBALANCING",
    "absoluteDriftTolerance": 0.05,     // 5% drift tolerance
    "relativeDriftTolerance": 0.10,     // 10% relative drift tolerance
    "minimumTradeSize": 100             // Notional trade minimum
  },
  "constraints": [                      // Array of quality indicator constraints
    {
      "type": "concentration_limit",
      "parameters": {
        "maxWeight": 0.20               // e.g., No single asset above 20%
      }
    }
  ]
}
```

## Field Explanations

- **`archetype`**: Determines the dynamic strategy logic. For Tranche 10, use `"StaticWeights"`.
- **`targetAllocation.targets`**: Must sum to exactly `1.0 - cashBuffer`.
- **`constraints`**: Determines the threshold limits passed into the Quality Pipeline (e.g. `ConcentrationLimitIndicator`).

## Idempotent Updates

A `PUT /api/models/:id` payload acts as an idempotent "upsert". Modifying a Model Mandate will seamlessly cascade the `policy`, `constraints`, `archetype`, and `targetAllocation` to all discretionary portfolios actively subscribed to the model, and enqueue those portfolios for immediate Quality/Drift evaluation.
