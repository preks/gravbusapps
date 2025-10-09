# Document Manager Component

A comprehensive document management component for the NEWWORK platform that provides document viewing, filtering, and management capabilities.

## Features

- **Dual View Modes**: Icon view and list view for different document browsing preferences
- **Advanced Filtering**: Search, document type, document group, file type, and user filters
- **Column Management**: Configurable table columns with visibility controls
- **Document Actions**: Download, view, edit, and delete actions
- **Selection Management**: Multi-select documents for bulk operations
- **Responsive Design**: Works across different screen sizes
- **Data Controller Pattern**: Clean separation of data logic and UI

## Usage

### Basic Usage

```tsx
import React from 'react'
import { DocumentManager, useDocumentDataController } from '@/components/document-manager'

const MyComponent: React.FC = () => {
  const dataController = useDocumentDataController({
    initialDocuments: [
      {
        id: 'doc-1',
        version: 1,
        name: 'Investment Proposal.pdf',
        createdAt: '2024-01-15T10:30:00Z',
        documentType: { id: 'type-1', value: 'Investment Proposal', code: 'INV_PROP' },
        documentGroup: { id: 'group-1', value: 'Financial Documents', code: 'FIN_DOCS' },
        file: 'https://example.com/documents/proposal.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048576,
        createdBy: 'John Smith',
        format: 'FILE'
      }
    ]
  })

  return (
    <DocumentManager
      entityId="investment-123"
      entityType="account"
      context={{
        accessToken: 'your-access-token',
        flowContexts: ['customerAccountEntity']
      }}
      dataController={dataController}
      onDocumentUpdate={() => console.log('Document updated')}
    />
  )
}
```

### With Custom Filters

```tsx
const dataController = useDocumentDataController({
  initialFilters: {
    searchQuery: 'proposal',
    documentType: ['type-1'],
    documentGroup: ['group-1']
  }
})
```

### With Custom Columns

```tsx
const dataController = useDocumentDataController({
  initialPagination: {
    pageSize: 50,
    currentPage: 1
  }
})

// The dataController.columns can be modified to show/hide columns
dataController.onColumnVisibilityChange('expirationDate', true)
```

## Data Controller Pattern

The DocumentManager uses a data controller pattern to separate data logic from UI concerns. The `useDocumentDataController` hook provides:

- **Data Management**: Documents, loading states, and error handling
- **Filtering**: Search and filter logic with real-time updates
- **Sorting**: Column-based sorting with direction control
- **Pagination**: Page-based navigation with configurable page sizes
- **Column Management**: Show/hide table columns
- **Available Filters**: Pre-populated filter options

## Props

### DocumentManagerProps

| Prop               | Type                                                         | Required | Description                                               |
| ------------------ | ------------------------------------------------------------ | -------- | --------------------------------------------------------- |
| `entityId`         | `string`                                                     | Yes      | The ID of the entity this document manager is attached to |
| `entityType`       | `'account' \| 'contact' \| 'lead' \| 'opportunity'`          | Yes      | The type of entity                                        |
| `context`          | `{ accessToken?: string; flowContexts?: FlowContextName[] }` | Yes      | Authentication and flow context                           |
| `dataController`   | `DocumentDataController`                                     | Yes      | The data controller instance                              |
| `onDocumentUpdate` | `() => void`                                                 | No       | Callback when documents are updated                       |
| `className`        | `string`                                                     | No       | Additional CSS classes                                    |

### DocumentDataController

The data controller provides these methods and properties:

- `documents: Document[]` - Current documents to display
- `isLoading: boolean` - Loading state
- `error: string | null` - Error state
- `filters: DocumentFilterState` - Current filter state
- `onFilterChange: (filters: Partial<DocumentFilterState>) => void` - Update filters
- `sort: DocumentSortState` - Current sort state
- `onSortChange: (sort: DocumentSortState) => void` - Update sorting
- `pagination: DocumentPaginationState` - Current pagination state
- `onPaginationChange: (pagination: Partial<DocumentPaginationState>) => void` - Update pagination
- `columns: ColumnConfig[]` - Column configuration
- `onColumnVisibilityChange: (columnId: string, visible: boolean) => void` - Update column visibility
- `availableFilters` - Available filter options
- `onRefresh: () => void` - Refresh data

## Document Structure

```tsx
interface Document {
  id: string
  version: number
  name?: string | null
  createdAt: string
  expirationDate?: string | null
  documentType?: {
    id: string
    value: string
    code?: string
  } | null
  documentGroup?: {
    id: string
    value: string
    code?: string
  } | null
  file?: string | null
  mimeType?: string | null
  fileSize?: number
  createdBy?: string | null
  format?: string | null
  parentDocument?: string | null
}
```

## View Modes

### Icon View

- Grid layout with document cards
- File type icons with color coding
- Compact information display
- Action buttons on each card

### List View

- Table format with sortable columns
- Configurable column visibility
- Bulk selection capabilities
- Inline action buttons

## Filtering

The component supports multiple filter types:

- **Search**: Text-based search across document names, types, groups, and creators
- **Document Type**: Filter by document type (e.g., Investment Proposal, Legal Document)
- **Document Group**: Filter by document group (e.g., Financial Documents, Legal)
- **File Type**: Filter by file format (e.g., PDF, Word, Excel)
- **Uploaded By**: Filter by user who uploaded the document

## Actions

Each document supports these actions:

- **Download**: Download the document file
- **View**: Open the document in a new tab/window
- **Edit**: Start the document editing process
- **Delete**: Remove the document (with confirmation)

## Styling

The component uses Tailwind CSS classes with the `gba:` prefix for consistent styling across the NEWWORK platform.

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- High contrast support

## Testing

All interactive elements include `data-testid` attributes for reliable automated testing.

## Future Enhancements

- Drag and drop functionality for document organization
- Advanced search with saved searches
- Document versioning support
- Bulk operations (download, delete, move)
- Document preview capabilities
- Integration with document workflows
