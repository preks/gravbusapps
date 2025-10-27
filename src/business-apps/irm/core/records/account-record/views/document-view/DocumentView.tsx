import React, { useState, useEffect, useMemo } from 'react'
import { Trash2, Edit, Download } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { startProcess } from '@/common/utils/start-process'
import { useGetInvestmentDocumentsByAccountId } from '@/common/data/investment/hooks/useInvestmentAccounts'
import type { InvestmentDocument } from '@/common/data/investment/types'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import DocumentSection from '@/common/components/common-relations/record-sections/document-section/DocumentSection'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { env } from '@/common/env/EnvUtils'
import { toast } from '@newwork/nw-design-system'

// Use the actual investment document type
type Document = InvestmentDocument

interface DocumentViewProps {
  accountId: string
  context: BusinessAppContextProps
}

const DocumentView: React.FC<DocumentViewProps> = ({ accountId, context }) => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch documents using the existing hook
  const { fetchInvestmentDocumentsByAccountId } = useGetInvestmentDocumentsByAccountId(context)

  // Function to load documents
  const loadDocuments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const documentsData = await fetchInvestmentDocumentsByAccountId(accountId)
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
      description: doc.description,
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
      file: doc.file,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      createdBy: doc.createdBy,
      parentDocument:
        typeof doc.parentDocument === 'object' ? (doc.parentDocument?.id ?? null) : (doc.parentDocument ?? null),
      folder: doc.folder === true, // Use direct folder property like opportunity documents
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
  }, [accountId, context.accessToken])

  // Process completion handler for refreshing documents after operations
  useProcessCompletion({
    onSuccess: () => {
      loadDocuments()
    }
  })

  // Memoized action props for document operations
  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        accountId,
        folder: true
      },
      prefixDataTestId: 'account-document-create-folder'
    }),
    [accountId]
  )

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        accountId
      },
      prefixDataTestId: 'account-document-upload'
    }),
    [accountId]
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      externalContextData: {
        accountId,
        entityType: 'account'
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
        baseEndpoint: '/investment-relations',
        entityFieldName: 'account',
        documentFieldName: 'investmentDocument'
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
            // Handle document download using the same pattern as OpportunityDocuments
            if (!document.file) {
              toast.warning('No file available to download')
              return
            }

            try {
              const filesEndpoint = env('NEXT_PUBLIC_FILES_ENDPOINT') || ''
              const getFileExtension = (doc: any): string => {
                if (doc.name && doc.name.includes('.')) {
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
              const baseUrl = `${filesEndpoint}/files/api/v1/public/downloads/irm/accounts/${entityId}/documents/`

              let fileUrl: string
              if (document.file.includes('.')) {
                fileUrl = `${baseUrl}${document.file}`
              } else {
                fileUrl = `${baseUrl}${document.file}.${fileExtension}`
              }

              const downloadFilename = document.name || `document.${fileExtension}`

              const link = window.document.createElement('a')
              link.href = fileUrl
              link.download = downloadFilename
              window.document.body.appendChild(link)
              link.click()
              window.document.body.removeChild(link)
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
              domain: 'investment-relations',
              processName: 'updateInvestmentDocument',
              payload: {
                documentId: documentId,
                accountId: entityId,
                investmentDocument: {
                  id: documentId,
                  version: document.version,
                  name: document.name,
                  documentGroupRef: document.documentGroup?.id,
                  documentTypeRef: document.documentType?.id,
                  expirationDate: document.expirationDate,
                  description: document.description,
                  folder: document.folder || false
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
          apiEndpoint: '/investment-relations/deleteInvestmentDocument',
          confirmMessage: 'Are you sure you want to delete this document? This action cannot be undone.'
        }
      ]}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      deleteActionProps={documentDeleteActionProps}
      data-testid="account-document-section"
      {...context}
    />
  )
}

export { DocumentView }
export default DocumentView
