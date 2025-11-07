import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Trash2, Edit, Download } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { startProcess } from '@/common/utils/start-process'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { env } from '@/common/env/EnvUtils'
import { toast } from '@newwork/nw-design-system'

// Customer Document type based on CRM schema
interface CustomerDocument {
  id: string
  version?: number
  name: string
  description?: string
  file?: string
  fileInfo?: any
  mimeType?: string
  fileSize?: number
  format?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  expirationDate?: string
  documentType?: {
    id: string
    code?: string
    value?: string
  }
  documentGroup?: {
    id: string
    code?: string
    value?: string
  }
  parentDocument?: string | { id: string }
  // Note: CRM documents don't support folders yet (no folder field in backend, but UI button is visible for future support)
}

interface DocumentViewProps {
  accountId: string
  context: BusinessAppContextProps
}

const DocumentView: React.FC<DocumentViewProps> = ({ accountId, context }) => {
  const [documents, setDocuments] = useState<CustomerDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Function to load documents from CRM Account
  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const query = `
        query GetAccountDocuments {
          CrmDocument(
            where: { 
              accountId: { _eq: "${accountId}" }, 
              isDeleted: { _eq: false } 
            }
            orderBy: [{ createdAt: DESC }]
          ) {
            id
            version
            name
            description
            file
            fileInfo
            mimeType
            fileSize
            createdAt
            createdBy
            updatedAt
            updatedBy
            expirationDate
            documentType {
              id
              code
              value
            }
            documentGroup {
              id
              code
              value
            }
            parentDocument {
              id
            }
            format
          }
        }
      `

      const result = await graphqlClient.request<{
        CrmDocument: CustomerDocument[]
      }>(query)

      const documentsData = result.CrmDocument || []
      setDocuments(documentsData)
    } catch (err) {
      console.error('Error loading account documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [accountId, context.accessToken, graphqlClient])

  // Transform documents to match DocumentItem interface
  const transformedDocuments = useMemo(() => {
    return documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      createdAt: doc.createdAt || new Date().toISOString(),
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
      file: doc.file || doc?.fileInfo?.fileId,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      createdBy: doc.createdBy,
      // parentDocument is now fetched as { id } object from GraphQL
      parentDocument:
        doc.parentDocument && typeof doc.parentDocument === 'object'
          ? doc.parentDocument.id
          : doc.parentDocument || null,
      folder: false, // CRM documents don't support folders
      version: doc.version,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy
    }))
  }, [documents])

  // Load documents on mount and when accountId changes
  useEffect(() => {
    if (accountId && context.accessToken) {
      loadDocuments()
    }
  }, [accountId, context.accessToken, loadDocuments])

  // Process completion handler for refreshing documents after operations
  useProcessCompletion({
    onSuccess: () => {
      loadDocuments()
    }
  })

  // Memoized action props for document operations
  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        accountId,
        entityType: 'account'
      },
      prefixDataTestId: 'account-document-upload'
    }),
    [accountId]
  )

  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        accountId,
        entityType: 'account',
        folder: true
      },
      prefixDataTestId: 'account-document-create-folder'
    }),
    [accountId]
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentDelete],
      externalContextData: {
        accountId
      },
      prefixDataTestId: 'account-document-delete'
    }),
    [accountId]
  )

  return (
    <DocumentSection
      entityId={accountId}
      documents={transformedDocuments}
      isLoading={isLoading}
      error={error}
      onRefresh={loadDocuments}
      apiConfig={{
        baseEndpoint: '/customer-relations',
        entityFieldName: 'account',
        documentFieldName: 'crmDocument'
      }}
      enableGraphQLSearch={true}
      graphQLSearchConfig={{
        entityType: 'account'
      }}
      customActions={[
        {
          key: 'download',
          label: 'Download',
          icon: <Download className="gba:h-4 gba:w-4" />,
          onClick: (_documentId: string, document: any, entityId: string) => {
            // Handle document download
            if (!document.file) {
              toast.warning('No file available to download')
              return
            }

            try {
              const filesEndpoint = env('NEXT_PUBLIC_FILES_ENDPOINT') || ''
              const getFileExtension = (doc: any): string => {
                if (doc.name?.includes('.')) {
                  return doc.name.split('.').pop() || 'pdf'
                }
                const mimeTypeExtensions: Record<string, string> = {
                  'application/pdf': 'pdf',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                  'application/msword': 'doc',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
                  'application/vnd.ms-excel': 'xls',
                  'image/png': 'png',
                  'image/jpeg': 'jpg',
                  'text/plain': 'txt'
                }
                return (doc.mimeType && mimeTypeExtensions[doc.mimeType]) || 'pdf'
              }

              const fileExtension = getFileExtension(document)
              const baseUrl = `${filesEndpoint}/files/api/v1/public/downloads/crm/accounts/${entityId}/documents/`

              let fileUrl: string
              if (document.file.includes('.')) {
                fileUrl = `${baseUrl}${document.file}`
              } else {
                fileUrl = `${baseUrl}${document.file}.${fileExtension}`
              }

              const downloadFilename = document.name || `document.${fileExtension}`

              const link = globalThis.document.createElement('a')
              link.href = fileUrl
              link.download = downloadFilename
              globalThis.document.body.appendChild(link)
              link.click()
              link.remove()
            } catch (error) {
              console.error('Error downloading document:', error)
              toast.error('Failed to download document')
            }
          }
        },
        {
          key: 'update',
          label: 'Update',
          icon: <Edit className="gba:h-4 gba:w-4" />,
          onClick: (documentId: string, document: any, entityId: string) => {
            // Open the document update popup
            startProcess({
              domain: 'customer-relations',
              processName: 'updateCrmDocument',
              payload: {
                documentId: documentId,
                accountId: entityId,
                crmDocument: {
                  id: documentId,
                  version: document.version,
                  name: document.name,
                  documentGroupRef: document.documentGroup?.id,
                  documentTypeRef: document.documentType?.id,
                  expirationDate: document.expirationDate,
                  description: document.description,
                  account: entityId // Send UUID in 'account' field (parent reference)
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
          apiEndpoint: '/customer-relations/deleteCrmDocument',
          confirmMessage: 'Are you sure you want to delete this document? This action cannot be undone.'
        }
      ]}
      uploadActionProps={documentUploadActionProps}
      createFolderActionProps={documentCreateFolderActionProps}
      deleteActionProps={documentDeleteActionProps}
      data-testid="account-document-section"
      {...context}
    />
  )
}

export { DocumentView }
export default DocumentView
