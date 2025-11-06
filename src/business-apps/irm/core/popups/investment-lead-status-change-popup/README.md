# Investment Lead Status Change Popup

## Overview

Confirmation dialog for changing an investment lead's status. Integrates with the `saveInvestmentLead` Kogito process.

## Usage

### Expected Initial Values (via additionalData)

```typescript
{
  leadId: string,              // UUID of the lead to update
  newStatusRef: string,        // New status catalog reference (e.g., "InvestmentLeadStatus:v1:QUALIFIED")
  statusDisplayName: string    // Display name for the new status (e.g., "Qualified")
}
```

### Triggering the Popup

```typescript
import { startProcess } from '@/common/utils/processUtils'

startProcess({
  domain: 'investment-relations',
  processName: 'saveInvestmentLead',
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
  contextsArray={[FlowContextName.investmentSaveLead]}
  externalContextData={{
    leadId: lead.id,
    newStatusRef: newStatus.id,
    statusDisplayName: newStatus.value
  }}
  accessToken={accessToken}
/>
```

## Process Integration

- **Process**: `saveInvestmentLead`
- **Domain**: `investment-relations`
- **Context**: `investmentSaveLead` ✅ (Correct flow registry context)
- **Process Type**: `update`

## Payload Structure

```typescript
{
  investmentLead: {
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
npm run publish:screen -- /irm/core/popups/investment-lead-status-change-popup
```

## Flow Registry Configuration

Register this popup with:

- **Context**: `investmentSaveLead` ✅ (Correct flow registry context)
- **Process**: `saveInvestmentLead`
- **Domain**: `investment-relations`
