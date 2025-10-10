# DynamicFormField Component

A reusable component that renders form fields dynamically based on their type definition from catalog configurations.

## Features

- ✅ **Type-Safe**: Full TypeScript support with generic types
- ✅ **Explicit Handling**: All field types explicitly handled (no silent fallbacks)
- ✅ **Error First**: Throws clear errors for unhandled types
- ✅ **Extensible**: Custom renderers for CATALOG* and REF* fields
- ✅ **Consistent**: Uses nw-design-system components throughout

## Supported Field Types

### Standard Types (Built-in)

- `DATE` - Date picker
- `DATETIME` - Date and time picker
- `AMOUNT` - Formatted number input for currency
- `PERCENTAGE` - Number input with % suffix (0-100)
- `NUMBER` - Generic number input
- `TEXT` - Single-line text input
- `TEXTAREA` - Multi-line text input

### Custom Types (Require Renderers)

- `CATALOG_*` - Catalog entry selection (e.g., `CATALOG_IndustryType`)
- `REF_*` - Entity references (e.g., `REF_InvestmentAccount`)

## Usage

### Basic Example (Standard Fields)

```tsx
import { DynamicFormField } from '@/components/dynamic-form-field'
import { useForm } from 'react-hook-form'

function MyForm() {
  const form = useForm()

  return (
    <form>
      <DynamicFormField
        field={{
          type: 'TEXT',
          label: 'Company Name',
          property: 'companyName',
          required: true,
          displayOrder: 1
        }}
        fieldName="companyName"
        control={form.control}
        testIdPrefix="CompanyForm"
      />

      <DynamicFormField
        field={{
          type: 'DATE',
          label: 'Founded Date',
          property: 'foundedDate',
          required: false,
          displayOrder: 2
        }}
        fieldName="foundedDate"
        control={form.control}
        testIdPrefix="CompanyForm"
      />
    </form>
  )
}
```

### With Custom Number Input Component

```tsx
import FormattedNumberInput from './FormattedNumberInput'
;<DynamicFormField
  field={{
    type: 'AMOUNT',
    label: 'Investment Amount',
    property: 'investmentAmount',
    required: true,
    displayOrder: 1
  }}
  fieldName="investmentAmount"
  control={form.control}
  FormattedNumberInput={FormattedNumberInput}
/>
```

### With Catalog Fields

```tsx
<DynamicFormField
  field={{
    type: 'CATALOG_IndustryType',
    label: 'Industry',
    property: 'industryTypeRef',
    required: true,
    displayOrder: 1
  }}
  fieldName="industryTypeRef"
  control={form.control}
  renderCatalogField={(catalogName, field, fieldName) => (
    <CatalogSelectField catalogName={catalogName} label={field.label} fieldName={fieldName} required={field.required} />
  )}
/>
```

### With Reference Fields

```tsx
<DynamicFormField
  field={{
    type: 'REF_InvestmentAccount',
    label: 'Related Account',
    property: 'accountId',
    required: false,
    displayOrder: 1
  }}
  fieldName="accountId"
  control={form.control}
  renderReferenceField={(entityType, field, fieldName) => {
    if (entityType === 'InvestmentAccount') {
      return <InvestmentAccountSelect {...field} />
    }
    throw new Error(`Unsupported reference type: ${entityType}`)
  }}
/>
```

## Props

| Prop                   | Type                                           | Required        | Description                                                     |
| ---------------------- | ---------------------------------------------- | --------------- | --------------------------------------------------------------- |
| `field`                | `DynamicFieldDefinition`                       | Yes             | Field configuration from catalog                                |
| `fieldName`            | `string`                                       | Yes             | Form field name                                                 |
| `control`              | `Control<TFieldValues>`                        | Yes             | React Hook Form control                                         |
| `testIdPrefix`         | `string`                                       | No              | Prefix for data-testid attributes (default: 'DynamicFormField') |
| `renderCatalogField`   | `(catalogName, field, fieldName) => ReactNode` | For CATALOG\_\* | Custom renderer for catalog fields                              |
| `renderReferenceField` | `(entityType, field, fieldName) => ReactNode`  | For REF\_\*     | Custom renderer for reference fields                            |
| `FormattedNumberInput` | `ComponentType<any>`                           | No              | Custom number input component (default: Input)                  |

## Field Definition Interface

```typescript
interface DynamicFieldDefinition {
  type: string // Field type (DATE, TEXT, CATALOG_*, REF_*, etc.)
  label: string // Display label
  property: string // Property path (e.g., 'investment.name')
  required: boolean // Whether field is required
  displayOrder: string | number // Display order for layout
}
```

## Error Handling

The component throws explicit errors for:

- **Unhandled field types**: `throw new Error('Unhandled field type "XYZ"')`
- **Missing CATALOG\_ renderer**: `throw new Error('CATALOG_ field requires renderCatalogField prop')`
- **Missing REF\_ renderer**: `throw new Error('REF_ field requires renderReferenceField prop')`

This ensures developers are immediately aware of missing implementations rather than silent failures.

## Design System Compliance

- Uses `@newwork/nw-design-system` components exclusively
- Follows `gba:` prefix for Tailwind utilities
- Uses design tokens for colors (e.g., `var(--nw-color-danger-500)`)
- Consistent spacing and layout patterns

## Migration from DynamicGroupSegment

If you're migrating from the old `DynamicGroupSegment` component:

**Before:**

```tsx
<DynamicGroupSegment />
```

**After:**

```tsx
{
  fields.map(field => (
    <DynamicFormField
      key={getFieldName(field.property)}
      field={field}
      fieldName={getFieldName(field.property)}
      control={form.control}
      renderCatalogField={renderCatalog}
      renderReferenceField={renderReference}
    />
  ))
}
```

## Testing

All fields automatically receive `data-testid` attributes:

- Text/Number inputs: `{testIdPrefix}-{fieldName}Input`
- Textareas: `{testIdPrefix}-{fieldName}Textarea`
- Date fields: `{testIdPrefix}-{fieldName}Input`
- DateTime fields: `{testIdPrefix}-{fieldName}DateInput` and `{testIdPrefix}-{fieldName}TimeInput`

Example:

```tsx
<DynamicFormField
  field={{ type: 'TEXT', label: 'Name', ... }}
  fieldName="companyName"
  testIdPrefix="CompanyForm"
/>
// Renders with: data-testid="CompanyForm-companyNameInput"
```
