# HeaderSection Component

A generic, reusable header section component for CRM and IRM record pages. This component standardizes the header layout across different entity types (opportunities, leads, accounts, contacts, etc.).

## Features

- **Flexible Entity Support**: Works with any entity type through configurable props
- **Optional Components**: Back button, badges, info items, AI summary, and actions are all optional
- **Integrated AI Summary**: Built-in support for AI summary functionality
- **Integrated Actions**: Built-in support for AppActionButton
- **Consistent Styling**: Standardized layout and styling across all record types

## Usage

```tsx
import { HeaderSection } from '@/common/components/common-relations/record-sections/header-section'
import { LightbulbIcon } from '@phosphor-icons/react'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
;<HeaderSection
  accessToken={accessToken}
  entityId="123"
  entityName="Sample Opportunity"
  entityType="opportunity"
  entityIcon={LightbulbIcon}
  onBack={() => navigate('/opportunities')}
  primaryBadge={{
    content: <>💰 $50,000</>
  }}
  infoItems={[
    { icon: StarOutlined, label: 'Status', value: 'Active' },
    { label: 'Owner', value: 'John Doe' }
  ]}
  aiSummaryConfig={{
    config: { entityType: 'opportunity' },
    hook: useAiSummary(entityId, accessToken)
  }}
  actionButtonConfig={{
    contextsArray: [FlowContextName.investmentOpportunityEntity],
    externalContextData: { opportunityId: entityId },
    prefixDataTestId: 'opportunity-record-action'
  }}
/>
```

## Props

### Required Props

- `accessToken`: Access token for API requests
- `entityId`: Unique identifier for the entity
- `entityName`: Display name of the entity
- `entityType`: Type label (e.g., "OPPORTUNITY", "LEAD")
- `entityIcon`: Icon component for the entity

### Optional Props

- `onBack`: Back button click handler
- `primaryBadge`: Main badge (usually value/amount)
- `additionalBadges`: Array of additional badges
- `infoItems`: Information items displayed below the title
- `aiSummaryConfig`: AI Summary button configuration
- `actionButtonConfig`: App Action button configuration

## Examples

### Minimal Header

```tsx
<HeaderSection
  accessToken={accessToken}
  entityId="123"
  entityName="Basic Lead"
  entityType="lead"
  entityIcon={UserIcon}
/>
```

### Full-Featured Header

```tsx
<HeaderSection
  accessToken={accessToken}
  entityId="123"
  entityName="Premium Opportunity"
  entityType="opportunity"
  entityIcon={LightbulbIcon}
  onBack={handleBack}
  primaryBadge={{
    content: (
      <>
        <DollarOutlined /> $100,000
      </>
    )
  }}
  additionalBadges={[{ content: 'High Priority', style: { backgroundColor: '#ff4d4f', color: 'white' } }]}
  infoItems={[
    { icon: StarOutlined, label: 'Status', value: 'Active' },
    { icon: UserOutlined, label: 'Owner', value: 'Jane Smith' },
    { label: 'Stage', value: 'Negotiation' }
  ]}
  aiSummaryConfig={{
    config: {
      entityType: 'opportunity',
      loadingMessage: 'Analyzing opportunity...'
    },
    hook: useAiSummary(entityId, accessToken)
  }}
  actionButtonConfig={{
    contextsArray: [FlowContextName.investmentOpportunityEntity],
    externalContextData: { opportunityId: entityId },
    prefixDataTestId: 'opportunity-actions'
  }}
/>
```

## Migration from OpportunityHeader

The original `OpportunityHeader` has been refactored to use `HeaderSection`. This provides:

1. **Consistent Layout**: Same visual structure across all entity types
2. **Reduced Code Duplication**: Common header logic is centralized
3. **Better Maintainability**: Single component to update for header changes
4. **Enhanced Flexibility**: Easy to add new features to all headers

## Integration with Other Entities

To use HeaderSection with other entity types:

1. **Define your entity-specific props**: Map your entity data to HeaderSection props
2. **Configure AI Summary**: Provide entity-specific AI summary hook
3. **Configure Actions**: Set appropriate FlowContextName and external context data
4. **Customize badges and info**: Display entity-relevant information

This component is designed to work seamlessly with leads, accounts, contacts, investments, and any other CRM/IRM entities.
