# Lead Status Change Popup

## Overview

Confirmation dialog for changing a CRM lead's status. Integrates with the `saveLead` Kogito process.

## Usage

### Expected Initial Values (via additionalData)

```typescript
{
  leadId: string,              // UUID of the lead to update
  newStatusRef: string,        // New status catalog reference (e.g., "SalesLeadStatus:v1:QUALIFIED")
  statusDisplayName: string    // Display name for the new status (e.g., "Qualified")
}
```

### Triggering the Popup

```typescript
import { startProcess } from '@/common/utils/start-process'

startProcess({
  domain: 'customer-relations',
  processName: 'saveLead',
  payload: {
    leadId: lead.id,
    newStatusRef: newStatus.id,
    statusDisplayName: newStatus.value
  },
  builderType: 'NATIVE_SCREEN'
})
```

### With AppActionButton

```typescript
<AppActionButton
  contextsArray={[FlowContextName.customerSaveLead]}
  externalContextData={{
    leadId: lead.id,
    newStatusRef: newStatus.id,
    statusDisplayName: newStatus.value
  }}
  accessToken={accessToken}
/>
```

## Process Integration

- **Process**: `saveLead`
- **Domain**: `customer-relations`
- **Context**: `customerSaveLead`
- **Process Type**: `update`

## Payload Structure

```typescript
{
  changeMode: 'UPDATE',
  lead: {
    id: string,           // Lead UUID
    version: number,      // Optimistic locking version
    leadStatusRef: string // New status catalog reference
  }
}
```

## Features

- ✅ Fetches current lead data via GraphQL
- ✅ Displays confirmation dialog with status information
- ✅ Handles loading and error states
- ✅ Uses optimistic locking (version field)
- ✅ Dispatches success events for data refresh

## Publishing

```bash
npm run publish:screen -- /crm/core/popups/lead-status-change-popup
```

## Flow Registry Configuration

Register this popup with:

- **Context**: `customerSaveLead`
- **Builder Type**: `NATIVE_SCREEN`
- **Target (Desktop)**: `https://nwcdndevfiles.blob.core.windows.net/screens/crm/core/popups/lead-status-change-popup`
