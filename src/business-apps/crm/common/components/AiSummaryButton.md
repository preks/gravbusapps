# Shared AI Summary Button Component

## Overview

The `AiSummaryButton` is a shared, reusable component that provides consistent AI summary functionality across all CRM entities (investments, leads, accounts, contacts, opportunities). This component eliminates code duplication by providing a standardized interface for any entity that implements the `AiSummaryHook` pattern.

## Features

- **Consistent UI/UX**: Same look, feel, and behavior across all CRM entities
- **Configurable**: Customizable entity-specific messages and behavior
- **Reusable**: Works with any entity that follows the `AiSummaryHook` pattern
- **Type-safe**: Full TypeScript support with proper interfaces
- **Accessibility**: Follows design system patterns with proper test IDs

## Usage

### Basic Implementation

```typescript
import React from 'react';
import { AiSummaryButton as SharedAiSummaryButton } from '@/business-apps/crm/common/components';
import { useMyEntityAiSummary } from '../hooks/useMyEntityAiSummary';

interface MyEntityAiSummaryButtonProps {
  entityId: string;
  accessToken: string;
}

export const MyEntityAiSummaryButton: React.FC<MyEntityAiSummaryButtonProps> = ({ entityId, accessToken }) => {
  const summaryHook = useMyEntityAiSummary(entityId, accessToken);

  const config = {
    entityType: 'myEntity',
    loadingMessage: 'Generating AI Summary...',
    loadingSubtitle: 'Analyzing myEntity data and activities',
    emptyStateMessage: 'Click to generate intelligent insights about this myEntity'
  };

  return (
    <SharedAiSummaryButton
      config={config}
      summaryHook={summaryHook}
      dataTestId="my-entity-ai-summary-button"
    />
  );
};
```

### Required Hook Interface

Your AI summary hook must implement the `AiSummaryHook` interface:

```typescript
import { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import { AiSummaryContent } from '@/business-apps/crm/common/types/AiSummaryTypes'

export function useMyEntityAiSummary(
  entityId: string,
  accessToken: string
): UseInformationExtractionReturn<AiSummaryContent> {
  // Implementation using useInformationExtraction
  // Must return { state, generateSummary }
}
```

The `AiSummaryContent` interface requires:

```typescript
interface AiSummaryContent {
  summary: string // Main executive summary text
  keyInsights: string[] // Array of key insights/next steps
}
```

## Configuration Options

### AiSummaryConfig Properties

| Property            | Type   | Required | Description                                                                        |
| ------------------- | ------ | -------- | ---------------------------------------------------------------------------------- |
| `entityType`        | string | Yes      | Display name for the entity type (e.g., "investment", "lead", "account")           |
| `loadingMessage`    | string | No       | Custom loading message (defaults to "Generating AI Summary...")                    |
| `loadingSubtitle`   | string | No       | Custom loading subtitle (defaults to "Analyzing {entityType} data and activities") |
| `emptyStateMessage` | string | No       | Custom empty state message (defaults to entity-specific message)                   |

### AiSummaryButtonProps Properties

| Property      | Type            | Required | Description                                             |
| ------------- | --------------- | -------- | ------------------------------------------------------- |
| `config`      | AiSummaryConfig | Yes      | Configuration for entity-specific behavior              |
| `summaryHook` | AiSummaryHook   | Yes      | Hook that provides AI summary functionality             |
| `dataTestId`  | string          | No       | Custom test ID prefix (defaults to "ai-summary-button") |
| `buttonText`  | string          | No       | Custom button text (defaults to "AI Summary")           |
| `className`   | string          | No       | Additional CSS classes for the button                   |

## Examples

### Investment Entity

```typescript
const config = {
  entityType: 'investment',
  loadingMessage: 'Generating AI Summary...',
  loadingSubtitle: 'Analyzing investment data and activities',
  emptyStateMessage: "Click to generate intelligent insights about this investment's performance and next steps"
}
```

### Lead Entity

```typescript
const config = {
  entityType: 'lead',
  loadingMessage: 'Generating AI Summary...',
  loadingSubtitle: 'Analyzing lead data and activities',
  emptyStateMessage: "Click to generate intelligent insights about this lead's timeline and next steps"
}
```

### Account Entity

```typescript
const config = {
  entityType: 'account',
  loadingMessage: 'Generating AI Summary...',
  loadingSubtitle: 'Analyzing account data and activities',
  emptyStateMessage: "Click to generate intelligent insights about this account's activities and next steps"
}
```

## Migration from Legacy Components

If you have an existing AI summary button component that follows the old pattern:

1. **Import the shared component**:

   ```typescript
   import { AiSummaryButton as SharedAiSummaryButton } from '@/business-apps/crm/common/components'
   ```

2. **Configure for your entity**:

   ```typescript
   const config = {
     entityType: 'yourEntity'
     // ... other config options
   }
   ```

3. **Use your existing hook**:

   ```typescript
   const summaryHook = useYourEntityAiSummary(entityId, accessToken)
   ```

4. **Replace the old implementation**:
   ```typescript
   return (
     <SharedAiSummaryButton
       config={config}
       summaryHook={summaryHook}
       dataTestId="your-entity-ai-summary-button"
     />
   );
   ```

## Benefits

- **Reduced Code Duplication**: Eliminates 150+ lines of duplicate code per entity
- **Consistent UX**: Same tooltip behavior, loading states, and error handling across all entities
- **Easy Maintenance**: Changes to the UI/UX only need to be made in one place
- **Type Safety**: Full TypeScript support prevents runtime errors
- **Extensibility**: Easy to add new configuration options as needed

## Files

- `src/business-apps/crm/common/types/AiSummaryTypes.ts` - Type definitions
- `src/business-apps/crm/common/components/AiSummaryButton.tsx` - Main component
- `src/business-apps/crm/common/components/index.ts` - Exports
