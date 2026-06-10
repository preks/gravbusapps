'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FolderSimpleIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useFileClient } from '@/common/network/files/useFileClient'
import { env } from '@/common/env/EnvUtils'
import { DocumentSection } from '@/components/document-section'
import type { DocumentItem } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { DocumentFolderUpload } from '@/business-apps/hr/core/forms/document-folder-upload'
import { Employee } from '../../hooks/useEmployeeData'
import { employeeDocumentsQuery, documentTypeCatalogQuery } from '../../queries/documentQueries'
import { EmployeeDocumentViewer } from './EmployeeDocumentViewer'
import documentsI18n from './_i18n'

interface DocumentsTabProps {
  employee: Employee
  accessToken: string
  canEditDocuments?: boolean
}

interface EmployeeDocumentRecord {
  id: string
  version?: number | null
  employeeId: string
  name: string
  file?: string | null
  parentEmployeeDocumentId?: string | null
  folder?: boolean | null
  type?: string | null
  mimeType?: string | null
  documentGroup?: string | null
  createdBy?: string | null
  description?: string | null
  createdAt: string
  validTo?: string | null
  employee?: {
    firstName?: string | null
    lastName?: string | null
  }
}

interface CatalogEntryRecord {
  id: string
  value: string
  code?: string | null
  translations?: Array<{ value: string }>
}

interface EmployeeDocumentItem extends DocumentItem {
  employeeId: string
  typeRef: string | null
  fileRef: string | null
}

function toFileInfoPath(fileRef: string | null | undefined, employeeId: string): string | null {
  if (!fileRef) {
    return null
  }

  const filesSegmentIndex = fileRef.indexOf('/files/')
  if (filesSegmentIndex >= 0) {
    return fileRef.slice(filesSegmentIndex + '/files/'.length)
  }

  if (fileRef.startsWith('tenant/')) {
    return fileRef
  }

  return `tenant/employee-profile/documents/${employeeId}/${fileRef}`
}

function getLocalizedCatalogValue(entry?: CatalogEntryRecord): string | null {
  if (!entry) {
    return null
  }

  const translationValue = entry.translations?.[0]?.value
  return translationValue || entry.value || null
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ employee, accessToken, canEditDocuments = false }) => {
  const { t } = useTranslation(documentsI18n)
  const graphQLClient = useGraphqlClient(accessToken)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const fileClient = useFileClient({ accessToken })
  const [documents, setDocuments] = useState<EmployeeDocumentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocumentItem | null>(null)
  const [folderUploadOpen, setFolderUploadOpen] = useState(false)

  const uploadToolbarActions = useMemo(
    () => [
      {
        key: 'upload-folder',
        label: t('documents-upload-folder'),
        icon: <FolderSimpleIcon className="gba:h-4 gba:w-4" />,
        onClick: () => setFolderUploadOpen(true),
        variant: 'outline' as const,
        testId: 'employee-document-upload-folder-button'
      }
    ],
    [t]
  )

  const fetchDocuments = useCallback(async () => {
    if (!employee?.id) {
      setDocuments([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const activeUserLocale = getCurrentActiveUserLocale()
      const response = await graphQLClient.request(employeeDocumentsQuery, {
        employeeId: employee.id,
        activeUserLocale
      })

      const employeeDocuments: EmployeeDocumentRecord[] = response?.EmployeeDocument ?? []
      const documentGroups: CatalogEntryRecord[] = response?.documentGroup ?? []
      const groupMap = new Map<string, CatalogEntryRecord>(documentGroups.map(group => [group.id, group]))

      const typeRefs = Array.from(
        new Set(employeeDocuments.map(document => document.type).filter((type): type is string => Boolean(type)))
      )
      let typeMap = new Map<string, CatalogEntryRecord>()

      if (typeRefs.length > 0) {
        const typeResponse = await graphQLClient.request(documentTypeCatalogQuery, {
          documentTypeRefs: typeRefs,
          activeUserLocale
        })
        const typeEntries: CatalogEntryRecord[] = typeResponse?.CatalogEntry ?? []
        typeMap = new Map(typeEntries.map(typeEntry => [typeEntry.id, typeEntry]))
      }

      const mappedDocuments: EmployeeDocumentItem[] = employeeDocuments
        .map(document => {
          const filePath = toFileInfoPath(document.file, employee.id)
          const localizedTypeValue = document.type ? getLocalizedCatalogValue(typeMap.get(document.type)) : null
          const localizedGroupValue = getLocalizedCatalogValue(groupMap.get(document.documentGroup || ''))
          const createdByName = document.employee
            ? `${document.employee.firstName || ''} ${document.employee.lastName || ''}`.trim()
            : document.createdBy || null

          return {
            id: document.id,
            name: document.name,
            description: document.description || null,
            createdAt: document.createdAt,
            expirationDate: document.validTo || null,
            documentType: document.type
              ? {
                  id: document.type,
                  value: localizedTypeValue || t('documents-unknown')
                }
              : null,
            documentGroup: localizedGroupValue
              ? {
                  id: document.documentGroup || 'Other',
                  value: localizedGroupValue
                }
              : null,
            fileInfo: filePath
              ? {
                  path: filePath,
                  fileId: document.file || undefined,
                  fileMetadata: {
                    mimeType: document.mimeType || undefined,
                    originalFileName: document.name
                  }
                }
              : null,
            mimeType: document.mimeType || null,
            parentDocument: document.parentEmployeeDocumentId || null,
            folder: document.folder === true,
            createdBy: createdByName,
            version: typeof document.version === 'number' ? document.version : 0,
            employeeId: document.employeeId,
            typeRef: document.type || null,
            fileRef: document.file || null
          }
        })
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

      setDocuments(mappedDocuments)
    } catch (fetchError) {
      console.error('[EmployeeDocumentsTab] Failed to fetch documents:', fetchError)
      setError(t('documents-error-load-failed'))
    } finally {
      setIsLoading(false)
    }
  }, [employee?.id, graphQLClient, t])

  useEffect(() => {
    void fetchDocuments()
  }, [fetchDocuments])

  const uploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.documentPersonal],
      externalContextData: { employeeId: employee.id },
      prefixDataTestId: 'employee-document-upload'
    }),
    [employee.id]
  )

  const createFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.documentPersonal],
      externalContextData: { employeeId: employee.id, folder: true },
      prefixDataTestId: 'employee-document-create-folder'
    }),
    [employee.id]
  )

  const customActions = useMemo(
    () =>
      canEditDocuments
        ? [
            {
              key: 'delete-employee-document',
              label: (document: DocumentItem) =>
                document.folder ? t('documents-delete-folder') : t('documents-delete'),
              icon: null,
              confirmMessage: (document: DocumentItem) =>
                t('documents-delete-confirm-message', {
                  documentName: document.name || t('documents-count-one')
                }),
              onClick: async (_documentId: string, document: DocumentItem) => {
                const employeeDocument = document as EmployeeDocumentItem

                setIsLoading(true)

                try {
                  await restClient.post(
                    '/employee/deleteEmployeeDocument',
                    {
                      employeeDocument: {
                        id: employeeDocument.id,
                        version: employeeDocument.version ?? 0,
                        employeeId: employeeDocument.employeeId,
                        type: employeeDocument.typeRef || employeeDocument.documentType?.id || '',
                        name: employeeDocument.name || '',
                        file: employeeDocument.fileRef || '',
                        mimeType: employeeDocument.mimeType || ''
                      }
                    },
                    {
                      headers: { Authorization: `Bearer ${accessToken}` }
                    }
                  )

                  if (!employeeDocument.folder && employeeDocument.fileRef) {
                    await fileClient.deleteFile(
                      { accessScope: 'tenant', fileId: employeeDocument.fileRef },
                      { appName: 'employee-profile', folderPath: `/documents/${employeeDocument.employeeId}` }
                    )
                  }

                  await fetchDocuments()
                } catch (deleteError) {
                  setIsLoading(false)
                  throw deleteError
                }
              }
            }
          ]
        : [],
    [accessToken, canEditDocuments, fetchDocuments, fileClient, restClient, t]
  )

  return (
    <>
      <DocumentSection
        entityId={employee.id}
        documents={documents}
        isLoading={isLoading}
        error={error}
        onRefresh={fetchDocuments}
        defaultViewMode="tree"
        showViewModeToggle={true}
        showActionsColumn={canEditDocuments}
        onFileClick={document => setSelectedDocument(document as EmployeeDocumentItem)}
        apiConfig={{
          baseEndpoint: '/employee',
          entityFieldName: 'employeeId',
          documentFieldName: 'employeeDocument',
          parentDocumentFieldName: 'parentEmployeeDocumentId',
          endpoints: {
            create: '/employee/employeeDocuments',
            update: '/employee/employeeDocuments',
            delete: '/employee/deleteEmployeeDocument'
          }
        }}
        restClient={restClient}
        createFolderActionProps={createFolderActionProps}
        uploadActionProps={uploadActionProps}
        customActions={customActions}
        toolbarActions={uploadToolbarActions}
        accessToken={accessToken}
        data-testid="employee-document-section"
      />
      <EmployeeDocumentViewer
        accessToken={accessToken}
        open={selectedDocument !== null}
        documentName={selectedDocument?.name}
        mimeType={selectedDocument?.mimeType}
        fileRef={selectedDocument?.fileRef}
        employeeId={selectedDocument?.employeeId}
        documentGroup={selectedDocument?.documentGroup?.value}
        documentType={selectedDocument?.documentType?.value}
        createdAt={selectedDocument?.createdAt}
        createdBy={selectedDocument?.createdBy}
        expirationDate={selectedDocument?.expirationDate}
        description={selectedDocument?.description}
        onOpenChange={open => {
          if (!open) {
            setSelectedDocument(null)
          }
        }}
      />
      <DocumentFolderUpload
        open={folderUploadOpen}
        employeeId={employee.id}
        accessToken={accessToken}
        onOpenChange={setFolderUploadOpen}
        onSuccess={fetchDocuments}
      />
    </>
  )
}

export default DocumentsTab
