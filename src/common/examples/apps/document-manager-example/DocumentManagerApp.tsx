import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { DocumentManager, useDocumentDataController } from '@/components/document-manager'
import { Document } from '@/components/document-manager/types/documentTypes'

const DocumentManagerApp: React.FC<BusinessAppContextProps> = context => {
  // Example entity data for demonstration
  const exampleEntityId = 'example-123'
  const exampleEntityType = 'account'

  // Mock data for demonstration
  const [mockDocuments] = useState<Document[]>([
    {
      id: 'doc-1',
      version: 1,
      name: 'Investment Proposal Q4 2024.pdf',
      createdAt: '2024-01-15T10:30:00Z',
      documentType: {
        id: 'type-1',
        value: 'Investment Proposal',
        code: 'INV_PROP'
      },
      documentGroup: {
        id: 'group-1',
        value: 'Financial Documents',
        code: 'FIN_DOCS'
      },
      file: 'https://example.com/documents/proposal.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048576,
      createdBy: 'John Smith',
      format: 'FILE'
    },
    {
      id: 'doc-2',
      version: 1,
      name: 'Market Analysis Report.xlsx',
      createdAt: '2024-01-14T14:20:00Z',
      documentType: {
        id: 'type-2',
        value: 'Market Analysis',
        code: 'MKT_ANAL'
      },
      documentGroup: {
        id: 'group-2',
        value: 'Research',
        code: 'RESEARCH'
      },
      file: 'https://example.com/documents/market-analysis.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSize: 1536000,
      createdBy: 'Sarah Johnson',
      format: 'FILE'
    },
    {
      id: 'doc-3',
      version: 1,
      name: 'Legal Agreement.docx',
      createdAt: '2024-01-13T09:15:00Z',
      documentType: {
        id: 'type-3',
        value: 'Legal Document',
        code: 'LEGAL_DOC'
      },
      documentGroup: {
        id: 'group-3',
        value: 'Legal',
        code: 'LEGAL'
      },
      file: 'https://example.com/documents/legal-agreement.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: 512000,
      createdBy: 'Michael Brown',
      format: 'FILE'
    },
    {
      id: 'doc-4',
      version: 1,
      name: 'Company Logo.png',
      createdAt: '2024-01-12T16:45:00Z',
      documentType: {
        id: 'type-4',
        value: 'Image',
        code: 'IMAGE'
      },
      documentGroup: {
        id: 'group-4',
        value: 'Marketing',
        code: 'MARKETING'
      },
      file: 'https://example.com/documents/logo.png',
      mimeType: 'image/png',
      fileSize: 256000,
      createdBy: 'Lisa Davis',
      format: 'FILE'
    },
    {
      id: 'doc-5',
      version: 1,
      name: 'Financial Statement Q3 2024.pdf',
      createdAt: '2024-01-11T11:00:00Z',
      documentType: {
        id: 'type-5',
        value: 'Financial Statement',
        code: 'FIN_STMT'
      },
      documentGroup: {
        id: 'group-1',
        value: 'Financial Documents',
        code: 'FIN_DOCS'
      },
      file: 'https://example.com/documents/financial-statement.pdf',
      mimeType: 'application/pdf',
      fileSize: 3072000,
      createdBy: 'Robert Wilson',
      format: 'FILE'
    }
  ])

  const handleDocumentUpdate = () => {
    console.log('Documents updated - refresh data')
    // In a real app, this would trigger a data refresh
  }

  // Create context object with flowContexts for AppAction
  const documentManagerContext = {
    accessToken: context.accessToken,
    flowContexts: [FlowContextName.investmentAccountEntity] // Example flow context
  }

  // Initialize data controller with mock documents
  const dataController = useDocumentDataController({ initialDocuments: mockDocuments })

  return (
    <div className="gba:p-6" data-testid="document-manager-app">
      <div className="gba:mb-6">
        <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Document Manager Example</h1>
        <p className="gba:text-gray-600 gba:mt-2">
          This is a demonstration of the reusable DocumentManager component with mock data.
        </p>
        <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
          Try searching for "proposal", "financial", or "legal" to see the search functionality.
        </p>
      </div>

      <DocumentManager
        entityId={exampleEntityId}
        entityType={exampleEntityType}
        context={documentManagerContext}
        onDocumentUpdate={handleDocumentUpdate}
        className="gba:bg-white gba:rounded-lg gba:shadow-sm gba:border gba:border-gray-200 gba:p-6"
        dataController={dataController}
      />
    </div>
  )
}

// Named export
export { DocumentManagerApp }

// Default export for business app pattern
export default DocumentManagerApp
