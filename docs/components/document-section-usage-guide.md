# DocumentSection Component - Usage Guide

## Overview

`DocumentSection` is a **pure presentation component** for displaying and managing documents with folder hierarchies, drag-and-drop, search, and document operations (upload, create folder, delete, update).

**Key Principle:** DocumentSection **only displays documents** - it does not fetch them. Your component must fetch documents and pass them to DocumentSection.

---

## Quick Start

```typescript
import { DocumentSection } from '@/components/document-section'
import { useState, useEffect } from 'react'

const MyDocuments = ({ entityId, context }) => {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // 1. Fetch your documents
  useEffect(() => {
    const fetchDocs = async () => {
      const docs = await yourFetchFunction(entityId)
      setDocuments(docs)
      setIsLoading(false)
    }
    fetchDocs()
  }, [entityId])

  // 2. Render DocumentSection
  return (
    <DocumentSection
      entityId={entityId}
      documents={documents}
      isLoading={isLoading}
      accessToken={context.accessToken}
      apiConfig={{
        baseEndpoint: '/your-service',
        entityFieldName: 'yourEntity',
        documentFieldName: 'yourDocument'
      }}
    />
  )
}
```

---

## Component Props

### Required Props

| Prop          | Type             | Description                                        |
| ------------- | ---------------- | -------------------------------------------------- |
| `entityId`    | `string`         | ID of the entity (investment, lead, account, etc.) |
| `documents`   | `DocumentItem[]` | Array of documents to display (you provide this)   |
| `accessToken` | `string`         | Authentication token for API calls                 |

### Data Props

| Prop        | Type             | Default | Description                   |
| ----------- | ---------------- | ------- | ----------------------------- |
| `isLoading` | `boolean`        | `false` | Show loading spinner          |
| `error`     | `string \| null` | `null`  | Error message to display      |
| `onRefresh` | `() => void`     | -       | Callback to refresh documents |

### API Configuration

| Prop        | Type        | Description                                                       |
| ----------- | ----------- | ----------------------------------------------------------------- |
| `apiConfig` | `ApiConfig` | Configuration for document mutation APIs (create, update, delete) |

```typescript
interface ApiConfig {
  baseEndpoint: string // e.g., '/investment-relations', '/crm'
  entityFieldName: string // e.g., 'investment', 'lead', 'account'
  documentFieldName: string // e.g., 'investmentDocument', 'crmDocument'

  // Optional: Override default endpoints
  endpoints?: {
    create?: string // Default: '${baseEndpoint}/createInvestmentDocument'
    update?: string // Default: '${baseEndpoint}/createInvestmentDocument'
    delete?: string // Default: '${baseEndpoint}/deleteInvestmentDocument'
  }
}
```

### Search Props (Optional)

| Prop             | Type                     | Description                       |
| ---------------- | ------------------------ | --------------------------------- |
| `searchTerm`     | `string`                 | Control search term from parent   |
| `onSearchChange` | `(term: string) => void` | Callback when search term changes |

**How search works:**

- If `onSearchChange` is provided: Parent handles search, DocumentSection just displays what you give it
- If `onSearchChange` is NOT provided: DocumentSection does simple local filtering on the documents array

### Action Props

| Prop                      | Type          | Description                                 |
| ------------------------- | ------------- | ------------------------------------------- |
| `uploadActionProps`       | `ActionProps` | Configuration for upload button/flow        |
| `createFolderActionProps` | `ActionProps` | Configuration for create folder button/flow |
| `downloadActionProps`     | `ActionProps` | Configuration for download action           |
| `deleteActionProps`       | `ActionProps` | Configuration for delete action             |

```typescript
interface ActionProps {
  contextsArray: FlowContextName[]
  externalContextData: Record<string, any>
  prefixDataTestId: string
}
```

### Custom Actions

| Prop            | Type             | Description                           |
| --------------- | ---------------- | ------------------------------------- |
| `customActions` | `CustomAction[]` | Custom actions in the three-dots menu |

```typescript
interface CustomAction {
  key: string
  label: string
  icon?: React.ReactNode
  apiEndpoint?: string
  payload?: (docId: string, doc: DocumentItem, entityId: string) => any
  onClick?: (docId: string, doc: DocumentItem, entityId: string) => void | Promise<void>
  confirmMessage?: string
}
```

---

## DocumentItem Interface

Your documents must match this interface:

```typescript
interface DocumentItem {
  id: string
  name?: string | null
  description?: string | null
  createdAt: string
  expirationDate?: string | null

  // Type/Group (catalog entries)
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

  // File information
  fileInfo?: FileInfo | null
  mimeType?: string | null
  fileSize?: number
  createdBy?: string | null

  // Hierarchy (for folders and nesting)
  parentDocument?: string | null
  folder?: boolean

  // Additional metadata
  verified?: boolean
  verificationDate?: string | null
  authenticated?: boolean
  authenticationDate?: string | null
  mandatory?: boolean
  version?: number
}
```

---

## Implementation Guide

### Step 1: Fetch Documents

You need to fetch documents for your entity. Use GraphQL, REST, or any data source:

```typescript
// Example: GraphQL query
const GET_DOCUMENTS = `
  query GetDocuments($entityId: uuid!) {
    YourDocumentTable(
      where: { 
        yourEntity: { id: { _eq: $entityId } }
        isDeleted: { _eq: false }
      }
      orderBy: [{ createdAt: DESC }]
    ) {
      id
      name
      description
      createdAt
      documentType { id value code }
      documentGroup { id value code }
      fileInfo
      mimeType
      fileSize
      parentDocument
      folder
      version
    }
  }
`

const fetchDocuments = async (entityId: string) => {
  const result = await graphqlClient.request(GET_DOCUMENTS, { entityId })
  return result.YourDocumentTable
}
```

### Step 2: Transform to DocumentItem (if needed)

If your API returns a different format, transform it:

```typescript
const transformToDocumentItem = (apiDoc: any): DocumentItem => ({
  id: apiDoc.id,
  name: apiDoc.name,
  description: apiDoc.description,
  createdAt: apiDoc.createdAt,
  documentType: apiDoc.documentType,
  documentGroup: apiDoc.documentGroup,
  fileInfo: apiDoc.fileInfo,
  mimeType: apiDoc.mimeType,
  fileSize: apiDoc.fileSize,
  parentDocument: apiDoc.parentDocument?.id || apiDoc.parentDocument,
  folder: apiDoc.folder === true,
  version: apiDoc.version
})
```

### Step 3: Configure API Endpoints

Provide the API configuration for document mutations:

```typescript
const apiConfig = {
  baseEndpoint: '/investment-relations', // Your service endpoint
  entityFieldName: 'investment', // Entity field name in API
  documentFieldName: 'investmentDocument' // Document field name in API
}
```

### Step 4: Configure Action Props

Set up flow contexts for document operations:

```typescript
const uploadActionProps = {
  contextsArray: [FlowContextName.investmentDocumentCreate],
  externalContextData: {
    investmentId: entityId // Pass entity ID
  },
  prefixDataTestId: 'investment-document-upload'
}

const createFolderActionProps = {
  contextsArray: [FlowContextName.investmentDocumentCreate],
  externalContextData: {
    investmentId: entityId,
    folder: true // Important: indicates folder creation
  },
  prefixDataTestId: 'investment-document-create-folder'
}
```

### Step 5: Render DocumentSection

```typescript
<DocumentSection
  entityId={entityId}
  documents={documents}
  isLoading={isLoading}
  error={error}
  onRefresh={refetchDocuments}
  apiConfig={apiConfig}
  uploadActionProps={uploadActionProps}
  createFolderActionProps={createFolderActionProps}
  accessToken={context.accessToken}
  userInfo={context.userInfo}
  additionalData={context.additionalData}
/>
```

---

## Complete Examples

### Example 1: Investment Documents (IRM)

```typescript
import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentDocuments } from '@/business-apps/irm/common/hooks/useInvestmentDocuments'
import { useGetInvestmentDocumentsByInvestmentId } from '../hooks/useInvestmentDocumentsByInvestmentId'

interface InvestmentDocumentsProps {
  investmentId: string
  context: BusinessAppContextProps
}

const InvestmentDocuments: React.FC<InvestmentDocumentsProps> = ({
  investmentId,
  context
}) => {
  // 1. Fetch documents
  const { fetchInvestmentDocumentsByInvestmentId } = useGetInvestmentDocumentsByInvestmentId(context)
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: investmentId,
    context,
    fetchDocuments: fetchInvestmentDocumentsByInvestmentId
  })

  // 2. Configure action props
  const uploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: { investmentId },
      prefixDataTestId: 'investment-document-upload'
    }),
    [investmentId]
  )

  const createFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: { investmentId, folder: true },
      prefixDataTestId: 'investment-document-create-folder'
    }),
    [investmentId]
  )

  // 3. Render
  return (
    <DocumentSection
      entityId={investmentId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={{
        baseEndpoint: '/investment-relations',
        entityFieldName: 'investment',
        documentFieldName: 'investmentDocument'
      }}
      uploadActionProps={uploadActionProps}
      createFolderActionProps={createFolderActionProps}
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      additionalData={context.additionalData}
    />
  )
}
```

### Example 2: With Custom Search (Parent Controls)

```typescript
const DocumentsWithSearch: React.FC = ({ entityId, context }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [allDocuments, setAllDocuments] = useState([])

  // Fetch all documents
  useEffect(() => {
    fetchDocuments(entityId).then(setAllDocuments)
  }, [entityId])

  // Parent handles filtering
  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return allDocuments

    return allDocuments.filter(doc =>
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [allDocuments, searchTerm])

  return (
    <DocumentSection
      entityId={entityId}
      documents={filteredDocuments}  // Pre-filtered
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      apiConfig={{...}}
      accessToken={context.accessToken}
    />
  )
}
```

### Example 3: With Custom Actions

```typescript
const customActions = [
  {
    key: 'download',
    label: 'Download',
    icon: <Download className="gba:h-4 gba:w-4" />,
    onClick: async (documentId, document, entityId) => {
      // Custom download logic
      const fileUrl = buildFileUrl(document.fileInfo)
      window.open(fileUrl, '_blank')
    }
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: <Trash2 className="gba:h-4 gba:w-4" />,
    apiEndpoint: '/investment-relations/deleteInvestmentDocument',
    confirmMessage: 'Are you sure you want to delete this document?',
    payload: (documentId, document, entityId) => ({
      investmentDocument: {
        id: documentId,
        version: document.version,
        investment: entityId
      }
    })
  }
]

<DocumentSection
  customActions={customActions}
  // ... other props
/>
```

### Example 4: Simple Display Only (No Operations)

```typescript
// Minimal usage - just display documents
<DocumentSection
  entityId={entityId}
  documents={documents}
  isLoading={isLoading}
  accessToken={context.accessToken}
  // No action props = no upload/create folder buttons
  // No apiConfig = no folder creation/drag-drop
/>
```

---

## Features

### Tree View & List View

- **Tree View**: Hierarchical folder structure with expand/collapse
- **List View**: Flat list of documents only (folders hidden)
- Users can toggle between views

### Folder Management

- Create folders at root or nested levels
- Drag and drop documents/folders to reorganize
- Folder selection for context-aware operations

### Document Operations

- **Upload**: Via flow context (opens form/popup)
- **Create Folder**: Direct API call
- **Delete**: Via custom actions or API
- **Update**: Via custom actions
- **Download**: Via custom actions

### Search

- Local filtering by name, description, type, group
- Optional: Parent-controlled search for GraphQL/advanced filtering

### Persistence

- Expanded folder state saved to localStorage per entity
- View mode preference maintained

---

## Common Patterns

### Pattern 1: Use Existing Hook

```typescript
// Many IRM components use this pattern
const { documents, isLoading, error, refetch } = useInvestmentDocuments({
  entityId,
  context,
  fetchDocuments: yourFetchFunction
})

<DocumentSection documents={documents} isLoading={isLoading} {...} />
```

### Pattern 2: Direct Fetch in Component

```typescript
const [documents, setDocuments] = useState([])
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  fetchDocuments(entityId).then(docs => {
    setDocuments(docs)
    setIsLoading(false)
  })
}, [entityId])

<DocumentSection documents={documents} isLoading={isLoading} {...} />
```

### Pattern 3: With Process Completion Listener

```typescript
// Auto-refresh after upload completes
useProcessCompletion({
  onSuccess: () => {
    console.log('Document uploaded, refreshing...')
    refetchDocuments()
  }
})

<DocumentSection onRefresh={refetchDocuments} {...} />
```

---

## API Requirements

### For Display (Read-Only)

You need:

- Query to fetch documents for an entity
- Transform to `DocumentItem` format

### For Folder Operations

Your API must support:

- **Create**: Endpoint that accepts folder flag
- **Update**: Endpoint to move documents (change `parentDocument`)
- Payload format matching your `apiConfig`

Example payload for folder creation:

```json
{
  "investmentDocument": {
    "name": "New Folder",
    "folder": true,
    "investment": "entity-id",
    "parentDocument": "parent-folder-id",
    "recordState": "active"
  }
}
```

Example payload for moving document:

```json
{
  "changeMode": "UPDATE",
  "investmentDocument": {
    "id": "doc-id",
    "version": 1,
    "parentDocument": "new-parent-id",
    "investment": "entity-id"
  }
}
```

---

## Testing

### Test Data Format

```typescript
const mockDocuments: DocumentItem[] = [
  {
    id: '1',
    name: 'Root Folder',
    createdAt: '2024-01-01T00:00:00Z',
    folder: true,
    parentDocument: null,
    version: 1
  },
  {
    id: '2',
    name: 'Document.pdf',
    createdAt: '2024-01-02T00:00:00Z',
    folder: false,
    parentDocument: '1',
    fileInfo: { path: '/files/doc.pdf' },
    mimeType: 'application/pdf',
    fileSize: 1024000,
    version: 1
  }
]
```

### Test Props

```typescript
<DocumentSection
  entityId="test-entity-123"
  documents={mockDocuments}
  isLoading={false}
  accessToken="test-token"
  apiConfig={{
    baseEndpoint: '/test-service',
    entityFieldName: 'testEntity',
    documentFieldName: 'testDocument'
  }}
  data-testid="test-document-section"
/>
```

---

## Migration from Old Pattern

### Before (Old Pattern - Don't Use)

```typescript
<DocumentSection
  enableGraphQLSearch={true}  // ❌ REMOVED
  graphQLSearchConfig={{       // ❌ REMOVED
    entityType: 'investment'
  }}
  documents={documents}
  {...}
/>
```

### After (New Pattern - Use This)

```typescript
// You fetch and pass documents
const documents = await fetchYourDocuments(entityId)

<DocumentSection
  documents={documents}  // ✅ You provide the data
  {...}
/>
```

---

## Troubleshooting

### Documents not showing

- Check that `documents` array is populated
- Verify `DocumentItem` format matches interface
- Check browser console for errors

### Folder operations not working

- Verify `apiConfig` is provided with correct endpoints
- Check network tab for API errors
- Ensure entity ID is passed correctly

### Search not working

- If using `onSearchChange`: verify parent is filtering documents
- If not using `onSearchChange`: local filter should work automatically

### Upload button not appearing

- Verify `uploadActionProps` is provided
- Check that `contextsArray` has correct flow context
- Ensure `externalContextData` includes entity ID

---

## Best Practices

1. ✅ **Fetch documents in parent** - Don't let DocumentSection fetch data
2. ✅ **Use existing hooks** - Reuse `useInvestmentDocuments` or similar
3. ✅ **Memoize action props** - Prevent unnecessary re-renders
4. ✅ **Handle errors gracefully** - Pass error prop to show user-friendly messages
5. ✅ **Provide onRefresh** - Allow users to manually refresh documents
6. ✅ **Use process completion** - Auto-refresh after upload/delete
7. ✅ **Test with mock data** - Use TypeScript to ensure correct format

---

## Related Components

- `DebouncedInput` - Used internally for search
- `AppActionMenu` - Used for custom actions menu
- `AppActionButton` - Can be used alongside for additional actions

---

## Support

For questions or issues:

- Check existing IRM implementations in `src/business-apps/irm/`
- Review `docs/document-section-irm-migration.md` for examples
- Contact the platform team

---

Last Updated: November 7, 2025
