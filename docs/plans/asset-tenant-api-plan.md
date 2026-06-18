---
type: plan
title: Asset, Tenant API, and Broker Statistics Enhancements
description: Implementation plan for expanding the asset domain model, adding B2B API credential management for tenants, and refining broker statistics.
timestamp: 2026-06-18T17:00:00Z
---

# Asset, Tenant API, and Broker Statistics Enhancements

This plan outlines the implementation of multi-exchange asset awareness, tenant API credential management, and broker-type metrics aggregations.

## 1. Asset Universe (Ticker & Listing Awareness)

Currently, the system uses a simple string (e.g., `AAPL`) for `instrumentId`. We will expand this to support the reality that financial instruments (identified by ISIN) trade on multiple exchanges (MIC) in different currencies.

### Domain Model
We will introduce an `Assets` schema that represents a specific tradable listing of an instrument.

```typescript
export interface Asset {
  instrumentId: string; // Primary Key: Composite e.g. "ISIN:MIC:CURRENCY" or a UUID
  isin: string;         // International Securities Identification Number (e.g. US0378331005)
  ticker: string;       // Local ticker (e.g. AAPL)
  exchangeMic: string;  // Market Identifier Code (e.g. XNAS, XNYS, XLON)
  currency: string;     // ISO 4217 Currency Code (e.g. USD, EUR)
}
```

### Constraints & Future Work
- **Single Currency MVP**: For this phase, all calculations, drift analysis, and valuation will assume a single base currency (e.g., USD). We are establishing the schema for `currency` now, but we will defer implementing live FX conversions in the `valuation.ts` logic until explicitly required.
- **Database**: Add an `Assets` table to `db.sqlite.ts` and populate it with a baseline set of instruments.
- **UI**: Add an `Asset Universe` tab in the Superadmin Command Center to view and manage these listings.

## 2. Tenant B2B API Credential Management

In addition to UI user management, tenants require programmatic access to the Rebalancing Engine API via B2B API Credentials.

### Domain Model
```typescript
export interface TenantApiKey {
  keyId: string;        // e.g. 'key-1234'
  tenantId: string;     // Reference to Tenants
  keyPrefix: string;    // Displayable prefix (e.g. 'sk_live_abc12...')
  keyHash: string;      // Hashed secret key for authentication
  createdAt: string;
  status: 'Active' | 'Revoked';
}
```

### Implementation
- **Database**: Create a `TenantApiKeys` table.
- **API Endpoints**: 
  - `POST /api/admin/tenants/:tenantId/keys` (Generates a new API Key and Secret, returning the Secret *only once* in the response).
  - `GET /api/admin/tenants/:tenantId/keys` (Lists active keys by prefix).
  - `DELETE /api/admin/tenants/:tenantId/keys/:keyId` (Revokes a key).
- **Authentication**: Update `server.ts` auth middleware. If an `Authorization: Bearer <token>` does not decode as a JWT, it falls back to checking the `TenantApiKeys` table (hashed).
- **UI**: Enhance the `TenantManagementTab.tsx` with a sub-section for "API Credentials" allowing superadmins (and eventually tenant admins) to generate and revoke API keys.

## 3. Active Tenant Settings Management

Tenants currently cannot be edited after creation. We will:
- Add a `PUT /api/admin/tenants/:tenantId` endpoint.
- Enhance the UI with an "Edit Settings" modal/inline-form in the `TenantManagementTab` to update the tenant's Broker configuration (Type, API Key, Secret, Base URL).

## 4. Broker Integration Statistics by Type

The `/api/admin/metrics` endpoint currently returns statistics strictly per `tenantId`. We will:
- Update the API to group these metrics by `brokerType` (e.g., `ALPACA` vs `MOCK`).
- The payload will include a `byBrokerType` aggregation.
- Update `BrokerIntegrationTab.tsx` to display an aggregated "Broker Statistics" row before the per-tenant breakdown table.
