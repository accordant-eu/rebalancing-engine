---
type: Decision Record
title: Use Composite Asset Schema for Instrument Identity
description: Explicitly model financial instruments with ISIN, MIC exchange, and currency rather than treating instrumentId as an ambiguous string.
tags: [architecture, domain, assets]
timestamp: 2026-06-18T17:00:00Z
status: Accepted
supersedes: 
---

# Use Composite Asset Schema for Instrument Identity

## Context

Throughout the MVP phases, the rebalancing engine identified assets purely via a string `instrumentId` (e.g., `AAPL`). However, real-world financial instruments trade on specific exchanges and in specific currencies. An ISIN (e.g., US0378331005) identifies the instrument itself, but a trade executes on a specific listing (Exchange + Currency + Ticker). We need a model that captures this reality to support global assets correctly.

## Options Considered

### Option 1: Treat `instrumentId` as ISIN only
- **Benefits:** Clean and universal identifier.
- **Costs:** Fails to capture the tradable listing. You cannot trade an ISIN; you trade a ticker on a specific exchange (MIC) in a specific currency.
- **Risks:** High risk of currency mismatch or routing errors.
- **Reversibility:** Low.

### Option 2: Introduce an explicit `Assets` schema and composite key
- **Benefits:** Models the domain correctly. Allows us to link multiple tradable listings to a single ISIN, enabling multi-currency/multi-exchange architecture down the road.
- **Costs:** Requires updating the database schema and adding an API to manage assets.
- **Risks:** Adds complexity to the valuation logic if multi-currency conversion is required immediately.
- **Reversibility:** Medium.

## Decision

We will implement Option 2: Introduce an explicit `Assets` schema that tracks `isin`, `ticker`, `exchangeMic`, and `currency`. The `instrumentId` will continue to act as the primary key for trades and holdings, but it will map to a specific listing in the `Assets` table. 

**Provisional Deferral**: While we add the `currency` metadata, we will defer implementing live FX currency conversions in the valuation logic. The MVP will assume a single base currency context until explicitly requested otherwise.

## Rationale

This decision aligns with the explicit, deterministic domain modeling principles of the project. A ticker like "AAPL" is ambiguous without knowing the exchange and currency. By formalizing the schema now, we lay the groundwork for true multi-currency support without overloading the current MVP slice.

## Implementation Impact

- **Code:** Add `Asset` interface to `src/models/domain.ts`. Add endpoints for managing assets.
- **Database:** Create `Assets` table in SQLite.
- **UI:** Add an `Asset Universe` tab to the Superadmin dashboard.

## Follow-up

Implement multi-currency valuation logic with live FX rates.

&copy; 2026 Johan Hellman. All rights reserved.
