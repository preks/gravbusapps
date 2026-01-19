# HR Settings Module

This module provides a comprehensive HR settings management interface following the gravity-platform master-data patterns.

## Structure

```
hr-settings/
├── components/
│   ├── HrSettingsCard.tsx      # Card component for settings categories
│   └── index.ts                # Components exports
├── hooks/
│   ├── useHrSettingsCards.tsx  # Hook for managing cards data
│   └── index.ts                # Hooks exports
├── enums/
│   └── index.ts                # Enums for change modes and sections
├── types/
│   └── index.ts                # TypeScript interfaces
├── utils/
│   ├── formatters.ts           # Utility functions for formatting
│   └── index.ts                # Utils exports
├── HrSettings.tsx              # Main component
├── index.ts                    # Main exports
└── README.md                   # This file
```

## Usage

```tsx
import { HrSettings } from '@/business-apps/hr/core/apps/hr-settings'

function App() {
  return <HrSettings prefixDataTestId="MyApp" className="custom-class" />
}
```

## Features

- **Card-based Layout**: Organized settings into categorized cards
- **Search Functionality**: Filter settings by title, description, or entries
- **Responsive Design**: Mobile-friendly grid layout
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **TypeScript Support**: Full type safety and IntelliSense

## Cards Structure

The settings are organized into the following categories:

1. **General Settings**: System preferences, notifications, workflows
2. **Employee Management**: Employee fields, onboarding, offboarding
3. **Organizational Structure**: Departments, roles, reporting
4. **Compliance & Policies**: Policy templates, compliance rules, retention
5. **Reporting & Analytics**: Report templates, dashboards, data export

## Customization

To add new settings categories:

1. Update the `useHrSettingsCards` hook
2. Add new enum values to `HrSettingsSections`
3. Implement the corresponding detail pages
4. Update translation keys as needed

## Testing

Test IDs are automatically generated with the format: `{prefixDataTestId}-HrSettings-{component}`

## Dependencies

- React 18+
- Ant Design
- react-i18next
- @remixicon/react
