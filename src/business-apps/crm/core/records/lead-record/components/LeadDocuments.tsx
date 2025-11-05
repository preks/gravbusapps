import React, { useState, useEffect, useMemo } from 'react'
import { Trash2, Edit, Download } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import DocumentSection from '@/common/components/common-relations/record-sections/document-section/DocumentSection'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { startProcess } from '@/common/utils/start-process'

// Use the CRM document type
type Document = {
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
  parentDocument?: string | { id: string } | null
  folder?: boolean
  updatedAt?: string
  updatedBy?: string
}

interface LeadDocumentsProps {
  leadId: string
  context: BusinessAppContextProps
}

export const LeadDocuments: React.FC<LeadDocumentsProps> = ({ leadId, context }) => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(context.accessToken)

  // Function to load documents
  const loadDocuments = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const GET_LEAD_DOCUMENTS = `
        query GetLeadDocuments($leadId: uuid!) {
          CrmDocument(
            where: { leadId: { _eq: $leadId }, isDeleted: { _eq: false } }
          ) {
            id
            version
            name
            createdAt
            expirationDate
            format
            parentDocument { id }
            documentType { id value code }
            documentGroup { id value code }
            file
            mimeType
            fileSize
            createdBy
            folder
            updatedAt
            updatedBy
          }
        }
      `

      const result = await graphQLClient.request<{ CrmDocument: any[] }>(GET_LEAD_DOCUMENTS, { leadId })
      const documentsData = Array.isArray(result?.CrmDocument) ? result.CrmDocument : []
      setDocuments(documentsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

  // Transform documents to match DocumentItem interface
  const transformedDocuments = useMemo(() => {
    return documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      description: null,
      createdAt: doc.createdAt,
      expirationDate: doc.expirationDate,
      documentType: doc.documentType
        ? {
            id: doc.documentType.id,
            value: doc.documentType.value || '',
            code: doc.documentType.code
          }
        : null,
      documentGroup: doc.documentGroup
        ? {
            id: doc.documentGroup.id,
            value: doc.documentGroup.value || '',
            code: doc.documentGroup.code
          }
        : null,
      file: doc.file || (doc as any)?.fileInfo?.fileId,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      createdBy: doc.createdBy,
      parentDocument:
        typeof doc.parentDocument === 'object' ? (doc.parentDocument?.id ?? null) : (doc.parentDocument ?? null),
      folder: doc.folder === true,
      version: doc.version,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy
    }))
  }, [documents])

  // Load documents on mount and when leadId changes
  useEffect(() => {
    if (leadId && context.accessToken) {
      loadDocuments()
    }
  }, [leadId, context.accessToken])

  // Process completion handler for refreshing documents after operations
  useProcessCompletion({
    onSuccess: () => {
      loadDocuments()
    }
  })

  // Memoized action props for document operations
  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        leadId,
        folder: true
      },
      prefixDataTestId: 'lead-document-create-folder'
    }),
    [leadId]
  )

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        leadId
      },
      prefixDataTestId: 'lead-document-upload'
    }),
    [leadId]
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        leadId,
        entityType: 'lead'
      },
      prefixDataTestId: 'lead-document-delete'
    }),
    [leadId]
  )

  return (
    <DocumentSection
      entityId={leadId}
      documents={transformedDocuments}
      isLoading={isLoading}
      error={error}
      onRefresh={loadDocuments}
      apiConfig={{
        baseEndpoint: '/customer-relations',
        entityFieldName: 'lead',
        documentFieldName: 'crmDocument'
      }}
      enableGraphQLSearch={true}
      graphQLSearchConfig={{
        entityType: 'lead'
      }}
      customActions={[
        {
          key: 'download',
          label: 'Download',
          icon: <Download className="gba:h-4 gba:w-4" />,
          onClick: () => {
            // Download handled by DocumentSection
          }
        },
        {
          key: 'edit',
          label: 'Edit',
          icon: <Edit className="gba:h-4 gba:w-4" />,
          onClick: async (documentId: string, document: any, entityId: string) => {
            // Open edit form
            startProcess({
              domain: 'customer-relations',
              processName: 'saveCrmDocument',
              payload: {
                leadId: entityId,
                crmDocument: {
                  id: documentId,
                  version: document.version,
                  name: document.name,
                  documentGroupRef: document.documentGroup?.id,
                  documentTypeRef: document.documentType?.id,
                  parentDocument: document.parentDocument || undefined
                }
              },
              builderType: 'NATIVE_SCREEN'
            })
          }
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="gba:h-4 gba:w-4" />,
          confirmMessage: 'Are you sure you want to delete this document?',
          apiEndpoint: '/customer-relations/saveCrmDocument',
          payload: (documentId: string, document: any, entityId: string) => ({
            changeMode: 'DELETE',
            crmDocument: {
              id: documentId,
              version: document.version,
              lead: entityId
            }
          })
        }
      ]}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      deleteActionProps={documentDeleteActionProps}
      accessToken={context.accessToken}
      data-testid="lead-documents-section"
    />
  )
}

export default LeadDocuments
