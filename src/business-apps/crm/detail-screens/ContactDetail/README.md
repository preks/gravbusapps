# ContactDetail Component

This component displays detailed information about a contact in the CRM module.

## Features

- **Contact Information Display**: Shows comprehensive contact details including name, job title, email, phone, company, and owner
- **Social Links**: Displays LinkedIn and Xing profiles if available
- **Activity Timeline**: Shows contact creation and update history
- **Quick Actions**: Provides buttons for common actions like sending email, calling, scheduling meetings, and creating notes
- **Edit Functionality**: Allows editing contact information through a modal
- **Delete Functionality**: Provides ability to delete contacts with confirmation
- **Responsive Design**: Works on both desktop and mobile devices

## Props

```typescript
interface ContactDetailProps extends BusinessAppContextProps {
  contactId?: string;           // ID of the contact to display
  isEditMode?: boolean;         // Whether the component is in edit mode
  isNewContact?: boolean;       // Whether this is a new contact
  onBack: () => void;          // Callback when user clicks back
  onDelete?: () => void;       // Callback when contact is deleted
}
```

## Usage

```tsx
import { ContactDetail } from '@/business-apps/crm/detail-screens/ContactDetail';

<ContactDetail
  accessToken={accessToken}
  employeeId={employeeId}
  contactId="contact-123"
  onBack={() => setShowDetail(false)}
  onDelete={() => refetchContacts()}
/>
```

## Navigation

This component is designed to be used from the ContactOverview screen. When a user clicks on a contact in the overview, it navigates to this detail view.

## Dependencies

- Ant Design components
- React hooks for state management
- Contact data from `useContactsData` hook
- AddEditContactModal for editing functionality 