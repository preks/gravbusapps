# Shared SER Components

This directory contains shared components used across both Service Portal and Service Desk applications.

## DynamicFormGenerator

A reusable component for rendering dynamic forms based on workflow template field definitions from the custom-flow-engine.

### Features

- **Dynamic Field Types**: Supports TEXT, EMAIL, URL, NUMBER, TEXTAREA, SELECT, DATE, CHECKBOX, MULTISELECT
- **Validation**: Built-in validation with custom rules support
- **Flexible Rendering**: Can be rendered with or without card wrapper
- **Real-time Updates**: Form value changes are propagated to parent components
- **TypeScript Support**: Fully typed with comprehensive interfaces

### Usage

```typescript
import { DynamicFormGenerator } from '@/business-apps/ser/components/DynamicFormGenerator';
import { DynamicFormField, DynamicFormValues } from '@/business-apps/ser/types/flowTemplate';

// Define form schema
const schema: DynamicFormField[] = [
  {
    type: 'TEXT',
    name: 'employeeName',
    label: 'Employee Name',
    required: true
  },
  {
    type: 'SELECT',
    name: 'department',
    label: 'Department',
    required: true,
    options: [
      { value: 'hr', label: 'Human Resources' },
      { value: 'it', label: 'Information Technology' }
    ]
  }
];

// Use in component
<DynamicFormGenerator
  schema={schema}
  initialValues={{}}
  onValuesChange={(values) => console.log('Form values:', values)}
  onSubmit={(values) => handleSubmit(values)}
  submitButtonText="Submit Form"
  title="Employee Information"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | `DynamicFormField[]` | **required** | Array of field definitions |
| `initialValues` | `DynamicFormValues` | `{}` | Initial form values |
| `onValuesChange` | `(values: DynamicFormValues) => void` | `undefined` | Called when form values change |
| `onSubmit` | `(values: DynamicFormValues) => Promise<void>` | **required** | Form submission handler |
| `isSubmitting` | `boolean` | `false` | Loading state for submission |
| `submitButtonText` | `string` | `'Submit'` | Text for submit button |
| `title` | `string` | `'Form Details'` | Form title |
| `description` | `string` | `undefined` | Form description |
| `showSubmitButton` | `boolean` | `true` | Whether to show submit button |
| `showCard` | `boolean` | `true` | Whether to wrap in card component |

### Field Types

- **TEXT**: Single-line text input
- **EMAIL**: Email input with validation
- **URL**: URL input with validation
- **NUMBER**: Numeric input
- **TEXTAREA**: Multi-line text input
- **SELECT**: Dropdown selection
- **DATE**: Date picker
- **CHECKBOX**: Multiple checkboxes
- **MULTISELECT**: Multiple selection with checkboxes

### Integration Points

#### Service Portal
- Used in `RequestForm` component for dynamic service request forms
- Transforms workflow template `formSchema` from step 0

#### Service Desk
- Used in `TaskRecord` component for task completion forms
- Renders task `form` fields dynamically for user input

### Template Integration

The component integrates with custom-flow-engine templates:

1. **Template Definition**: JSON templates define form fields in workflow steps
2. **Field Transformation**: Raw template fields are transformed to `DynamicFormField` format
3. **Dynamic Rendering**: Component renders appropriate input types based on field definitions
4. **Form Submission**: Collected form data is submitted to complete workflow tasks

### Example Template Field

```json
{
  "type": "SELECT",
  "name": "trainingType",
  "label": "Training Type",
  "required": true,
  "options": [
    { "value": "orientation", "label": "General Orientation" },
    { "value": "role-specific", "label": "Role-Specific Training" }
  ]
}
```

This creates a dropdown field with validation that users must complete to proceed with the workflow.
