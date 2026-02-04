import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useDocumentCatalogs } from '@/common/hooks/useDocumentCatalogs'
import { useDocumentClassification } from '@/common/hooks/useDocumentClassification'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Button,
  FileUpload
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { fileClient } from '@/common/network/files/FileClient'

export interface DocumentPopupProps extends BusinessAppContextProps {
  isOpen?: boolean
  onClose?: () => void

  // Generic configuration (required)
  graphqlEntity: string // e.g., 'CrmDocument' or 'InvestmentDocument'
  payloadKey: string // e.g., 'crmDocument' or 'investmentDocument'
  groupCatalogIdentifier: string // e.g., 'SalesDocumentGroup' or 'InvestmentDocumentGroup'
  typeCatalogIdentifier: string // e.g., 'SalesDocumentType' or 'InvestmentDocumentType'
  appName: string // e.g., 'crm' or 'irm'
  entityRelationships: string[] // e.g., ['account', 'contact', 'lead', 'opportunity'] or [..., 'investment']

  // Entity context (required - must be provided by wrapper)
  entityType?: string // e.g., 'account', 'contact', 'lead', 'opportunity', 'investment'
  entityId: string // The ID of the entity this document belongs to
  entityIdFieldName: string // e.g., 'accountId', 'contactId', 'leadId', 'opportunityId', 'investmentId'
  folderEntityName: string // e.g., 'accounts', 'contacts', 'leads', 'opportunities', 'investments'

  // Entity associations for payload (required - must be provided by wrapper)
  entityAssociations: Record<string, string>

  // AI classification (optional - for CRM)
  enableAIClassification?: boolean
  aiClassificationEndpoint?: string

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

interface DocumentData {
  id?: string
  version?: number
  name?: string
  description?: string
  documentGroupRef?: string
  documentTypeRef?: string
  expirationDate?: string
  parentDocument?: string
  folder?: boolean
  fileInfo?: any
  fileSize?: number
  mimeType?: string
}

interface FormValues {
  documentId?: string
  documentVersion?: number
  name: string
  description?: string
  documentGroupRef?: string
  documentTypeRef?: string
  expirationDate?: string
  parentDocument?: string
  files?: File[]
  folder: boolean
}

const prefixDataTestId = 'document-popup'

const normalizeSuggestionValue = (value: unknown): string => (value ?? '').toString().trim().toLowerCase()

const buildSuggestionCandidates = (raw: unknown): string[] => {
  const base = normalizeSuggestionValue(raw)
  if (!base) return []
  const parts = (raw ?? '').toString().split(':')
  const last = parts[parts.length - 1]
  const set = new Set<string>()
  set.add(base)
  if (last) {
    set.add(normalizeSuggestionValue(last))
  }
  return Array.from(set)
}

const matchesSuggestion = (
  entry: { label?: unknown; value?: unknown; code?: unknown },
  suggestion: string
): boolean => {
  const suggestionCandidates = buildSuggestionCandidates(suggestion)
  if (suggestionCandidates.length === 0) return false

  const labelNorm = normalizeSuggestionValue(entry.label)
  const valueCandidates = buildSuggestionCandidates(entry.value)
  const codeCandidates = buildSuggestionCandidates(entry.code)

  return suggestionCandidates.some(s => {
    if (!s) return false
    if (labelNorm && labelNorm === s) return true
    if (valueCandidates.some(v => v === s)) return true
    if (codeCandidates.some(v => v === s)) return true
    return false
  })
}

/**
 * DocumentPopup
 * Fully generic popup for creating/updating/renaming documents across any domain.
 * - Supports create, update, and rename modes
 * - NO hardcoded entity logic - everything received as input from wrappers
 * - Wrappers (CRM/IRM) extract entity context and pass all required configuration
 * - Optional AI classification support
 */
export const DocumentPopup: React.FC<DocumentPopupProps> = ({
  isOpen = true,
  onClose,
  accessToken,
  additionalData,
  graphqlEntity,
  payloadKey,
  groupCatalogIdentifier,
  typeCatalogIdentifier,
  appName,
  entityRelationships,
  entityId,
  entityIdFieldName,
  folderEntityName,
  entityAssociations,
  enableAIClassification = false,
  aiClassificationEndpoint,
  onSuccess,
  onError,
  'data-testid': dataTestId = prefixDataTestId
}) => {
  // Extract document data and mode from additionalData
  const { documentData, mode, isFolder } = useMemo(() => {
    const ad = additionalData || {}
    const externalContext = ad?.externalContextData || {}
    const payload =
      ad?.payload ||
      ad?.psi_taskPayload?.psi_initialParameters?.payload ||
      ad?.psi_taskPayload?.initialParameters?.payload ||
      {}

    const docFromAd =
      ad?.[payloadKey] ||
      ad?.psi_taskPayload?.psi_initialParameters?.[payloadKey] ||
      ad?.psi_taskPayload?.initialParameters?.[payloadKey] ||
      payload?.[payloadKey]

    const documentId = externalContext?.documentId || payload?.documentId || ad?.documentId || docFromAd?.id

    const modeValue =
      ad?.mode ||
      ad?.psi_taskPayload?.psi_initialParameters?.mode ||
      ad?.psi_taskPayload?.initialParameters?.mode ||
      null

    const folderValue = Boolean(
      ad?.folder === true ||
        ad?.createFolder === true ||
        ad?.createFolder === 'true' ||
        ad?.psi_taskPayload?.psi_initialParameters?.createFolder === true ||
        ad?.psi_taskPayload?.psi_initialParameters?.createFolder === 'true' ||
        ad?.psi_taskPayload?.initialParameters?.createFolder === true ||
        ad?.psi_taskPayload?.initialParameters?.createFolder === 'true' ||
        payload?.folder === true ||
        payload?.createFolder === true ||
        payload?.createFolder === 'true' ||
        docFromAd?.format === 'FOLDER' ||
        docFromAd?.folder === true
    )

    return {
      documentData: documentId ? docFromAd || { id: documentId } : null,
      mode: modeValue,
      isFolder: folderValue
    }
  }, [additionalData, payloadKey])

  const isUpdateMode = !!documentData?.id
  const isRenameMode = mode === 'rename'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedDocument, setLoadedDocument] = useState<DocumentData | null>(null)
  const [existingFileInfo, setExistingFileInfo] = useState<{
    id: string
    name: string
    fileInfo?: string
    fileSize?: number
    mimeType?: string
  } | null>(null)
  const [parentFolders, setParentFolders] = useState<{ id: string; name: string }[]>([])
  const [parentLoading, setParentLoading] = useState(false)
  const [aiApplied, setAiApplied] = useState(false)
  const [applyTypeAfterGroup, setApplyTypeAfterGroup] = useState<string | null>(null)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken || '')

  const form = useForm<FormValues>({
    defaultValues: {
      documentId: documentData?.id || '',
      documentVersion: documentData?.version || 0,
      name: documentData?.name || '',
      description: documentData?.description || '',
      documentGroupRef: documentData?.documentGroupRef || '',
      documentTypeRef: documentData?.documentTypeRef || '',
      expirationDate: documentData?.expirationDate || '',
      parentDocument: documentData?.parentDocument || '',
      files: [],
      folder: isFolder
    }
  })

  const watchedDocumentGroupRef = form.watch('documentGroupRef')
  const watchedFolder = form.watch('folder')
  const watchedFiles = form.watch('files')

  const {
    documentGroups,
    documentTypes,
    filteredDocumentTypes,
    loading: catalogLoading
  } = useDocumentCatalogs(accessToken || '', watchedDocumentGroupRef || '', {
    groupCatalogIdentifier,
    typeCatalogIdentifier
  })

  // Load document data for update mode
  useEffect(() => {
    const loadData = async () => {
      if (!accessToken || !documentData?.id || !isOpen || !isUpdateMode) {
        setLoading(false)
        return
      }

      try {
        setInitialDataLoaded(false) // ✅ Move inside guard
        setLoading(true)
        setError(null)

        const entityFields = entityRelationships.map(entity => `${entity} { id }`).join(' ')

        const query = `
          query GetDocumentById {
            ${graphqlEntity}(where: { id: { _eq: "${documentData.id}" }, isDeleted: { _eq: false } }) {
              id
              version
              name
              description
              documentGroupRef
              documentTypeRef
              expirationDate
              parentDocument { id }
              folder
              file
              fileInfo
              fileSize
              mimeType
              ${entityFields}
            }
          }
        `

        const response = await graphqlClient.request(query)
        const document = response?.[graphqlEntity]?.[0]

        if (!document) {
          throw new Error(getTranslationFromI18nKeyAndLabel('document.error.notFound', 'Document not found'))
        }

        setLoadedDocument(document)

        // Store existing file info if available (only once)
        if (document.file || document.fileInfo) {
          const fileInfo = {
            id: document.file || document.id,
            name: document.name,
            fileInfo: document.fileInfo,
            fileSize: document.fileSize,
            mimeType: document.mimeType
          }
          // Only update if it's actually different to prevent infinite loops
          setExistingFileInfo(prev => {
            if (prev?.id === fileInfo.id) return prev
            return fileInfo
          })
        } else {
          setExistingFileInfo(null)
        }

        // Format expiration date to YYYY-MM-DD for date input
        const formattedExpirationDate = document.expirationDate
          ? new Date(document.expirationDate).toISOString().split('T')[0]
          : ''

        form.setValue('documentId', document.id)
        form.setValue('documentVersion', document.version || 0)
        form.setValue('name', document.name || '')
        form.setValue('description', document.description || '')
        form.setValue('documentGroupRef', document.documentGroupRef || '')
        form.setValue('documentTypeRef', document.documentTypeRef || '')
        form.setValue('expirationDate', formattedExpirationDate)
        form.setValue('parentDocument', document.parentDocument?.id || '')
        form.setValue('folder', document.folder || false)
      } catch (err) {
        console.error('Failed to load document data:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel('document.error.loadFailed', 'Failed to load data')
        )
        onError?.(err)
      } finally {
        setLoading(false)
      }
    }

    loadData() // ✅ Removed unconditional setInitialDataLoaded(false)
  }, [
    accessToken,
    documentData?.id,
    isOpen,
    isUpdateMode,
    graphqlClient,
    graphqlEntity,
    JSON.stringify(entityRelationships)
  ])

  // Mark initial data as loaded
  useEffect(() => {
    if (
      !loading &&
      !catalogLoading.groups &&
      !catalogLoading.types &&
      (loadedDocument || !isUpdateMode) &&
      !initialDataLoaded
    ) {
      setInitialDataLoaded(true)
    }
  }, [loading, catalogLoading.groups, catalogLoading.types, loadedDocument, isUpdateMode, initialDataLoaded])

  // Reset document type when document group changes (but not on initial load)
  useEffect(() => {
    if (!initialDataLoaded || catalogLoading.groups || catalogLoading.types || isUpdateMode) return

    const currentType = form.getValues('documentTypeRef')
    if (currentType && watchedDocumentGroupRef) {
      const isTypeValid = filteredDocumentTypes.some(type => type.id === currentType)
      if (!isTypeValid) {
        form.setValue('documentTypeRef', '')
      }
    }
  }, [watchedDocumentGroupRef, filteredDocumentTypes, initialDataLoaded, catalogLoading, isUpdateMode])

  // Load parent folders
  useEffect(() => {
    if (isRenameMode || !entityId) return

    const loadParentFolders = async () => {
      setParentLoading(true)
      try {
        const query = `
          query GetParentFolders($id: uuid!) {
            ${graphqlEntity}(where: { ${entityIdFieldName}: { _eq: $id }, isDeleted: { _eq: false }, folder: { _eq: true } }) {
              id
              name
            }
          }
        `

        const result = await graphqlClient.request<{ [key: string]: { id: string; name: string }[] }>(query, {
          id: entityId
        })

        setParentFolders(Array.isArray(result?.[graphqlEntity]) ? result[graphqlEntity] : [])
      } catch (err) {
        console.error('Failed to load parent folders:', err)
        setParentFolders([])
      } finally {
        setParentLoading(false)
      }
    }

    loadParentFolders()
  }, [accessToken, entityId, entityIdFieldName, isOpen, graphqlClient, graphqlEntity, isRenameMode])

  // Auto-select default document group (only for create mode)
  useEffect(() => {
    if (isRenameMode || watchedFolder || !initialDataLoaded || isUpdateMode) return
    const currentGroup = form.getValues('documentGroupRef')
    if (!currentGroup && documentGroups.length > 0) {
      form.setValue('documentGroupRef', documentGroups[0].id)
    }
  }, [documentGroups, isRenameMode, watchedFolder, initialDataLoaded, isUpdateMode])

  // Auto-select default document type (only for create mode)
  useEffect(() => {
    if (isRenameMode || watchedFolder || applyTypeAfterGroup || !initialDataLoaded || isUpdateMode) return
    const currentType = form.getValues('documentTypeRef')
    const hasGroup = !!form.getValues('documentGroupRef')
    if (hasGroup && !currentType && filteredDocumentTypes.length > 0) {
      form.setValue('documentTypeRef', filteredDocumentTypes[0].id)
    }
  }, [filteredDocumentTypes, isRenameMode, watchedFolder, applyTypeAfterGroup, initialDataLoaded, isUpdateMode])

  // Reset document type when group changes (only for create mode)
  useEffect(() => {
    if (isRenameMode || watchedFolder || !initialDataLoaded || isUpdateMode) return
    form.setValue('documentTypeRef', '', { shouldDirty: true, shouldValidate: true, shouldTouch: true })
  }, [watchedDocumentGroupRef, isRenameMode, watchedFolder, initialDataLoaded, isUpdateMode])

  const firstWatchedFile = watchedFiles?.[0] as File | undefined
  const classificationEnabled = enableAIClassification && !isRenameMode && !watchedFolder && !!firstWatchedFile

  const {
    suggestion: aiSuggestion,
    loading: aiLoading,
    error: aiError
  } = useDocumentClassification({
    accessToken,
    entity: appName,
    groupCatalogIdentifier,
    typeCatalogIdentifier,
    file: classificationEnabled ? firstWatchedFile : undefined,
    endpoint: aiClassificationEndpoint,
    enabled: classificationEnabled
  })

  useEffect(() => {
    // Reset local application flags whenever we get a new file or classification is disabled
    setAiApplied(false)
    setApplyTypeAfterGroup(null)
  }, [firstWatchedFile, classificationEnabled])

  // Auto-apply AI suggestion for group
  useEffect(() => {
    if (isRenameMode || watchedFolder || !aiSuggestion || aiApplied || !enableAIClassification) return

    const hasGroup = !!form.getValues('documentGroupRef')
    if (!hasGroup && aiSuggestion.group) {
      const match = documentGroups.find(g => matchesSuggestion(g, aiSuggestion.group!))
      if (match?.id) {
        form.setValue('documentGroupRef', match.id)
      }
    }
  }, [aiSuggestion, aiApplied, documentGroups, isRenameMode, watchedFolder, enableAIClassification])

  // Auto-apply AI suggestion for type
  useEffect(() => {
    if (isRenameMode || watchedFolder || !aiSuggestion || !enableAIClassification) return

    const hasType = !!form.getValues('documentTypeRef')
    if (!hasType && aiSuggestion.type) {
      const matchT = filteredDocumentTypes.find(t => matchesSuggestion(t, aiSuggestion.type!))
      if (matchT?.id) {
        form.setValue('documentTypeRef', matchT.id, {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true
        })
        setAiApplied(true)
      }
      setApplyTypeAfterGroup(aiSuggestion.type)
    }
  }, [aiSuggestion, aiApplied, filteredDocumentTypes, isRenameMode, watchedFolder, enableAIClassification])

  // Apply AI suggestion after group change
  useEffect(() => {
    if (isRenameMode || watchedFolder || !applyTypeAfterGroup || !enableAIClassification) return

    const current = form.getValues('documentTypeRef')
    if (current) {
      setApplyTypeAfterGroup(null)
      return
    }

    const t = filteredDocumentTypes.find(x => matchesSuggestion(x, applyTypeAfterGroup))
    if (t?.id) {
      form.setValue('documentTypeRef', t.id, { shouldDirty: true, shouldValidate: true, shouldTouch: true })
      setAiApplied(true)
      setApplyTypeAfterGroup(null)
    }
  }, [filteredDocumentTypes, applyTypeAfterGroup, isRenameMode, watchedFolder, enableAIClassification])

  const handleApplyAiSuggestion = useCallback(() => {
    if (!aiSuggestion) return
    if (aiSuggestion.group) {
      const g = documentGroups.find(x => matchesSuggestion(x, aiSuggestion.group!))
      if (g?.id) {
        form.setValue('documentGroupRef', g.id, {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true
        })
      }
    }
    if (aiSuggestion.type) {
      const t0 = documentTypes.find(x => matchesSuggestion(x, aiSuggestion.type!))
      if (t0?.id) {
        form.setValue('documentTypeRef', t0.id, {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true
        })
        setAiApplied(true)
      }
      setApplyTypeAfterGroup(aiSuggestion.type)
    }
  }, [aiSuggestion, documentGroups, documentTypes])

  const handleFilesChange = useCallback(
    (filesList: any[]) => {
      const filesArray = filesList.map(f => f.file).filter(Boolean) as File[]
      form.setValue('files', filesArray)

      // Auto-fill name with first file name if empty
      if (filesArray[0] && !form.getValues('name')) {
        form.setValue('name', filesArray[0].name)
      }
    },
    [form]
  )

  const shouldUploadFiles = (formData: FormValues): boolean => {
    return !isRenameMode && !formData.folder && !!formData.files && formData.files.length > 0 && !!accessToken
  }

  const uploadFiles = async (formData: FormValues): Promise<any[]> => {
    if (!shouldUploadFiles(formData) || !accessToken) {
      return []
    }

    fileClient.setAccessToken(accessToken)

    const sanitizedId = entityId
      .split('')
      .map(char => (/[\w-]/.test(char) ? char : '_'))
      .join('')
    const folderPath = `/${folderEntityName}/${sanitizedId}/documents`

    const folderPathRegex = /^(\/[\w-]{1,256})+$/
    if (!folderPathRegex.test(folderPath)) {
      throw new Error(`Invalid folder path format: ${folderPath}`)
    }

    const pathParams = { accessScope: 'public' as const }
    const queryParams = { appName, folderPath }

    return await Promise.all(formData.files!.map(file => fileClient.uploadFile(file, pathParams, queryParams)))
  }

  const addFileInfoToPayload = (payload: any, uploadResponse: any, fileIndex: number, formData: FormValues) => {
    if (!uploadResponse?.fileInfo) {
      return
    }

    payload.fileInfo = uploadResponse.fileInfo
    payload.file = uploadResponse.fileInfo.fileId
    payload.fileSize = uploadResponse.fileInfo.fileMetadata?.size || formData.files?.[fileIndex]?.size
    payload.mimeType = uploadResponse.fileInfo.fileMetadata?.mimeType || formData.files?.[fileIndex]?.type
  }

  const addEntityAssociationsToPayload = (payload: any) => {
    Object.entries(entityAssociations).forEach(([key, value]) => {
      if (value) payload[key] = value
    })
  }

  const buildBasePayload = (formData: FormValues, includeId: boolean = false) => {
    const payload: any = {
      version: includeId ? formData.documentVersion || 0 : 0,
      name: formData.name,
      description: formData.description || '',
      documentGroupRef: formData.documentGroupRef || '',
      documentTypeRef: formData.documentTypeRef || '',
      expirationDate: formData.expirationDate || null,
      parentDocument: formData.parentDocument || null
    }

    if (includeId) {
      payload.id = formData.documentId
    } else {
      payload.format = formData.folder ? 'FOLDER' : 'FILE'
    }

    return payload
  }

  const buildUpdatePayload = (formData: FormValues, fileInfoList: any[]) => {
    const payload = buildBasePayload(formData, true)

    addFileInfoToPayload(payload, fileInfoList[0], 0, formData)
    addEntityAssociationsToPayload(payload)

    return {
      [payloadKey]: payload,
      changeMode: 'UPDATE'
    }
  }

  const buildSingleDocumentPayload = (formData: FormValues, fileInfoList: any[]) => {
    const payload = buildBasePayload(formData, false)

    addFileInfoToPayload(payload, fileInfoList[0], 0, formData)
    addEntityAssociationsToPayload(payload)

    // Both CRM and IRM use plural array format for consistency
    return {
      [`${payloadKey}s`]: [payload]
    }
  }

  const buildBulkDocumentsPayload = (formData: FormValues, fileInfoList: any[]) => {
    const documents = fileInfoList.map((uploadResponse, index) => {
      const doc: any = {
        version: 0,
        name: uploadResponse.fileInfo?.fileMetadata?.originalFileName || formData.files?.[index]?.name || formData.name,
        description: formData.description || '',
        documentGroupRef: formData.documentGroupRef || '',
        documentTypeRef: formData.documentTypeRef || '',
        expirationDate: formData.expirationDate || null,
        parentDocument: formData.parentDocument || null,
        format: 'FILE'
      }

      addFileInfoToPayload(doc, uploadResponse, index, formData)
      addEntityAssociationsToPayload(doc)

      return doc
    })

    return {
      [`${payloadKey}s`]: documents
    }
  }

  const buildFolderPayload = (formData: FormValues) => {
    const payload = buildBasePayload(formData, false)
    addEntityAssociationsToPayload(payload)

    return {
      [payloadKey]: payload
    }
  }

  const handleSubmit = async () => {
    const formData = form.getValues()

    if ((isUpdateMode || isRenameMode) && formData.files && formData.files.length > 1) {
      throw new Error('Update mode only supports single file upload')
    }

    const fileInfoList = await uploadFiles(formData)

    if (isUpdateMode || isRenameMode) {
      const payload = buildUpdatePayload(formData, fileInfoList)
      return payload
    }

    if (fileInfoList.length === 1) {
      const payload = buildSingleDocumentPayload(formData, fileInfoList)
      return payload
    }

    if (fileInfoList.length > 1) {
      const payload = buildBulkDocumentsPayload(formData, fileInfoList)
      return payload
    }

    const payload = buildFolderPayload(formData)
    return payload
  }

  const validateForm = useCallback(
    (data: any): string[] | null => {
      const errors: string[] = []

      if (!data.name?.trim()) {
        errors.push('Please provide a name.')
      }

      if (!isRenameMode && !data.folder && !isUpdateMode) {
        if (!data.files || data.files.length === 0) {
          errors.push('Please select at least one file.')
        }
      }

      return errors.length > 0 ? errors : null
    },
    [isRenameMode, isUpdateMode]
  )

  const handleFormSuccess = useCallback(() => {
    onSuccess?.()
    onClose?.()
  }, [onSuccess, onClose])

  if (!isOpen) {
    return null
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(dataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p className="gba:mt-4">{getTranslationFromI18nKeyAndLabel('document.loading', 'Loading document data...')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(dataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        {onClose && (
          <div className="gba:mt-4 gba:flex gba:justify-end">
            <Button variant="outline" onClick={onClose}>
              {getTranslationFromI18nKeyAndLabel('common.close', 'Close')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  const getDialogTitle = () => {
    if (isRenameMode) {
      return getTranslationFromI18nKeyAndLabel('document.rename', 'Rename Document')
    }
    if (isUpdateMode) {
      return getTranslationFromI18nKeyAndLabel('document.update', 'Update Document')
    }
    if (watchedFolder) {
      return getTranslationFromI18nKeyAndLabel('document.createFolder', 'Create Folder')
    }
    return getTranslationFromI18nKeyAndLabel('document.create', 'Create Document')
  }

  const getSubmitButtonText = () => {
    if (isRenameMode || isUpdateMode) {
      return getTranslationFromI18nKeyAndLabel('common.save', 'Save')
    }
    return getTranslationFromI18nKeyAndLabel('common.create', 'Create')
  }

  const getAiSuggestionText = () => {
    if (!aiSuggestion) return ''
    const g = aiSuggestion.group || '—'
    const t = aiSuggestion.type || '—'
    return getTranslationFromI18nKeyAndLabel('document.ai.suggestion', `AI suggestion: Group = ${g}, Type = ${t}`)
  }

  const title = getDialogTitle()
  const submitButtonText = getSubmitButtonText()
  const aiSuggestionText = getAiSuggestionText()

  return (
    <AppActionForm
      processType={isUpdateMode || isRenameMode ? 'update' : 'create'}
      onSubmit={handleSubmit}
      formData={form.getValues()}
      validateForm={validateForm}
      submitButtonText={submitButtonText}
      onSuccess={handleFormSuccess}
      form={form}
      data-testid={formatDataTestId(dataTestId, 'form')}
    >
      <div className="gba:space-y-6" data-testid={formatDataTestId(dataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold" data-testid={formatDataTestId(dataTestId, 'title')}>
            {title}
          </h2>
        </div>

        {/* Rename/Update folder mode - simple name field */}
        {(isRenameMode || (isUpdateMode && loadedDocument?.folder)) && (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {loadedDocument?.folder
                    ? getTranslationFromI18nKeyAndLabel('document.folderName', 'Folder Name')
                    : getTranslationFromI18nKeyAndLabel('document.name', 'Document Name')}
                </FormLabel>
                <FormControl>
                  <Input {...field} data-testid={formatDataTestId(dataTestId, 'name-input')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Create/Update file mode - full form */}
        {!isRenameMode && !(isUpdateMode && loadedDocument?.folder) && (
          <>
            {/* File Upload */}
            {!watchedFolder && (
              <>
                {isUpdateMode && existingFileInfo ? (
                  <div className="gba:mb-4">
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('document.currentFile', 'Current File')}</FormLabel>
                    <div className="gba:mt-2 gba:p-4 gba:bg-muted gba:rounded-lg gba:border gba:border-border">
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <div className="gba:flex-shrink-0 gba:w-10 gba:h-10 gba:bg-background gba:rounded gba:flex gba:items-center gba:justify-center">
                          <svg
                            className="gba:w-6 gba:h-6 gba:text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                            {existingFileInfo.name}
                          </div>
                          {existingFileInfo.fileSize && (
                            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                              {(existingFileInfo.fileSize / 1024 / 1024).toFixed(2)} MB
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="files"
                    render={() => (
                      <FormItem>
                        <FormLabel>{getTranslationFromI18nKeyAndLabel('document.files', 'Files')}</FormLabel>
                        <FormControl>
                          <FileUpload
                            layout="list"
                            preview="icon"
                            maxFiles={10}
                            maxSizeMB={50}
                            multiple={true}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip"
                            onChange={handleFilesChange}
                            data-testid={formatDataTestId(dataTestId, 'file-upload')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* AI Classification Status */}
                {enableAIClassification && (
                  <div
                    className="gba:text-sm gba:text-muted-foreground"
                    data-testid={formatDataTestId(dataTestId, 'ai-status')}
                  >
                    {aiLoading && (
                      <span data-testid={formatDataTestId(dataTestId, 'ai-status-loading')}>
                        {getTranslationFromI18nKeyAndLabel(
                          'document.ai.detecting',
                          'Detecting document group and type…'
                        )}
                      </span>
                    )}
                    {!aiLoading && aiError && (
                      <span data-testid={formatDataTestId(dataTestId, 'ai-status-error')}>{aiError}</span>
                    )}
                    {!aiLoading && !aiError && aiSuggestion && (
                      <div
                        className="gba:flex gba:flex-col gba:gap-1"
                        data-testid={formatDataTestId(dataTestId, 'ai-status-suggestion')}
                      >
                        <span>{aiSuggestionText}</span>
                        <div className="gba:flex gba:gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            data-testid={formatDataTestId(dataTestId, 'ai-apply-button')}
                            onClick={handleApplyAiSuggestion}
                          >
                            {getTranslationFromI18nKeyAndLabel('document.ai.apply', 'Apply suggestion')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Document Group */}
            <FormField
              control={form.control}
              name="documentGroupRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('document.group', 'Document Group')}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid={formatDataTestId(dataTestId, 'group-select')}>
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel('document.group.select', 'Select group')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {documentGroups.map(group => (
                          <SelectItem
                            key={group.id}
                            value={group.id}
                            data-testid={formatDataTestId(dataTestId, `group-option-${group.id}`)}
                          >
                            {group.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Type */}
            <FormField
              control={form.control}
              name="documentTypeRef"
              render={({ field }) => {
                const availableTypes = initialDataLoaded ? filteredDocumentTypes : documentTypes

                return (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('document.type', 'Document Type')}</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!watchedDocumentGroupRef}>
                        <SelectTrigger data-testid={formatDataTestId(dataTestId, 'type-select')}>
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel('document.type.select', 'Select type')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTypes.map(type => (
                            <SelectItem
                              key={type.id}
                              value={type.id}
                              data-testid={formatDataTestId(dataTestId, `type-option-${type.id}`)}
                            >
                              {type.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            {/* Parent Folder */}
            <FormField
              control={form.control}
              name="parentDocument"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('document.parentFolder', 'Parent Folder (optional)')}
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid={formatDataTestId(dataTestId, 'parent-folder-select')}>
                        <SelectValue
                          placeholder={
                            parentLoading
                              ? getTranslationFromI18nKeyAndLabel('document.parentFolder.loading', 'Loading...')
                              : getTranslationFromI18nKeyAndLabel(
                                  'document.parentFolder.select',
                                  'Select parent folder'
                                )
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {parentFolders.map(folder => (
                          <SelectItem
                            key={folder.id}
                            value={folder.id}
                            data-testid={formatDataTestId(dataTestId, `parent-folder-option-${folder.id}`)}
                          >
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Name */}
            <FormField
              control={form.control}
              name="name"
              rules={{
                required: getTranslationFromI18nKeyAndLabel('document.name.required', 'Document name is required')
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchedFolder
                      ? getTranslationFromI18nKeyAndLabel('document.folderName', 'Folder Name')
                      : getTranslationFromI18nKeyAndLabel('document.name', 'Document Name')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} data-testid={formatDataTestId(dataTestId, 'name-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('document.description', 'Description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} data-testid={formatDataTestId(dataTestId, 'description-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expiration Date */}
            <FormField
              control={form.control}
              name="expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('document.expirationDate', 'Expiration Date')}
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid={formatDataTestId(dataTestId, 'expiration-date-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Hidden fields */}
        <input type="hidden" {...form.register('documentId')} />
        <input type="hidden" {...form.register('documentVersion')} />
      </div>
    </AppActionForm>
  )
}

export default DocumentPopup
