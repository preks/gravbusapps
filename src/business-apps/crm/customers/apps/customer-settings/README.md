# Customer Settings Module

This module provides a comprehensive customer settings management interface for CRM customer-related configurations.

## Structure

```
customer-settings/
├── components/
│   ├── CustomerSettingsCard.tsx    # Card component for settings categories
│   └── index.ts                    # Components exports
├── hooks/
│   ├── useCustomerSettingsCards.tsx # Hook for managing cards data
│   └── index.ts                    # Hooks exports
├── CustomerSettings.tsx            # Main component
├── index.ts                        # Main exports
└── README.md                       # This file
```

## Usage

```tsx
import { CustomerSettings } from '@/business-apps/crm/customers/apps/customer-settings'

function App() {
  return (
    <CustomerSettings
      prefixDataTestId="MyApp"
      className="custom-class"
      accessToken="your-access-token"
      // ... other BusinessAppContextProps
    />
  )
}
```

## Features

- **Card-based Layout**: Organized settings into categorized cards
- **Search Functionality**: Filter settings by title, description, or entries
- **Pipeline Data Integration**: Direct links to `/platform/mdm/pipeline-data` with appropriate tabs
- **Responsive Design**: Mobile-friendly grid layout
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **TypeScript Support**: Full type safety and IntelliSense

## Settings Categories

The settings are organized into the following categories:

1. **Pipeline Data**: Customer pipelines, stages, and sales processes
2. **Customer Classification**: Customer types, segments, and categories
3. **Customer Management**: Relationship types and communication settings

## Pipeline Data Integration

This app integrates with the Pipeline Data MDM module (`/platform/mdm/pipeline-data`) with the following tabs:

- Pipelines
- Stages
- Sources
- Customer-specific classification settings
- Relationship and communication management

## Testing

Test IDs are automatically generated with the format: `{prefixDataTestId}-CustomerSettings-{component}`

## Dependencies

- React 18+
- Ant Design
- react-i18next
- @remixicon/react
