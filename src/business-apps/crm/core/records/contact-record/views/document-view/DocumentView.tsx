import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Spinner, Alert, Button } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { startProcess } from '@/common/utils/start-process'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import DocumentSection from '@/common/components/common-relations/record-sections/document-section/DocumentSection'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { DocumentItem } from '@/common/components/common-relations/record-sections/document-section/types'

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
  contactId: string
}

export const DocumentView: React.FC<DocumentViewProps> = ({ contactId, ...context }) => {
  const [documents, setDocuments] = useState<CustomerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchDocuments = useCallback(async () => {
    if (!contactId || !context.accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = `
        query GetContactDocuments {
          CrmDocument(
            where: {
              contactId: { _eq: "${contactId}" },
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
      console.error('Error fetching contact documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [contactId, context.accessToken, graphQLClient])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Listen for process completion to refetch documents after upload/update/delete
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed, refreshing contact documents')
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

  const handleDownload = useCallback(
    (document: DocumentItem) => {
      if (!document.file) {
        console.error('No file available for document:', document)
        return
      }

      // Construct file extension
      let fileExtension = ''
      if (document.name?.includes('.')) {
        fileExtension = document.name.split('.').pop() || ''
      } else {
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
        fileExtension = (document.mimeType && mimeTypeExtensions[document.mimeType]) || 'pdf'
      }

      const fileHasExtension = document.file.includes('.')
      const documentUrl = fileHasExtension
        ? `/files/api/v1/public/downloads/crm/contacts/${contactId}/documents/${document.file}`
        : `/files/api/v1/public/downloads/crm/contacts/${contactId}/documents/${document.file}.${fileExtension}`

      const link = globalThis.document.createElement('a')
      link.href = documentUrl
      link.download = document.name || `document.${fileExtension}`
      globalThis.document.body.appendChild(link)
      link.click()
      link.remove()
    },
    [contactId]
  )

  const handleUpdate = useCallback(
    (document: DocumentItem) => {
      const entityId = contactId
      const documentId = document.id

      startProcess({
        domain: 'customer-relations',
        processName: 'updateCrmDocument',
        payload: {
          documentId: documentId,
          contactId: entityId,
          crmDocument: {
            id: documentId,
            version: document.version,
            name: document.name,
            documentGroupRef: document.documentGroup?.id,
            documentTypeRef: document.documentType?.id,
            expirationDate: document.expirationDate,
            description: document.description,
            contact: entityId // Send UUID in 'contact' field (parent reference)
          }
        },
        builderType: 'NATIVE_SCREEN'
      })
    },
    [contactId]
  )

  const handleDelete = useCallback(
    async (document: DocumentItem) => {
      const entityId = contactId
      const documentId = document.id

      startProcess({
        domain: 'customer-relations',
        processName: 'deleteCrmDocument',
        payload: {
          documentId: documentId,
          contactId: entityId,
          crmDocument: {
            id: documentId,
            version: document.version,
            contact: entityId // Send UUID in 'contact' field (parent reference)
          }
        },
        builderType: 'NATIVE_SCREEN'
      })
    },
    [contactId]
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
    <div className="gba:col-span-12" data-testid="contact-documents-view">
      <DocumentSection
        {...context}
        documents={transformedDocuments}
        isLoading={loading}
        error={error}
        onReloadDocuments={fetchDocuments}
        onDownload={handleDownload}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        documentActionProps={{
          contextsArray: [FlowContextName.customerDocumentCreate],
          externalContextData: {
            contactId: contactId,
            contact: contactId
          },
          prefixDataTestId: 'contact-documents',
          emptyStateBehavior: 'enable'
        }}
        entityType="contact"
        entityId={contactId}
      />
    </div>
  )
}
