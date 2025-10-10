# DynamicForm Component

A centralized form orchestration component that handles JSON-based form configuration, field layout, and rendering.

## Features

- ✅ **JSON Configuration**: Define entire forms using JSON structure
- ✅ **Automatic Layout**: Single fields get full width, multiple fields in same row use grid
- ✅ **Group Management**: Organize fields into labeled groups with display order
- ✅ **State Handling**: Built-in loading, error, and empty states
- ✅ **Field Orchestration**: Uses `DynamicFormField` for individual field rendering
- ✅ **Type-Safe**: Full TypeScript support

## Usage

### Basic Example

```tsx
import { DynamicForm } from '@/components/dynamic-form'
import { useForm } from 'react-hook-form'

function MyForm() {
  const form = useForm()

  const configuration = {
    formFields: [
      {
        groupId: 'basicInfo',
        groupLabel: 'Basic Information',
        displayOrder: 1,
        fields: [
          {
            type: 'TEXT',
            label: 'Company Name',
            property: 'companyName',
            required: true,
            displayOrder: '1'
          },
          {
            type: 'DATE',
            label: 'Founded Date',
            property: 'foundedDate',
            required: false,
            displayOrder: '2'
          }
        ]
      }
    ]
  }

  return (
    <DynamicForm
      configuration={configuration}
      control={form.control}
      accessToken={accessToken}
      testIdPrefix="CompanyForm"
    />
  )
}
```

### Multi-Column Layout

Fields with the same display order base number will appear in the same row:

```tsx
const configuration = {
  formFields: [
    {
      groupId: 'dimensions',
      groupLabel: 'Dimensions',
      displayOrder: 1,
      fields: [
        // These two will be side-by-side
        {
          type: 'NUMBER',
          label: 'Width',
          property: 'width',
          required: true,
          displayOrder: '1.1' // Same base number (1)
        },
        {
          type: 'NUMBER',
          label: 'Height',
          property: 'height',
          required: true,
          displayOrder: '1.2' // Same base number (1)
        },
        // This one will be full width
        {
          type: 'TEXT',
          label: 'Description',
          property: 'description',
          required: false,
          displayOrder: '2' // Different base number
        }
      ]
    }
  ]
}
```

### With Catalog Fields

```tsx
const configuration = {
  formFields: [
    {
      groupId: 'classification',
      groupLabel: 'Classification',
      displayOrder: 1,
      fields: [
        {
          type: 'CATALOG_IndustryType',
          label: 'Industry',
          property: 'industryTypeRef',
          required: true,
          displayOrder: '1'
        },
        {
          type: 'CATALOG_CompanySize',
          label: 'Company Size',
          property: 'companySizeRef',
          required: false,
          displayOrder: '2'
        }
      ]
    }
  ]
}
```

### With Loading State

```tsx
<DynamicForm configuration={configuration} control={form.control} accessToken={accessToken} isLoading={true} />
// Displays: "Loading form fields..."
```

### With Error State

```tsx
<DynamicForm
  configuration={configuration}
  control={form.control}
  accessToken={accessToken}
  error="Failed to load configuration"
/>
// Displays error message in red box
```

## Props

| Prop                   | Type                       | Required | Default                      | Description                               |
| ---------------------- | -------------------------- | -------- | ---------------------------- | ----------------------------------------- |
| `configuration`        | `DynamicFormConfiguration` | Yes      | -                            | Form configuration with groups and fields |
| `control`              | `Control<TFieldValues>`    | Yes      | -                            | React Hook Form control                   |
| `accessToken`          | `string`                   | Yes      | -                            | Access token for API requests             |
| `testIdPrefix`         | `string`                   | No       | `'DynamicForm'`              | Prefix for data-testid attributes         |
| `renderReferenceField` | `function`                 | No       | -                            | Custom renderer for REF\_ fields          |
| `FormattedNumberInput` | `ComponentType`            | No       | -                            | Custom number input component             |
| `isLoading`            | `boolean`                  | No       | `false`                      | Loading state                             |
| `error`                | `string \| null`           | No       | `null`                       | Error message                             |
| `emptyMessage`         | `string`                   | No       | `'No form fields available'` | Empty state message                       |

## Configuration Structure

### DynamicFormConfiguration

```typescript
interface DynamicFormConfiguration {
  formFields: DynamicFormFieldGroup[]
}
```

### DynamicFormFieldGroup

```typescript
interface DynamicFormFieldGroup {
  groupId: string // Unique identifier
  groupLabel: string // Display label for the group
  displayOrder: number // Order of this group
  fields: DynamicFormFieldDefinition[]
}
```

### DynamicFormFieldDefinition

```typescript
interface DynamicFormFieldDefinition {
  type: string // DATE, TEXT, CATALOG_*, REF_*, etc.
  label: string // Display label
  property: string // Property path (e.g., "investment.name")
  required: boolean // Whether field is required
  displayOrder: string | number // Display order (e.g., "1", "1.1", "1.2")
}
```

## Display Order Logic

The `displayOrder` field controls both field order and layout:

- **Single number** (e.g., `"1"`, `"2"`): Field gets full width
- **Decimal notation** (e.g., `"1.1"`, `"1.2"`): Fields with same base number are placed in the same row

Examples:

- `displayOrder: "1"` → Full width row
- `displayOrder: "2.1"`, `displayOrder: "2.2"` → Two columns in same row
- `displayOrder: "3"` → Full width row
- `displayOrder: "4.1"`, `displayOrder: "4.2"`, `displayOrder: "4.3"` → Three columns in same row

## Field Name Extraction

Field names use the FULL property path as-is (no transformations):

- `"investment.name"` → `"investment.name"`
- `"equityInvestment.marketValue"` → `"equityInvestment.marketValue"`
- `"size"` → `"size"`

**Catalog Fields**: Property paths are used WITHOUT `Ref` suffix:

- `"investment.investmentType"` with type `CATALOG_InvestmentType` → `"investment.investmentType"`
- `"equityInvestment.investmentStakeType"` with type `CATALOG_InvestmentStakeType` → `"equityInvestment.investmentStakeType"`

**Important**: Form state uses catalog fields WITHOUT `Ref` suffix. The API payload builder adds `Ref` suffixes when submitting data.

## States

### Loading

```tsx
<DynamicForm isLoading={true} {...props} />
```

Displays centered loading message.

### Error

```tsx
<DynamicForm error="Error message" {...props} />
```

Displays error in destructive-styled box.

### Empty

```tsx
<DynamicForm configuration={{ formFields: [] }} {...props} />
```

Displays empty state message.

## Integration with DynamicFormField

`DynamicForm` uses `DynamicFormField` internally for rendering individual fields. All field types supported by `DynamicFormField` are automatically supported:

- Standard: DATE, DATETIME, TEXT, TEXTAREA, NUMBER, AMOUNT, PERCENTAGE
- Catalog: CATALOG\_\* (with automatic Combobox)
- Reference: REF\_\* (requires custom renderer)

## Testing

All rendered elements include `data-testid` attributes:

- Container: `{testIdPrefix}-Container`
- Loading: `{testIdPrefix}-Loading`
- Error: `{testIdPrefix}-Error`
- Empty: `{testIdPrefix}-Empty`
- Group: `{testIdPrefix}-{groupId}Group`

Example:

```tsx
<DynamicForm testIdPrefix="InvestmentForm" {...props} />
// Renders: data-testid="InvestmentForm-Container"
// Group: data-testid="InvestmentForm-basicInfoGroup"
```

## Design System Compliance

- Uses `gba:` prefix for all Tailwind utilities
- Uses design tokens (`gba:text-muted-foreground`, `gba:bg-destructive-secondary`)
- No inline styles
- Follows spacing and layout conventions
