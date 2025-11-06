import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Spinner, Alert, Button } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { startProcess } from '@/common/utils/start-process'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DocumentSection, DocumentItem } from '@/common/components/common-relations/record-sections/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

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
  folder?: boolean
}

interface DocumentViewProps extends BusinessAppContextProps {
  leadId: string
}

export const DocumentView: React.FC<DocumentViewProps> = ({ leadId, ...context }) => {
  const [documents, setDocuments] = useState<CustomerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchDocuments = useCallback(async () => {
    if (!leadId || !context.accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = `
        query GetLeadDocuments {
          CrmDocument(
            where: {
              leadId: { _eq: "${leadId}" },
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
      console.error('Error fetching lead documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [leadId, context.accessToken, graphQLClient])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Listen for process completion to refetch documents after upload/update/delete
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed, refreshing lead documents')
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
      folder: false, // CRM doesn't support folders yet - database field missing
      version: doc.version,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy
    }))
  }, [documents])

  const handleUpdate = useCallback(
    (document: DocumentItem) => {
      const entityId = leadId
      const documentId = document.id

      startProcess({
        domain: 'customer-relations',
        processName: 'updateCrmDocument',
        payload: {
          documentId: documentId,
          leadId: entityId,
          crmDocument: {
            id: documentId,
            version: document.version,
            name: document.name,
            documentGroupRef: document.documentGroup?.id,
            documentTypeRef: document.documentType?.id,
            expirationDate: document.expirationDate,
            description: document.description,
            lead: entityId // Send UUID in 'lead' field (parent reference)
          }
        },
        builderType: 'NATIVE_SCREEN'
      })
    },
    [leadId]
  )

  const handleDelete = useCallback(
    async (document: DocumentItem) => {
      const entityId = leadId
      const documentId = document.id

      startProcess({
        domain: 'customer-relations',
        processName: 'deleteCrmDocument',
        payload: {
          documentId: documentId,
          leadId: entityId,
          crmDocument: {
            id: documentId,
            version: document.version,
            lead: entityId // Send UUID in 'lead' field (parent reference)
          }
        },
        builderType: 'NATIVE_SCREEN'
      })
    },
    [leadId]
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
    <div className="gba:col-span-12" data-testid="lead-documents-view">
      <DocumentSection
        {...context}
        documents={transformedDocuments}
        isLoading={loading}
        error={error}
        onRefresh={fetchDocuments}
        apiConfig={{
          baseEndpoint: '/customer-relations',
          entityFieldName: 'lead',
          documentFieldName: 'crmDocument'
        }}
        enableGraphQLSearch={true}
        graphQLSearchConfig={{
          entityType: 'lead'
        }}
        createFolderActionProps={{
          contextsArray: [FlowContextName.customerDocumentCreate],
          externalContextData: {
            leadId: leadId,
            folder: true
          },
          prefixDataTestId: 'lead-document-create-folder'
        }}
        uploadActionProps={{
          contextsArray: [FlowContextName.customerDocumentCreate],
          externalContextData: {
            leadId: leadId
          },
          prefixDataTestId: 'lead-document-upload'
        }}
        deleteActionProps={{
          contextsArray: [FlowContextName.customerDocumentCreate],
          externalContextData: {
            leadId: leadId,
            entityType: 'lead'
          },
          prefixDataTestId: 'lead-document-delete'
        }}
        customActions={[
          {
            key: 'edit',
            label: 'Edit',
            onClick: async (_documentId: string, document: any) => {
              handleUpdate(document)
            }
          },
          {
            key: 'delete',
            label: 'Delete',
            confirmMessage: 'Are you sure you want to delete this document?',
            onClick: async (_documentId: string, document: any) => {
              handleDelete(document)
            }
          }
        ]}
        entityId={leadId}
      />
    </div>
  )
}
