import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Spinner, Alert, Button, toast } from '@newwork/nw-design-system'
import { Download, Edit, Trash2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { startProcess } from '@/common/utils/start-process'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DocumentSection, type DocumentItem } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { env } from '@/common/env/EnvUtils'

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
}

interface DocumentViewProps extends BusinessAppContextProps {
  opportunityId: string
}

export const DocumentView: React.FC<DocumentViewProps> = ({ opportunityId, ...context }) => {
  const [documents, setDocuments] = useState<CustomerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchDocuments = useCallback(async () => {
    if (!opportunityId || !context.accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = `
        query GetOpportunityDocuments {
          CrmDocument(
            where: {
              opportunityId: { _eq: "${opportunityId}" },
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

      const result = await graphQLClient.request<{ CrmDocument: CustomerDocument[] }>(query)
      setDocuments(result.CrmDocument || [])
    } catch (err) {
      console.error('Error fetching opportunity documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [opportunityId, context.accessToken, graphQLClient])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Listen for process completion to refetch documents after upload/update/delete
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed, refreshing opportunity documents')
      fetchDocuments()
    },
    onFailure: () => {
      console.log('Document process failed')
    }
  })

  // Transform CRM documents to DocumentSection format
  const transformedDocuments = useMemo<DocumentItem[]>(() => {
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
      parentDocument:
        doc.parentDocument && typeof doc.parentDocument === 'object'
          ? doc.parentDocument.id
          : doc.parentDocument || null,
      folder: false, // CRM documents don't support folders like IRM does
      version: doc.version,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy
    }))
  }, [documents])

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        opportunityId
      },
      prefixDataTestId: 'opportunity-document-upload'
    }),
    [opportunityId]
  )

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4">
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('crm.documents.loadError', 'Error loading documents')}
            </h4>
            <p className="gba:text-sm">{error}</p>
          </div>
          <Button onClick={fetchDocuments} variant="outline" size="sm" className="gba:mt-2">
            {getTranslationFromI18nKeyAndLabel('crm.common.retry', 'Retry')}
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:col-span-12" data-testid="opportunity-documents-view">
      <DocumentSection
        entityId={opportunityId}
        documents={transformedDocuments}
        isLoading={loading}
        error={error}
        onRefresh={fetchDocuments}
        apiConfig={{
          baseEndpoint: '/customer-relations',
          entityFieldName: 'opportunity',
          documentFieldName: 'crmDocument'
        }}
        enableGraphQLSearch={true}
        graphQLSearchConfig={{
          entityType: 'opportunity'
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
                const baseUrl = `${filesEndpoint}/files/api/v1/public/downloads/crm/opportunities/${entityId}/documents/`

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
                  opportunityId: entityId,
                  crmDocument: {
                    id: documentId,
                    version: document.version,
                    name: document.name,
                    documentGroupRef: document.documentGroup?.id,
                    documentTypeRef: document.documentType?.id,
                    expirationDate: document.expirationDate,
                    description: document.description,
                    opportunity: entityId // Send UUID in 'opportunity' field (parent reference)
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
        data-testid="opportunity-document-section"
        {...context}
      />
    </div>
  )
}
