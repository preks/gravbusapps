import React, { useMemo, useState } from 'react'
import {
  Button,
  Input,
  Alert,
  AlertDescription,
  Spinner,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  FileUpload
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useDocumentCatalogs } from '@/common/hooks/useDocumentCatalogs'
import { fileClient } from '@/common/network/files/FileClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type DocumentCreationEntityType = 'account' | 'contact' | 'lead' | 'opportunity'

export interface DocumentCreationPopupValues {
  entityType: DocumentCreationEntityType
  entityId: string
  parentDocument?: string | null
  folder: boolean
  name?: string
}

export interface DocumentCreationPopupProps extends BusinessAppContextProps {
  initialValues?: Partial<DocumentCreationPopupValues>
}

const prefixDataTestId = 'DocumentCreationPopup'

const DocumentCreationPopup: React.FC<DocumentCreationPopupProps> = ({ initialValues = {}, ...props }) => {
  const values = useMemo<DocumentCreationPopupValues>(() => {
    const src = { ...(props as any), ...(initialValues as any) } as any
    const ad = src?.additionalData || {}
    const payload =
      ad?.payload ||
      ad?.psi_taskPayload?.psi_initialParameters?.payload ||
      ad?.psi_taskPayload?.initialParameters?.payload ||
      {}
    const crmFromAd =
      ad?.crmDocument ||
      ad?.psi_taskPayload?.psi_initialParameters?.crmDocument ||
      ad?.psi_taskPayload?.initialParameters?.crmDocument ||
      payload?.crmDocument
    const crm = src?.crmDocument || crmFromAd || {}

    // Extract entity IDs from all possible locations (following IRM pattern)
    const externalContext = ad?.externalContextData || {}
    const nested =
      ad?.psi_taskPayload?.psi_initialParameters ||
      ad?.psi_taskPayload?.initialParameters ||
      ad?.psi_initialParameters ||
      {}

    const accountId =
      externalContext?.accountId ||
      src?.accountId ||
      src?.account ||
      ad?.accountId ||
      ad?.account ||
      nested?.accountId ||
      nested?.account ||
      payload?.accountId ||
      payload?.account ||
      crm?.account ||
      ''
    const contactId =
      externalContext?.contactId ||
      src?.contactId ||
      src?.contact ||
      ad?.contactId ||
      ad?.contact ||
      nested?.contactId ||
      nested?.contact ||
      payload?.contactId ||
      payload?.contact ||
      crm?.contact ||
      ''
    const leadId =
      externalContext?.leadId ||
      src?.leadId ||
      src?.lead ||
      ad?.leadId ||
      ad?.lead ||
      nested?.leadId ||
      nested?.lead ||
      payload?.leadId ||
      payload?.lead ||
      crm?.lead ||
      ''
    const opportunityId =
      externalContext?.opportunityId ||
      src?.opportunityId ||
      src?.opportunity ||
      ad?.opportunityId ||
      ad?.opportunity ||
      nested?.opportunityId ||
      nested?.opportunity ||
      payload?.opportunityId ||
      payload?.opportunity ||
      crm?.opportunity ||
      ''

    // Debugging - log what we found
    console.log('DocumentCreationPopup - Entity Detection:', {
      accountId,
      contactId,
      leadId,
      opportunityId,
      externalContext,
      src_keys: Object.keys(src),
      ad_keys: Object.keys(ad),
      payload_keys: Object.keys(payload)
    })

    let entityType: DocumentCreationEntityType = 'account'
    let entityId = ''
    if (accountId) {
      entityType = 'account'
      entityId = String(accountId)
    } else if (contactId) {
      entityType = 'contact'
      entityId = String(contactId)
    } else if (leadId) {
      entityType = 'lead'
      entityId = String(leadId)
    } else if (opportunityId) {
      entityType = 'opportunity'
      entityId = String(opportunityId)
    }

    // Folder mode only when explicitly requested or format pre-set as FOLDER
    const computedFolder = Boolean(
      // direct flags
      src?.folder === true ||
        src?.createFolder === true ||
        src?.createFolder === 'true' ||
        // additionalData level
        ad?.folder === true ||
        ad?.createFolder === true ||
        ad?.createFolder === 'true' ||
        // common platform shapes
        ad?.psi_taskPayload?.psi_initialParameters?.createFolder === true ||
        ad?.psi_taskPayload?.psi_initialParameters?.createFolder === 'true' ||
        ad?.psi_taskPayload?.initialParameters?.createFolder === true ||
        ad?.psi_taskPayload?.initialParameters?.createFolder === 'true' ||
        // payload nested
        payload?.folder === true ||
        payload?.createFolder === true ||
        payload?.createFolder === 'true' ||
        // sometimes passed as crm.format
        crm?.format === 'FOLDER'
    )
    const parentDocument =
      src?.parentDocument ??
      ad?.parentDocument ??
      ad?.psi_taskPayload?.psi_initialParameters?.parentDocument ??
      ad?.psi_taskPayload?.initialParameters?.parentDocument ??
      payload?.parentDocument ??
      crm?.parentDocument ??
      null
    const name = crm?.name ?? src?.name ?? ''

    return {
      entityType,
      entityId,
      parentDocument,
      folder: computedFolder,
      name
    } as DocumentCreationPopupValues
  }, [initialValues, props])

  const [name, setName] = useState<string>(values.name || '')
  const [submitting, setSubmitting] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [documentGroupRef, setDocumentGroupRef] = useState<string>('')
  const [documentTypeRef, setDocumentTypeRef] = useState<string>('')
  const [parentFolderId, setParentFolderId] = useState<string>(values.parentDocument || '')
  // Catalog dropdowns for file creation - using CRM-specific catalogs
  const { documentGroups, filteredDocumentTypes } = useDocumentCatalogs(props.accessToken || '', documentGroupRef, {
    groupCatalogIdentifier: 'SalesDocumentGroup',
    typeCatalogIdentifier: 'SalesDocumentType'
  })
  const [description, setDescription] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [groupOpen, setGroupOpen] = useState<boolean>(false)
  const [typeOpen, setTypeOpen] = useState<boolean>(false)
  const [parentOpen, setParentOpen] = useState<boolean>(false)
  const [parentFolders, setParentFolders] = useState<{ id: string; name: string }[]>([])
  const [parentLoading, setParentLoading] = useState<boolean>(false)
  const graphqlClient = useGraphQLClient(props.accessToken || '')

  // Rename mode detection (from payload/additionalData)
  const renameMode = useMemo(() => {
    const src = { ...(props as any), ...(initialValues as any) } as any
    const ad = src?.additionalData || {}
    const payload =
      ad?.payload ||
      ad?.psi_taskPayload?.psi_initialParameters?.payload ||
      ad?.psi_taskPayload?.initialParameters?.payload ||
      {}
    const modeFromAd =
      ad?.mode || ad?.psi_taskPayload?.psi_initialParameters?.mode || ad?.psi_taskPayload?.initialParameters?.mode
    return src?.mode === 'rename' || payload?.mode === 'rename' || modeFromAd === 'rename'
  }, [initialValues, props])

  // Load parent folders for the current entity (skip for rename mode)
  React.useEffect(() => {
    if (renameMode) return
    const loadParents = async () => {
      if (!props.accessToken || !values.entityId) return
      setParentLoading(true)
      try {
        const idField = (() => {
          switch (values.entityType) {
            case 'account':
              return 'accountId'
            case 'contact':
              return 'contactId'
            case 'lead':
              return 'leadId'
            default:
              return 'accountId'
          }
        })()
        const query = `
          query GetParentFolders($id: uuid!) {
            CrmDocument(where: { ${idField}: { _eq: $id }, format: { _eq: "FOLDER" }, isDeleted: { _eq: false } }) {
              id
              name
            }
          }
        `
        const result = await graphqlClient.request<{ CrmDocument: { id: string; name: string }[] }>(query, {
          id: values.entityId
        })
        setParentFolders(Array.isArray(result?.CrmDocument) ? result.CrmDocument : [])
      } catch {
        setParentFolders([])
      } finally {
        setParentLoading(false)
      }
    }
    loadParents()
  }, [props.accessToken, values.entityId, values.entityType, renameMode])

  // Ensure parent folder dropdown is preselected when provided by payload
  React.useEffect(() => {
    if (renameMode) return
    if (!parentFolderId && values.parentDocument) {
      setParentFolderId(values.parentDocument)
    }
  }, [renameMode, values.parentDocument, parentFolderId, parentFolders.length])

  // Detect update mode from incoming crmDocument (presence of id)
  const sourcePayload = useMemo(() => ({ ...(props as any), ...(initialValues as any) }) as any, [props, initialValues])
  const existingCrm = useMemo(() => {
    const ad = sourcePayload?.additionalData || {}
    const payload =
      ad?.payload ||
      ad?.psi_taskPayload?.psi_initialParameters?.payload ||
      ad?.psi_taskPayload?.initialParameters?.payload ||
      {}
    return (
      sourcePayload?.crmDocument ||
      ad?.crmDocument ||
      ad?.psi_taskPayload?.psi_initialParameters?.crmDocument ||
      ad?.psi_taskPayload?.initialParameters?.crmDocument ||
      payload?.crmDocument ||
      {}
    )
  }, [sourcePayload])
  const isUpdateMode = !!existingCrm?.id

  const title = useMemo(
    () =>
      renameMode
        ? 'Rename Document'
        : isUpdateMode
          ? 'Update Document'
          : values.folder
            ? 'Create Folder'
            : 'Create Document',
    [renameMode, isUpdateMode, values.folder]
  )
  const actionLabel = useMemo(
    () => (renameMode ? 'Save' : isUpdateMode ? 'Save' : 'Create'),
    [renameMode, isUpdateMode]
  )

  const entityIdKey = useMemo(() => {
    switch (values.entityType) {
      case 'account':
        return 'accountId'
      case 'contact':
        return 'contactId'
      case 'lead':
        return 'leadId'
      case 'opportunity':
        return 'opportunityId'
      default:
        return 'accountId'
    }
  }, [values.entityType])

  // File reading no longer needed; we use File Service upload instead

  const getExtensionFromFile = (f: File): string | null => {
    // First try from filename
    const match = /\.([^.]+)$/.exec(f.name || '')
    if (match && match[1]) return match[1].toLowerCase()
    // Fallback by mime type
    const map: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'application/json': 'json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/vnd.ms-powerpoint': 'ppt',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/zip': 'zip'
    }
    return map[f.type] || null
  }

  const ensureNameHasExtension = (baseName: string, f?: File | null): string => {
    const nameHasExt = /\.[^.]+$/.test(baseName)
    if (nameHasExt) return baseName
    if (f) {
      const ext = getExtensionFromFile(f)
      if (ext) return `${baseName}.${ext}`
    }
    return baseName // leave as-is if we can't determine (backend may still validate)
  }

  const handleSubmit = async () => {
    setError(null)
    const trimmed = (name || '').trim()
    if (!trimmed) {
      setError('Please provide a name.')
      return
    }
    if (!values.folder && !isUpdateMode && !renameMode && (!files || files.length === 0)) {
      setError('Please select at least one file.')
      return
    }
    try {
      setSubmitting(true)
      // Build crmDocument payload
      const entityBindingKey = (() => {
        switch (values.entityType) {
          case 'account':
            return 'account'
          case 'contact':
            return 'contact'
          case 'lead':
            return 'lead'
          case 'opportunity':
            return 'opportunity'
          default:
            return 'account'
        }
      })()

      // Resolve a reliable entity id from multiple possible sources
      const source = { ...(props as any), ...(initialValues as any) } as any
      const urlParams = new URLSearchParams(window.location.search)
      const idFromUrl = (() => {
        switch (values.entityType) {
          case 'account':
            return urlParams.get('accountId')
          case 'contact':
            return urlParams.get('contactId')
          case 'lead':
            return urlParams.get('leadId')
          case 'opportunity':
            return urlParams.get('opportunityId')
          default:
            return null
        }
      })()
      const resolvedId =
        values.entityId ||
        source?.crmDocument?.[entityBindingKey] ||
        source?.[entityBindingKey] ||
        source?.accountId ||
        source?.contactId ||
        source?.leadId ||
        source?.opportunityId ||
        source?.account ||
        source?.contact ||
        source?.lead ||
        source?.opportunity ||
        idFromUrl ||
        ''

      // Build base crmDocument
      const crmDocument: Record<string, any> = {
        [entityBindingKey]: resolvedId
      }

      if (renameMode || isUpdateMode) {
        // Update: keep id/version and allow renaming without requiring file
        crmDocument.id = existingCrm.id
        let effectiveVersion: number | undefined = existingCrm?.version
        if (!effectiveVersion || Number.isNaN(Number(effectiveVersion)) || Number(effectiveVersion) <= 0) {
          // Fallback: fetch latest version from GraphQL by id to avoid outdated-version errors
          try {
            const query = `
              query GetCrmDocumentVersion($id: uuid!) {
                CrmDocument(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
                  id
                  version
                }
              }
            `
            const res = await graphqlClient.request<{ CrmDocument: { id: string; version: number }[] }>(query, {
              id: crmDocument.id
            })
            effectiveVersion = res?.CrmDocument?.[0]?.version ?? 0
          } catch {
            effectiveVersion = 0
          }
        }
        crmDocument.version = Number(effectiveVersion) || 0
        crmDocument.name = trimmed
        if (!renameMode && (parentFolderId || values.parentDocument)) {
          crmDocument.parentDocument = parentFolderId || values.parentDocument
        }
      } else {
        // Create
        crmDocument.version = 0
        crmDocument.name = values.folder ? trimmed : ensureNameHasExtension(trimmed, files?.[0])
        crmDocument.parentDocument = parentFolderId || values.parentDocument || undefined
        crmDocument.format = values.folder ? 'FOLDER' : 'FILE'
      }

      // Optional metadata (skip for rename)
      if (!renameMode) {
        if (documentGroupRef) crmDocument.documentGroupRef = documentGroupRef
        if (documentTypeRef) crmDocument.documentTypeRef = documentTypeRef
        if (description) crmDocument.description = description
      }

      // If uploading files (create or update), upload to File Service
      if (!renameMode && !values.folder && files && files.length > 0) {
        // Validate we have a resolved entity ID before uploading
        if (!resolvedId) {
          throw new Error(`Unable to determine ${values.entityType} ID. Please ensure the entity ID is provided.`)
        }

        // Ensure auth header
        if (props.accessToken) {
          fileClient.setAccessToken(props.accessToken)
        }

        const folderEntity = (() => {
          switch (values.entityType) {
            case 'account':
              return 'accounts'
            case 'contact':
              return 'contacts'
            case 'lead':
              return 'leads'
            case 'opportunity':
              return 'opportunities'
            default:
              return 'accounts'
          }
        })()

        const pathParams = { accessScope: 'public' } as const
        const queryParams = {
          appName: 'crm',
          folderPath: `/${folderEntity}/${resolvedId}/documents`
        } as const

        // Upload all files
        const uploadResponses = await Promise.all(
          files.map(file => fileClient.uploadFile(file, pathParams, queryParams))
        )

        // Handle multiple files - create multiple documents
        if (uploadResponses.length > 1) {
          const crmDocuments = uploadResponses.map((uploadResponse, index) => {
            const doc: Record<string, any> = { ...crmDocument }

            // Extract fileId without extension (backend expects UUID only)
            const cleanFileId = uploadResponse.fileInfo.fileId ? uploadResponse.fileInfo.fileId.split('.')[0] : null

            // Create fileInfo object with clean fileId
            const fileInfoWithCleanId = uploadResponse.fileInfo
              ? {
                  ...uploadResponse.fileInfo,
                  fileId: cleanFileId
                }
              : null

            doc.file = cleanFileId
            doc.fileInfo = fileInfoWithCleanId
            doc.fileSize = files[index].size
            doc.mimeType = files[index].type || undefined
            // Use original file name for each document
            doc.name = uploadResponse.fileInfo.fileMetadata?.originalFileName || files[index].name

            return doc
          })

          dispatchProcessContinueEvent('pse_submit', {
            [entityIdKey]: resolvedId,
            folder: values.folder,
            crmDocuments // Multiple documents
          })
          return
        } else {
          // Single file
          const uploadResponse = uploadResponses[0]
          const cleanFileId = uploadResponse.fileInfo.fileId ? uploadResponse.fileInfo.fileId.split('.')[0] : null
          const fileInfoWithCleanId = uploadResponse.fileInfo
            ? {
                ...uploadResponse.fileInfo,
                fileId: cleanFileId
              }
            : null

          crmDocument.file = cleanFileId
          crmDocument.fileInfo = fileInfoWithCleanId
          crmDocument.fileSize = files[0].size
          crmDocument.mimeType = files[0].type || undefined
        }
      }

      dispatchProcessContinueEvent('pse_submit', {
        [entityIdKey]: resolvedId,
        folder: values.folder,
        name: trimmed,
        parentDocument: crmDocument.parentDocument,
        crmDocument
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to submit')
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {})
  }

  const renderFormContent = () => {
    if (renameMode) {
      return (
        <div className="gba:mb-4">
          <Input
            placeholder="Document name"
            value={name}
            onChange={e => setName(e.target.value)}
            data-testid={formatDataTestId(prefixDataTestId, 'RenameNameInput')}
          />
        </div>
      )
    }

    if (values.folder) {
      return (
        <div className="gba:mb-4">
          <Input
            placeholder="Folder name"
            value={name}
            onChange={e => setName(e.target.value)}
            data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
          />
        </div>
      )
    }

    return (
      <div className="gba:flex gba:flex-col gba:gap-3 gba:mb-4">
        <div className="gba:flex gba:flex-col gba:gap-2">
          <label className="gba:text-sm">Files</label>
          <FileUpload
            layout="list"
            preview="icon"
            maxFiles={10}
            maxSizeMB={50}
            multiple={true}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip"
            onFilesChange={filesList => {
              const filesArray = filesList.map(f => f.file).filter(Boolean) as File[]
              setFiles(filesArray)
              const firstFile = filesArray[0]
              if (firstFile && !name) {
                setName(firstFile.name)
              }
            }}
            data-testid={formatDataTestId(prefixDataTestId, 'FileUpload')}
          />
        </div>
        <div className="gba:flex gba:flex-col gba:gap-2">
          <label className="gba:text-sm">Document Group</label>
          <Select
            value={documentGroupRef || undefined}
            onValueChange={v => {
              setDocumentGroupRef(v as string)
              setDocumentTypeRef('')
            }}
            data-testid={formatDataTestId(prefixDataTestId, 'DocumentGroupSelect')}
            open={groupOpen}
            onOpenChange={setGroupOpen}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select group..." />
            </SelectTrigger>
            <SelectContent className="gba:z-10000" style={{ zIndex: 100000 }}>
              {documentGroups.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="gba:flex gba:flex-col gba:gap-2">
          <label className="gba:text-sm">Document Type</label>
          <Select
            value={documentTypeRef || undefined}
            onValueChange={v => setDocumentTypeRef(v as string)}
            data-testid={formatDataTestId(prefixDataTestId, 'DocumentTypeSelect')}
            open={typeOpen}
            onOpenChange={setTypeOpen}
          >
            <SelectTrigger
              disabled={!documentGroupRef}
              onClick={() => {
                if (!documentGroupRef) return
              }}
            >
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent className="gba:z-10000" style={{ zIndex: 100000 }}>
              {filteredDocumentTypes.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="gba:flex gba:flex-col gba:gap-2">
          <label className="gba:text-sm">Parent Folder (optional)</label>
          <Select
            value={parentFolderId || undefined}
            onValueChange={v => setParentFolderId(v as string)}
            data-testid={formatDataTestId(prefixDataTestId, 'ParentFolderSelect')}
            open={parentOpen}
            onOpenChange={setParentOpen}
          >
            <SelectTrigger>
              <SelectValue placeholder={parentLoading ? 'Loading...' : 'Select parent...'} />
            </SelectTrigger>
            <SelectContent className="gba:z-10000" style={{ zIndex: 100000 }}>
              {parentFolders.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Document name"
          value={name}
          onChange={e => setName(e.target.value)}
          data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
        />
        <Textarea
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          data-testid={formatDataTestId(prefixDataTestId, 'DescriptionInput')}
        />
      </div>
    )
  }

  return (
    <div className="gba:max-w-md gba:mx-auto gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
      {error && (
        <Alert variant="destructive" className="gba:mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="gba:mb-4">
        <h2 className="gba:text-xl gba:font-semibold" data-testid={formatDataTestId(prefixDataTestId, 'Title')}>
          {title}
        </h2>
      </div>

      {/* Conditional form */}
      {renderFormContent()}

      <div className="gba:flex gba:gap-3">
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={submitting}
          data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={submitting || !name.trim()}
          data-testid={formatDataTestId(prefixDataTestId, 'CreateButton')}
        >
          {submitting ? <Spinner size="sm" /> : actionLabel}
        </Button>
      </div>
    </div>
  )
}

export default DocumentCreationPopup
export { DocumentCreationPopup }
