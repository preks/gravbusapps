# NumberField Component

A reusable number input component that uses comma as decimal separator for European formatting. Automatically converts between comma display (user-facing) and dot format (internal/API).

## Features

- ✅ **European Decimal Format**: Uses comma (`,`) as decimal separator for display
- ✅ **API Compatibility**: Internally stores numbers with dot (`.`) format
- ✅ **Smart Input Handling**: Accepts both comma and dot input, converts automatically
- ✅ **Validation**: Prevents multiple decimal separators
- ✅ **Partial Input Support**: Allows typing like "11," or "11." during input
- ✅ **Accessibility**: Proper labeling and error handling
- ✅ **Mobile Friendly**: Uses `inputMode="decimal"` for numeric keypad

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Field name for form identification |
| `label` | `string` | - | Field label |
| `showLabel` | `boolean` | `true` | Whether to show the label |
| `value` | `number \| string` | - | Current value (number or string) |
| `onChange` | `(value: number \| string) => void` | - | Change handler |
| `onBlur` | `() => void` | - | Blur handler for validation |
| `required` | `boolean` | `false` | Whether field is required |
| `placeholder` | `string` | - | Placeholder text |
| `description` | `string` | - | Field description |
| `hasError` | `boolean` | `false` | Whether field has validation error |
| `errorMessage` | `string` | - | Error message to display |
| `disabled` | `boolean` | `false` | Whether field is disabled |
| `testId` | `string` | `number-field-${name}` | Test ID for testing |
| `className` | `string` | `''` | Additional CSS classes |
| `id` | `string` | - | HTML id attribute |

## Usage Examples

### Basic Usage
```tsx
import { NumberField } from './NumberField';

<NumberField
  name="amount"
  label="Amount"
  value={formData.amount}
  onChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
  required
/>
```

### Without Label (for use in forms with external labels)
```tsx
<NumberField
  name="price"
  label="Price"
  showLabel={false}
  value={formData.price}
  onChange={(value) => handleFieldChange('price', value)}
  placeholder="Enter price"
/>
```

### With Error Handling
```tsx
<NumberField
  name="budget"
  label="Budget"
  value={formData.budget}
  onChange={(value) => handleFieldChange('budget', value)}
  hasError={!!errors.budget}
  errorMessage={errors.budget}
  required
/>
```

## Behavior

### Input Examples
- **User types `12,5`**: Displays `12,5`, stores `12.5`
- **User types `12.5`**: Displays `12,5`, stores `12.5`
- **User types `12,`**: Allows partial input during typing
- **User types `12.`**: Allows partial input during typing
- **User types `12,5,3`**: Rejected, keeps previous valid value
- **User types `12.5.3`**: Rejected, keeps previous valid value

### Data Flow
1. **User Input**: Types with comma or dot
2. **Display**: Always shows comma format
3. **Internal Storage**: Always uses dot format
4. **API Submission**: Sends dot format for compatibility

## Integration

This component is used in:
- `DynamicFormGenerator.tsx` (service-desk)
- `RequestForm.tsx` (service-portal)

Both implementations use the same reusable component for consistency and maintainability.
