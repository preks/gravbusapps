# Contact Form

A comprehensive React form component for creating and editing contacts in the CRM system, following the same patterns as AccountForm.

## Structure Created

```
src/business-apps/crm/common/forms/contact-form/
├── ContactForm.tsx                 # Main form wrapper component
├── index.ts                       # Exports and barrel file
├── types.ts                       # TypeScript interfaces
├── context/
│   └── ContactFormContext.tsx     # Form state management and data hooks
├── components/
│   ├── ContactFormComponent.tsx   # Main form layout and submission logic
│   ├── PersonalInformationSection.tsx      # Personal details (name, title, bio)
│   ├── ProfessionalInformationSection.tsx  # Job-related information
│   ├── ContactInformationSection.tsx       # Email, phone, social media
│   ├── AccountInformationSection.tsx       # Account relationship and ownership
│   └── AdditionalInformationSection.tsx    # Notes and system information
└── README.md                      # This documentation
```

## Available Fields

### Personal Information Section

- **Academic Title** (academicTitleRef) - Dropdown: Dr., Prof., MBA, etc.
- **First Name\*** (firstName) - Required text field
- **Last Name\*** (lastName) - Required text field
- **Birth Date** (birthDate) - Date picker
- **Preferred Language** (languageRef) - Dropdown: English, German, French, etc.
- **Profile Picture URL** (pictureUrl) - URL input
- **Biography** (bio) - Multi-line text area

### Professional Information Section

- **Job Title** (jobTitle) - Text input
- **Department** (department) - Dropdown: Sales, Marketing, Engineering, etc.
- **Contact Type** (contactType) - Dropdown: Primary, Secondary, Technical, etc.
- **Work Experience Years** (workExperienceYears) - Number input

### Contact Information Section

- **Email Address\*** (email) - Required email input
- **Phone Number** (phone) - Tel input
- **Fax Number** (fax) - Tel input
- **LinkedIn Profile** (linkedinUrl) - URL input
- **XING Profile** (xingUrl) - URL input

### Account & Ownership Information Section

- **Related Account** (accountId) - Text input (TODO: Account search)
- **Contact Owner\*** (ownerEmployeeId) - Required employee dropdown with auto-selection
- **Owner Organization** (ownerOrganizationId) - Text input (auto-populated)

### Additional Information Section

- **Notes Summary** (notesSummary) - Multi-line text area
- **System Information** - Display-only (ID, version, source, state)

## Required Fields

The form validates that these fields are filled before submission:

- ✅ **First Name** (firstName)
- ✅ **Last Name** (lastName)
- ✅ **Email Address** (email)
- ✅ **Contact Owner** (ownerEmployeeId)

## GraphQL Entity Mapping

Based on the Contact entity from GraphQL schema, the form maps to these key fields:

```typescript
// Core Contact fields from GraphQL
{
  firstName: String
  lastName: String
  email: String
  phone: String
  jobTitle: String
  academicTitleRef: String (→ CatalogEntry)
  languageRef: String (→ CatalogEntry)
  contactType: String
  department: String
  bio: String
  birthDate: timestamp
  workExperienceYears: numeric
  linkedinUrl: String
  xingUrl: String
  fax: String
  pictureUrl: String
  accountId: uuid (→ Account)
  ownerEmployeeId: uuid (→ Employee)
  ownerOrganizationId: uuid (→ OrganizationalUnit)
  notesSummary: String
}
```

## Usage Examples

### Basic Usage

```typescript
import { ContactForm } from '@/business-apps/crm/common/forms/contact-form';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const MyComponent: React.FC<BusinessAppContextProps> = (context) => {
  const handleSubmit = async (values: ContactFormValues) => {
    console.log('Contact form submitted:', values);
    // Handle form submission
  };

  const handleCancel = async () => {
    console.log('Contact form cancelled');
    // Handle form cancellation
  };

  return (
    <ContactForm
      {...context}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
```

### With Initial Values (Edit Mode)

```typescript
const editContact = {
  id: "existing-contact-id",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@company.com",
  phone: "+1-555-0123",
  jobTitle: "Sales Manager",
  department: "sales",
  contactType: "primary",
  ownerEmployeeId: "current-user-id"
};

return (
  <ContactForm
    {...context}
    initialValues={editContact}
    onSubmit={handleUpdate}
    onCancel={handleCancel}
  />
);
```

## Features

### ✅ Implemented

- Complete form structure with 5 organized sections
- Form validation for required fields
- Context-based state management
- Employee owner selection with auto-selection of current user
- Static dropdown options for all categorical fields
- Process event dispatching for Kogito integration
- Responsive design with Tailwind CSS
- Comprehensive test IDs for automation
- TypeScript interfaces with proper typing

### 🔄 TODO

- **Account Search Integration**: Implement GraphQL-based account search
- **Catalog API Integration**: Replace static dropdowns with real catalog data
- **Address Management**: Add address form sections
- **Communication Channels**: Add phone/email channel management
- **File Upload**: Profile picture upload functionality
- **Validation**: Enhanced field validation rules
- **API Integration**: Full GraphQL mutation integration

## Pattern Consistency

This ContactForm follows the exact same architectural patterns as AccountForm:

- ✅ Same folder structure and naming conventions
- ✅ Same context provider pattern for state management
- ✅ Same section-based component organization
- ✅ Same validation and submission handling
- ✅ Same process event integration
- ✅ Same styling and responsive design patterns
- ✅ Same TypeScript interface structure

## Integration

The form is ready to be integrated into:

- CRM contact creation workflows
- Contact editing screens
- Kogito business processes
- Modal dialogs or full-page forms
