# Investment Settings Module

This module provides a comprehensive investment settings management interface for CRM investment-related configurations.

## Structure

```
investment-settings/
├── components/
│   ├── InvestmentSettingsCard.tsx  # Card component for settings categories
│   └── index.ts                    # Components exports
├── hooks/
│   ├── useInvestmentSettingsCards.tsx # Hook for managing cards data
│   └── index.ts                    # Hooks exports
├── InvestmentSettings.tsx          # Main component
├── index.ts                        # Main exports
└── README.md                       # This file
```

## Usage

```tsx
import { InvestmentSettings } from '@/business-apps/crm/investments/apps/investment-settings'

function App() {
  return (
    <InvestmentSettings
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

1. **Pipeline Data**: Investment pipelines, stages, and sales processes
2. **Investment Categories**: Investment types and classification settings
3. **Investment Workflows**: Approval processes and automation rules

## Pipeline Data Integration

This app integrates with the Pipeline Data MDM module (`/platform/mdm/pipeline-data`) with the following tabs:

- Pipelines
- Stages
- Sources
- Category-specific settings for different investment types

## Testing

Test IDs are automatically generated with the format: `{prefixDataTestId}-InvestmentSettings-{component}`

## Dependencies

- React 18+
- Ant Design
- react-i18next
- @remixicon/react
