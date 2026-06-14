---
type: Decision
title: Separate Allocation Strategy from Execution Overlays
description: Domain modeling decision to decouple what to hold from how to trade it.
tags: [domain, strategy, tlh]
timestamp: 2026-06-14T14:55:00Z
---

# 0042: Separate Allocation Strategy from Execution Overlays

Date: 2026-06-14

## Context

As part of the v3 feature exploration, we investigated supporting "Advanced Strategies" (e.g., dynamically targeting the Efficient Frontier or VaR limits) and "Tax-Loss Harvesting" (TLH). We needed to determine if TLH is an independent strategy type or a modifier to existing strategies.

## Options Considered

1. **Option 1: Monolithic Strategies.** Create combined strategy classes like `EfficientFrontierWithTlhStrategy` or `ThresholdWithTlhStrategy`.
2. **Option 2: Separation of Concerns.** Define "Advanced Strategy Support" strictly as the mathematical generation of dynamic *target weights* (what to hold). Define TLH strictly as an orthogonal *execution overlay* (how to efficiently trade toward those targets or opportunistically break them to realize losses).

## Decision

We chose **Option 2**. Allocation strategies and execution overlays will be modeled as entirely separate concerns in the core engine.

## Rationale

TLH does not dictate long-term asset allocation; it optimizes after-tax alpha during the execution of an existing allocation mandate. By decoupling them, we avoid an exponential explosion of strategy classes. Any underlying strategy (Threshold, Manual, VaR) can be paired with any execution overlay (TLH, Wash-Sale Avoidance, Friction Penalty Minimization).

## Implementation Impact

- The `TradeProposal` generation pipeline must be updated to accept overlay constraints.
- The `TaxLot` foundation must be expanded to accurately track lot-level basis and duration (short-term vs long-term).

## Validation

Validation will occur when we can successfully apply a TLH execution overlay to both a static Threshold strategy and a dynamic Advanced Strategy without modifying the underlying strategy logic.

&copy; 2026 Johan Hellman. All rights reserved.
