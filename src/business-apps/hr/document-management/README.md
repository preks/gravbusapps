# Document Management Module

This module provides functionality for managing document types and their associated permissions within the HR system.

## Features

- Create, read, update, and delete document types
- Define document type properties (name, description, allowed file types, max size, etc.)
- Set granular permissions for different user roles
- Toggle document type activation status
- Mark documents as GDPR relevant
- Set security levels for document types

## Components

### DocumentTypes

The main component for managing document types. Displays a table of all document types with options to create, edit, and delete them.

#### Props

None

#### Usage

```tsx
import { DocumentTypes } from './document-management'

function App() {
  return (
    <div>
      <h1>Document Management</h1>
      <DocumentTypes />
    </div>
  )
}
```

## Hooks

### useDocumentTypes

A custom hook that manages the state and logic for document types.

#### Return Value

```typescript
{
  documentTypes: DocumentType[];  // Array of document types
  loading: boolean;                // Loading state
  error: string | null;           // Error message if any
  fetchDocumentTypes: () => Promise<DocumentType[]>;  // Fetch all document types
  createDocumentType: (documentType: Omit<DocumentType, 'id'>) => Promise<DocumentType>;  // Create a new document type
  updateDocumentType: (id: string, updates: Partial<DocumentType>) => Promise<void>;  // Update an existing document type
  deleteDocumentType: (id: string) => Promise<void>;  // Delete a document type
}
```

#### Usage

```tsx
import { useDocumentTypes } from './hooks/useDocumentTypes'

function MyComponent() {
  const {
    documentTypes,
    loading,
    error,
    fetchDocumentTypes,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType
  } = useDocumentTypes()

  // Use the hook's methods and state here
}
```

## Types

### DocumentType

```typescript
interface DocumentType {
  id: string
  name: string
  description: string
  module: string
  fileTypes: string[]
  maxSize: number
  rolePermissions: Record<string, RolePermission>
  isActive: boolean
  gdprRelevant: boolean
  securityLevel: 'public' | 'internal' | 'confidential' | 'restricted'
}
```

### RolePermission

```typescript
interface RolePermission {
  upload: boolean
  download: boolean
  view: boolean
  edit: boolean
  delete: boolean
}
```

## Localization

The component uses the `useTranslation` hook from `react-i18next` for internationalization. The following translation keys are used:

```json
{
  "documentManagement": {
    "deleteDocumentType": "Delete Document Type",
    "deleteDocumentTypeConfirmation": "Are you sure you want to delete this document type?",
    "yes": "Yes",
    "no": "No"
  }
}
```

## Dependencies

- React
- Ant Design
- react-i18next
- TypeScript
