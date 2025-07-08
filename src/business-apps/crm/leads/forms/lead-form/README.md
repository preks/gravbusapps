# Lead Form

A comprehensive React form component for creating and updating lead records in the CRM system.

## Features

- ✅ **Create new leads** or **update existing leads**
- ✅ **Form validation** with real-time feedback
- ✅ **Auto-completion** for company names from existing accounts
- ✅ **Employee position selection** with profile pictures and job information
- ✅ **Contact and company information** management
- ✅ **Address management** with dynamic address lines
- ✅ **Collapsible sections** for better UX
- ✅ **GraphQL integration** for data loading and catalog management
- ✅ **TypeScript support** with full type safety

## Usage

### Creating a New Lead

```tsx
import { LeadForm } from '@/business-apps/crm/leads/forms/lead-form';

const CreateLeadPage = () => {
  const handleSubmit = async (values) => {
    // Handle lead creation
    console.log('Creating lead:', values);
  };

  const handleCancel = () => {
    // Handle form cancellation
    console.log('Form cancelled');
  };

  return (
    <LeadForm 
      accessToken={accessToken}
      userInfo={userInfo}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
```

### Updating an Existing Lead

```tsx
import { LeadForm } from '@/business-apps/crm/leads/forms/lead-form';

const UpdateLeadPage = () => {
  const leadId = "lead-uuid-here";

  const handleSubmit = async (values) => {
    // Handle lead update
    console.log('Updating lead:', values);
  };

  const handleCancel = () => {
    // Handle form cancellation
    console.log('Form cancelled');
  };

  return (
    <LeadForm 
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={{ leadId }} // Pass leadId to load existing data
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
```

## API Integration

### GraphQL Integration

The form automatically:
- Loads existing lead data when `leadId` is provided in `additionalData`
- Fetches catalog data (lead sources, statuses, ratings)
- Searches accounts for company autocomplete
- Loads employee positions for owner selection

### Required Props

- `accessToken`: Authentication token for API requests
- `userInfo`: Current user information (contains employee details)
- `onSubmit`: Function called when form is submitted
- `onCancel`: Function called when form is cancelled

### Optional Props

- `initialValues`: Initial form values (for pre-populating fields)
- `additionalData`: Object containing `leadId` for updating existing leads

## Form Structure

### 1. Lead Information Section
- **Owner**: Employee position selection with search
- **Status**: Lead status dropdown
- **Source**: Lead source dropdown  
- **Rating**: Lead rating dropdown

### 2. Contact Information Section
- **Salutation**: Title dropdown (Mr., Mrs., Ms., Dr., Prof.)
- **First Name**: Required text input
- **Last Name**: Required text input
- **Job Position**: Text input
- **Phone**: Text input with validation
- **Email**: Text input with validation

### 3. Company Information Section
- **Legal Form**: Dropdown selection
- **Industry**: Industry dropdown
- **Company Name**: Required text input with autocomplete
- **Website**: URL input
- **Additional Information** (collapsible):
  - Company Email, Phone, Time Zone
  - Foundation Date, Number of Employees
  - Annual Revenue

### 4. Address Information Section
- **Country**: Country dropdown
- **Region**: Text input
- **Address Lines**: Dynamic address lines (1-4)
- **Postal Code & City**: Side-by-side inputs

### 5. Notes Section (collapsible)
- **Description**: Multi-line text area for notes

## Data Flow

1. **Form Initialization**: Loads catalog data and employee positions
2. **Lead Loading** (update mode): Fetches existing lead data via GraphQL
3. **Form Population**: Maps loaded data to form fields
4. **User Interaction**: Real-time validation and autocomplete
5. **Submission**: Validates and submits form data

## Error Handling

- **API Errors**: Displayed in error alerts with retry options
- **Validation Errors**: Real-time field validation with error messages
- **Loading States**: Loading indicators during data fetching

## File Structure

```
src/business-apps/crm/leads/forms/lead-form/
├── LeadForm.tsx                 # Main entry component
├── index.ts                     # Module exports
├── README.md                    # Documentation
├── components/                  # Form section components
│   ├── LeadFormComponent.tsx    # Main form layout
│   ├── LeadInformationSection.tsx
│   ├── ContactInformationSection.tsx
│   ├── CompanyInformationSection.tsx
│   ├── AddressInformationSection.tsx
│   ├── NotesSection.tsx
│   └── LeadOwnerSelect.tsx
├── context/                     # Form state management
│   └── LeadFormContext.tsx
├── hooks/                       # Data fetching hooks
│   ├── useAccountsData.ts
│   ├── useContactsData.ts
│   ├── useEmployeePositions.ts
│   └── useLeadCatalogs.ts
├── queries/                     # GraphQL queries
│   └── LeadQueries.ts
├── types.ts                     # TypeScript types
└── utils/                       # Utility functions
    └── validationUtils.ts
```

## Architecture

### File Structure

```
lead-form/
├── LeadForm.tsx              # Main entry point
├── index.ts                  # Module exports
├── types.ts                  # TypeScript interfaces
├── README.md                 # Documentation
├── components/
│   └── LeadFormComponent.tsx # Main form UI component
├── context/
│   └── LeadFormContext.tsx   # Context provider for state management
└── hooks/
    ├── useAccountsData.ts    # GraphQL hook for accounts
    ├── useContactsData.ts    # GraphQL hook for contacts
    ├── useEmployeePositions.ts # GraphQL hook for employee positions
    └── useLeadCatalogs.ts    # Catalog API hook for reference data
```

### Key Components

#### LeadForm.tsx
Main entry point that combines the context provider with the form component.

#### LeadFormContext.tsx
Context provider that manages:
- Form state and validation
- Data loading and error states
- Integration with GraphQL and Catalog APIs
- Default value population (current user as owner)

#### LeadFormComponent.tsx
Main form UI built with @newwork/gravity-ui-catalog components featuring:
- **Lead Information Section**: Core lead details (always visible)
- **Address Information Section**: Address details (collapsible)
- Professional styling with hover effects and proper spacing

## Form Fields

### Lead Information (Always Visible)
- **Lead Status** (required): Dropdown with catalog values
- **Lead Owner** (required): Enhanced dropdown with profile pictures and job info
- **Salutation**: Mr., Mrs., Ms., Dr., Prof.
- **First Name** (required): Text input
- **Last Name** (required): Text input
- **Company** (required): Text input with autocomplete suggestions
- **Title**: Job title text input
- **Phone**: Text input
- **Email**: Text input with email validation
- **Rating**: Dropdown with catalog values
- **Follow Up**: Checkbox

### Address Information (Collapsible)
- **Address**: Multi-line text area
- **City**: Text input
- **State/Province**: Text input
- **Website**: Text input with URL validation

## Data Integration

### GraphQL APIs
- **Accounts**: Search and autocomplete for company field
- **Contacts**: Search with auto-fill for email/phone
- **Employee Positions**: Enhanced employee data with profile pictures

### Catalog APIs
- **SalesLeadSource**: Lead source options
- **SalesLeadStatus**: Lead status options
- **SalesLeadRating**: Lead rating options

## Publishing

To publish the form:
```bash
npm run publish:screen -- /crm/leads/forms/lead-form
```

## Migration Notes

This standalone form replaces the integrated lead form found in:
- `src/business-apps/crm/overview-screens/LeadsOverview/components/AddEditLead.tsx`

The new form provides:
- Better separation of concerns
- Enhanced user experience
- Improved maintainability
- Consistent patterns with other forms 