# Settings Layout Component

A reusable settings layout component built with `@newwork/nw-design-system` for creating consistent settings pages across the application.

## Features

- **🎨 Design System Integration**: Built with `@newwork/nw-design-system` components (PageHeader, Input, Card)
- **🔍 Built-in Search**: Filters cards by title, description, and entries
- **📱 Responsive Design**: Mobile-friendly grid layout
- **⚡ TypeScript Support**: Full type safety and IntelliSense
- **🎯 Accessibility**: Proper test IDs and keyboard navigation
- **🔗 Navigation**: Integrated with platform navigation utilities
- **🎨 Phosphor Icons**: Uses phosphor icons from `react-icons/pi` for consistency

## Usage

```tsx
import { SettingsLayout } from '@/components/layout/settings-layout'
import { PiGear, PiFlow } from 'react-icons/pi'

const MySettingsPage = () => {
  const cards = [
    {
      title: 'Pipeline Data',
      description: 'Manage pipelines and sales processes',
      icon: PiFlow,
      iconSize: 'md' as const,
      entries: [
        {
          label: 'Pipelines',
          basePath: '/platform/mdm/pipeline-data'
        },
        {
          label: 'Stages',
          basePath: '/platform/mdm/pipeline-data',
          params: { tab: 'stages' }
        }
      ]
    }
  ]

  return (
    <SettingsLayout
      headerPhosphorIcon={{
        icon: PiGear,
        variant: 'default',
        size: 'lg',
        label: 'My Settings'
      }}
      headerLabel="My Settings"
      cards={cards}
      prefixDataTestId="MySettings"
      searchPlaceholder="Search my settings..."
    />
  )
}
```

## Props

### SettingsLayoutProps

| Prop                 | Type                 | Required | Description                            |
| -------------------- | -------------------- | -------- | -------------------------------------- |
| `headerPhosphorIcon` | `PhosphorIconConfig` | ✅       | Phosphor icon configuration for header |
| `headerLabel`        | `string`             | ✅       | Title displayed in the header          |
| `cards`              | `SettingsCard[]`     | ✅       | Array of settings cards to display     |
| `className`          | `string`             | ❌       | Additional CSS classes                 |
| `prefixDataTestId`   | `string`             | ❌       | Prefix for test IDs                    |
| `searchPlaceholder`  | `string`             | ❌       | Custom search placeholder text         |

### PhosphorIconConfig

| Prop      | Type            | Required | Description                                                                                            |
| --------- | --------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `icon`    | `ComponentType` | ✅       | Phosphor icon component (e.g., `PiGear`)                                                               |
| `variant` | `string`        | ❌       | Icon variant ('default', 'secondary', 'success', 'warning', 'info', 'employee', 'strategy', 'premium') |
| `size`    | `string`        | ❌       | Icon size ('sm', 'md', 'lg', 'xl')                                                                     |
| `label`   | `string`        | ❌       | Accessible label for the icon                                                                          |

### SettingsCard

| Prop          | Type                  | Required | Description                        |
| ------------- | --------------------- | -------- | ---------------------------------- |
| `title`       | `string`              | ✅       | Card title                         |
| `description` | `string`              | ❌       | Card description                   |
| `icon`        | `ComponentType`       | ❌       | Icon component (e.g., `PiGear`)    |
| `iconSize`    | `string`              | ❌       | Icon size ('sm', 'md', 'lg', 'xl') |
| `entries`     | `SettingsCardEntry[]` | ❌       | Array of clickable entries         |

**Note:** Card icons automatically inherit the variant from the header icon for visual consistency.

### SettingsCardEntry

| Prop       | Type                     | Required | Description                                                       |
| ---------- | ------------------------ | -------- | ----------------------------------------------------------------- |
| `label`    | `string`                 | ✅       | Entry label text                                                  |
| `url`      | `string`                 | ❌       | Legacy: Direct URL (deprecated)                                   |
| `basePath` | `string`                 | ❌       | Recommended: Platform base path (e.g., '/platform/mdm/lead-data') |
| `params`   | `Record<string, string>` | ❌       | Query parameters for the URL (e.g., { tab: 'ratings' })           |
| `disabled` | `boolean`                | ❌       | Whether entry is disabled                                         |

**Navigation Pattern:**

- **Recommended**: Use `basePath` + `params` for proper URL building with `buildPlatformUrl`
- **Legacy**: Use `url` for direct URLs (maintained for backward compatibility)
- URLs are built automatically using the navigation utilities for proper development/production handling

## Design System Components Used

- **PageHeader**: Header section with icon, title, and actions
- **Input**: Search input field
- **Card**: Container for each settings category
- **Tailwind CSS Classes**: Responsive layout and styling

## Search Functionality

The component includes built-in search that filters cards based on:

- Card title (case-insensitive)
- Card description (case-insensitive)
- Entry labels (case-insensitive)

## Test IDs

Test IDs are automatically generated with the format:

- Layout: `{prefixDataTestId}-SettingsLayout`
- Search: `{prefixDataTestId}-SettingsLayout-Search-Input`
- Cards: `{prefixDataTestId}-SettingsLayout-Card-{index}`
- Entries: `{prefixDataTestId}-SettingsLayout-Entry-{cardIndex}-{entryIndex}`

## Examples

### Basic Settings Page

```tsx
<SettingsLayout headerIcon={<PiUsers />} headerLabel="HR Settings" cards={hrSettingsCards} />
```

### With Custom Search

```tsx
<SettingsLayout
  headerIcon={<PiTrendUp />}
  headerLabel="Investment Settings"
  cards={investmentCards}
  searchPlaceholder="Search investment settings..."
/>
```

### With Test ID Prefix

```tsx
<SettingsLayout
  headerIcon={<PiUsersThree />}
  headerLabel="Customer Settings"
  cards={customerCards}
  prefixDataTestId="CustomerSettings"
/>
```

## Migration from Legacy

To migrate from existing settings layouts:

1. **Replace PageLayout**: Use `SettingsLayout` instead of custom layouts
2. **Update Card Data**: Convert to `SettingsCard[]` format
3. **Remove Custom Search**: Built-in search replaces custom implementations
4. **Update Styling**: Remove Ant Design/gravity-ui-catalog dependencies

### Before (Legacy)

```tsx
// Multiple files with duplicated layout logic
// Ant Design dependencies
// Custom search implementations
```

### After (New)

```tsx
import { SettingsLayout } from '@/components/layout/settings-layout'

// Single reusable component
// nw-design-system integration
// Built-in search and navigation
```

## Benefits

- ✅ **Consistency**: Same layout across all settings pages
- ✅ **Maintainability**: Single source of truth for settings UI
- ✅ **Performance**: Optimized with proper memoization
- ✅ **Accessibility**: Built-in ARIA support and test IDs
- ✅ **Design System**: Leverages nw-design-system components
