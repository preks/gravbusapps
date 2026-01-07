# DateTimeField Component

A comprehensive date/datetime picker component for dynamic forms using the NEWWORK Design System.

## Features

- **Dual Mode Support**: Supports both date-only and datetime modes
- **Design System Integration**: Built with `@newwork/nw-design-system` components
- **Accessibility**: Full keyboard navigation and screen reader support
- **Validation**: Built-in validation with custom error messages
- **Flexible Input**: Supports Date objects, ISO strings, and null values
- **Time Selection**: Multiple time input methods (input field + dropdown)
- **Responsive Design**: Works on desktop and mobile devices
- **Customizable**: Configurable formats, placeholders, and validation rules

## Usage

### Basic Date Field

```tsx
import { DateTimeField } from '@/business-apps/ser/components';

<DateTimeField
  name="birthDate"
  label="Birth Date"
  type="date"
  value={selectedDate}
  onChange={(date) => setSelectedDate(date)}
  required
/>
```

### DateTime Field with Time Selection

```tsx
<DateTimeField
  name="appointmentTime"
  label="Appointment Time"
  type="datetime"
  value={appointmentDateTime}
  onChange={(date) => setAppointmentDateTime(date)}
  description="Select your preferred appointment time"
  required
/>
```

### With Validation

```tsx
<DateTimeField
  name="dueDate"
  label="Due Date"
  type="date"
  value={dueDate}
  onChange={(date) => setDueDate(date)}
  minDate={new Date()} // No past dates
  maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // Max 1 year ahead
  hasError={!!errors.dueDate}
  errorMessage={errors.dueDate}
  required
/>
```

### Without Label (for use in forms that handle labels separately)

```tsx
<DateTimeField
  name="appointmentTime"
  label="Appointment Time"
  showLabel={false}
  type="datetime"
  value={appointmentDateTime}
  onChange={(date) => setAppointmentDateTime(date)}
  required
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Field name for form identification |
| `label` | `string` | - | Field label |
| `showLabel` | `boolean` | `true` | Whether to show the label |
| `value` | `Date \| string \| null` | `null` | Current value |
| `onChange` | `(value: Date \| null) => void` | - | Change handler |
| `onBlur` | `() => void` | - | Blur handler for validation |
| `required` | `boolean` | `false` | Whether field is required |
| `placeholder` | `string` | - | Placeholder text |
| `description` | `string` | - | Field description |
| `hasError` | `boolean` | `false` | Whether field has validation error |
| `errorMessage` | `string` | - | Error message to display |
| `disabled` | `boolean` | `false` | Whether field is disabled |
| `type` | `'date' \| 'datetime'` | `'date'` | Field type |
| `testId` | `string` | `datetime-field-${name}` | Test ID for testing |
| `minDate` | `Date` | - | Minimum date allowed |
| `maxDate` | `Date` | - | Maximum date allowed |
| `dateFormat` | `string` | `'YYYY-MM-DD'` | Date format for display |
| `timeFormat` | `string` | `'HH:mm'` | Time format for display |

## Integration with DynamicFormGenerator

The DateTimeField is automatically used by the DynamicFormGenerator for `DATE` and `DATETIME` field types:

```tsx
// Dynamic form schema
const schema: DynamicFormField[] = [
  {
    type: 'DATE',
    name: 'startDate',
    label: 'Start Date',
    required: true,
    description: 'When should this begin?'
  },
  {
    type: 'DATETIME',
    name: 'meetingTime',
    label: 'Meeting Time',
    required: true,
    validation: [
      { type: 'minDate', value: new Date(), message: 'Cannot schedule in the past' }
    ]
  }
];
```

## Validation Rules

The component supports these validation rules through the DynamicFormGenerator:

- `required`: Field is required
- `minDate`: Minimum date allowed
- `maxDate`: Maximum date allowed  
- `dateRange`: Date must be within a specific range

```tsx
// Example validation rules
const validation: ValidationRule[] = [
  { type: 'required', message: 'Date is required' },
  { type: 'minDate', value: new Date(), message: 'Cannot select past dates' },
  { type: 'maxDate', value: new Date('2025-12-31'), message: 'Cannot select dates after 2025' }
];
```

## Styling

The component uses the `gba:` prefix for all Tailwind CSS classes following the project conventions:

- Consistent spacing with `gba:space-y-2`
- Error states with `gba:border-destructive`
- Proper focus states and accessibility
- Responsive design with mobile-friendly touch targets

## Testing

The component includes comprehensive test coverage:

```bash
npm test DateTimeField.test.tsx
```

Test scenarios include:
- Rendering in both date and datetime modes
- Value handling (Date objects, strings, null)
- Validation error display
- User interactions (calendar opening, date selection)
- Accessibility features

## Dependencies

- `@newwork/nw-design-system`: UI components
- `@phosphor-icons/react`: Icons
- `dayjs`: Date manipulation and formatting
- `react-day-picker`: Calendar component (via nw-design-system)

## Browser Support

- Modern browsers with ES2017+ support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Keyboard navigation support
- Screen reader compatibility
