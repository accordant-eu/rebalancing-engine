# E2E Browser Test Plan

## Scenarios

### Scenario 1: Advisor Workflow
**Persona:** `advisor@tenant.com`
**Password:** `changeme123`
**Verification Goals:**
- Login successfully.
- Verify `AdvisorLayout` is rendered.
- Check "Action Required" list.
- Check "All Portfolios" list.
- Verify that Tenant Management or Sysops tabs are NOT visible.

### Scenario 2: Compliance/Viewer Workflow
**Persona:** `compliance@tenant.com`
**Password:** `changeme123`
**Verification Goals:**
- Login successfully.
- Verify `ComplianceLayout` is rendered.
- Verify the Audit logs table is populated.
- Expand a row to see the JSON payload.
- Verify that Fleet Management or Models tabs are NOT visible.

### Scenario 3: Tenant Admin Workflow
**Persona:** `admin@tenant.com`
**Password:** `changeme123`
**Verification Goals:**
- Login successfully.
- Verify `TenantAdminLayout` is rendered.
- View "Firm Overview" and see aggregate numbers.
- Go to "User Management" and verify the list of users loads.
- Go to "Rebalancing Models" and see the mocked models.
- Verify that Sysops is NOT visible.

### Scenario 4: Superadmin Pulse
**Persona:** `admin@localhost`
**Password:** `changeme123`
**Verification Goals:**
- Login successfully.
- Verify `SuperadminLayout` is rendered.
- Check "Tenant Management" to see the list of tenants.
- Check "System Ops" to see event bus and telemetry.
