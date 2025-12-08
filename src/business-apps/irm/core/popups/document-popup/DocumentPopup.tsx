import React, { useMemo, useState, useEffect } from 'react'
import {
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Button,
  FileUpload
} from '@newwork/nw-design-system'
import { env } from '../../../../../common/env/EnvUtils'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useDocumentCatalogs } from '@/common/hooks/useDocumentCatalogs'
import { fileClient } from '@/common/network/files/FileClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'

export type InvestmentDocumentEntityType = 'account' | 'contact' | 'lead' | 'opportunity' | 'investment'

export interface DocumentPopupValues {
  entityType: InvestmentDocumentEntityType
  entityId: string
  parentDocument?: string | null
  folder: boolean
  name: string
  files?: File[]
  documentGroupRef?: string
  documentTypeRef?: string
  description?: string
}

export interface DocumentPopupProps extends BusinessAppContextProps {
  initialValues?: Partial<DocumentPopupValues>
}

const prefixDataTestId = 'DocumentPopup'

const DocumentPopup: React.FC<DocumentPopupProps> = ({ initialValues = {}, ...props }) => {
  const contextValues = useMemo(() => {
    const src = { ...(props as any), ...(initialValues as any) } as any
    const ad = src?.additionalData || {}
    const payload =
      ad?.payload ||
      ad?.psi_taskPayload?.psi_initialParameters?.payload ||
      ad?.psi_taskPayload?.initialParameters?.payload ||
      {}
    const invFromAd =
      ad?.investmentDocument ||
      ad?.psi_taskPayload?.psi_initialParameters?.investmentDocument ||
      ad?.psi_taskPayload?.initialParameters?.investmentDocument ||
      payload?.investmentDocument
    const inv = src?.investmentDocument || invFromAd || {}

    // Also check URL parameters for entity IDs
    const urlParams = new URLSearchParams(window.location.search)

    const accountId = src?.accountId || src?.account || inv?.account || urlParams.get('accountId') || ''
    const contactId = src?.contactId || src?.contact || inv?.contact || urlParams.get('contactId') || ''
    const leadId = src?.leadId || src?.lead || inv?.lead || urlParams.get('leadId') || ''
    const opportunityId =
      src?.opportunityId || src?.opportunity || inv?.opportunity || urlParams.get('opportunityId') || ''
    const investmentId = src?.investmentId || src?.investment || inv?.investment || urlParams.get('investmentId') || ''

    let entityType: InvestmentDocumentEntityType = 'account'
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
    } else if (investmentId) {
      entityType = 'investment'
      entityId = String(investmentId)
    }

    const computedFolder = Boolean(
      src?.folder === true ||
        src?.createFolder === true ||
        src?.createFolder === 'true' ||
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
        inv?.format === 'FOLDER'
    )
    const parentDocument =
      src?.parentDocument ??
      ad?.parentDocument ??
      ad?.psi_taskPayload?.psi_initialParameters?.parentDocument ??
      ad?.psi_taskPayload?.initialParameters?.parentDocument ??
      payload?.parentDocument ??
      inv?.parentDocument ??
      null
    const name = inv?.name ?? src?.name ?? ''

    const result = { entityType, entityId, parentDocument, folder: computedFolder, name }

    return result
  }, [initialValues, props])

  // Form setup
  const form = useForm<DocumentPopupValues>({
    defaultValues: {
      entityType: contextValues.entityType,
      entityId: contextValues.entityId,
      parentDocument: contextValues.parentDocument || '',
      folder: contextValues.folder,
      name: contextValues.name || '',
      files: [],
      documentGroupRef: '',
      documentTypeRef: '',
      description: ''
    }
  })

  const watchedDocumentGroupRef = form.watch('documentGroupRef')
  const watchedFolder = form.watch('folder')

  // For IRM (investments), use the Investment-specific catalogs
  const { documentGroups, filteredDocumentTypes, documentTypes } = useDocumentCatalogs(
    props.accessToken || '',
    watchedDocumentGroupRef || '',
    { groupCatalogIdentifier: 'InvestmentDocumentGroup', typeCatalogIdentifier: 'InvestmentDocumentType' }
  )

  // Note: renameMode is defined later; we'll set defaults after renameMode is computed in a later effect
  const [parentFolders, setParentFolders] = useState<{ id: string; name: string }[]>([])
  const [parentLoading, setParentLoading] = useState<boolean>(false)
  const graphqlClient = useGraphQLClient(props.accessToken || '')
  const flowbotBaseUrl = env('NEXT_PUBLIC_FLOWBOT_ENDPOINT') || env('NEXT_PUBLIC_BASE_URL')
  const restClient = useRestClient(flowbotBaseUrl)
  const [aiLoading, setAiLoading] = useState<boolean>(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSuggestion, setAiSuggestion] = useState<{ type?: string; group?: string } | null>(null)
  const [aiApplied, setAiApplied] = useState<boolean>(false)
  const [applyTypeAfterGroup, setApplyTypeAfterGroup] = useState<string | null>(null)

  const isUpdateMode = !!(initialValues as any)?.investmentDocument?.id

  const aiSuggestionText = useMemo(() => {
    if (!aiSuggestion) return ''
    const g = aiSuggestion.group || '—'
    const t = aiSuggestion.type || '—'
    const tpl = getTranslationFromI18nKeyAndLabel(
      'irm:document.ai.suggestion',
      'AI suggestion: Group = {group}, Type = {type}',
      { group: g, type: t }
    )
    const filled = tpl.replace('{group}', g).replace('{{group}}', g).replace('{type}', t).replace('{{type}}', t)
    if (
      filled.includes('{group}') ||
      filled.includes('{{group}}') ||
      filled.includes('{type}') ||
      filled.includes('{{type}}')
    ) {
      return `AI suggestion: Group = ${g}, Type = ${t}`
    }
    return filled
  }, [aiSuggestion])

  // ===== Handlers extracted to reduce function nesting in JSX =====
  const handleApplyAiSuggestion = React.useCallback(() => {
    if (!aiSuggestion) return
    if (aiSuggestion.group) {
      const g = documentGroups.find(
        x => (x?.value || '').toString().trim().toLowerCase() === aiSuggestion.group!.toString().trim().toLowerCase()
      )
      if (g?.id) {
        form.setValue('documentGroupRef', g.id, {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true
        })
      }
    }
    if (aiSuggestion.type) {
      const t0 = documentTypes.find(
        x => (x?.value || '').toString().trim().toLowerCase() === aiSuggestion.type!.toString().trim().toLowerCase()
      )
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
  }, [aiSuggestion, documentGroups, filteredDocumentTypes, form])

  const handleDocumentGroupChange = React.useCallback(
    (value: string) => {
      form.setValue('documentGroupRef', value)
      // form.setValue('documentTypeRef', '')
    },
    [form]
  )

  const handleDocumentTypeChange = React.useCallback(
    (value: string) => {
      form.setValue('documentTypeRef', value)
      if (!applyTypeAfterGroup) return
      const desired = (applyTypeAfterGroup ?? '').toString().trim().toLowerCase()
      const t0 = filteredDocumentTypes.find(x => (x?.value || '').toString().trim().toLowerCase() === desired)
      if (t0?.id) {
        form.setValue('documentTypeRef', t0.id, {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true
        })
        setAiApplied(true)
      }
      setApplyTypeAfterGroup('')
    },
    [applyTypeAfterGroup, filteredDocumentTypes, form]
  )

  const handleFilesChange = React.useCallback(
    (filesList: any[]) => {
      const filesArray = filesList.map(f => f.file).filter(Boolean) as File[]
      form.setValue('files', filesArray)

      // Auto-fill name with first file name if empty
      const firstFile = filesArray[0]
      if (firstFile && !form.getValues('name')) {
        form.setValue('name', firstFile.name)
      }
    },
    [form]
  )

  // Populate form with initial values when in update mode
  useEffect(() => {
    if (isUpdateMode && (initialValues as any)?.investmentDocument) {
      const doc = (initialValues as any).investmentDocument

      form.setValue('name', doc.name || '')
      form.setValue('description', doc.description || '')
      form.setValue('documentGroupRef', doc.documentGroupRef || '')
      form.setValue('documentTypeRef', doc.documentTypeRef || '')
      form.setValue('parentDocument', doc.parentDocument || '')
      form.setValue('folder', doc.folder || false)
    }
  }, [isUpdateMode, initialValues, form])

  // Determine if we are in rename mode via additionalData / payload
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

  // Auto-select defaults when catalogs and renameMode state are known
  useEffect(() => {
    if (renameMode || watchedFolder) return
    const currentGroup = form.getValues('documentGroupRef')
    if (!currentGroup && Array.isArray(documentGroups) && documentGroups.length > 0) {
      form.setValue('documentGroupRef', documentGroups[0].id)
    }
  }, [documentGroups, form, renameMode, watchedFolder])

  useEffect(() => {
    if (renameMode || watchedFolder) return
    const currentType = form.getValues('documentTypeRef')
    const hasGroup = !!form.getValues('documentGroupRef')
    if (applyTypeAfterGroup) return
    if (hasGroup && !currentType && Array.isArray(filteredDocumentTypes) && filteredDocumentTypes.length > 0) {
      form.setValue('documentTypeRef', filteredDocumentTypes[0].id)
    }
  }, [filteredDocumentTypes, form, renameMode, watchedFolder, applyTypeAfterGroup])

  useEffect(() => {
    if (renameMode || watchedFolder) return
    form.setValue('documentTypeRef', '', { shouldDirty: true, shouldValidate: true, shouldTouch: true })
  }, [watchedDocumentGroupRef, form, renameMode, watchedFolder])

  const watchedFiles = form.watch('files')
  useEffect(() => {
    let isCancelled = false
    const currentFiles = watchedFiles as File[] | undefined
    const firstFile = currentFiles?.[0] || null
    const controller = new AbortController()
    const run = async () => {
      if (renameMode || watchedFolder) return
      const f = firstFile
      if (!f) return
      setAiLoading(true)
      setAiError(null)
      setAiApplied(false)
      setAiSuggestion(null)
      try {
        const fd = new FormData()
        fd.append('file', f as unknown as Blob)
        fd.append('llm_model', 'gpt-4.1')
        const resp = await restClient.post('/flowbot/document-autoclassify/classify', fd, {
          headers: props.accessToken ? { Authorization: `Bearer ${props.accessToken}` } : undefined,
          signal: controller.signal
        })
        const dataObj = (resp ?? {}) as Record<string, unknown>
        const type = typeof dataObj.type === 'string' ? dataObj.type : undefined
        const group = typeof dataObj.group === 'string' ? dataObj.group : undefined
        if (isCancelled || form.getValues('files')?.[0] !== f) return
        setAiSuggestion({ type, group })
      } catch (err) {
        if (isCancelled) return
        console.error('Flowbot classify failed', err)
        setAiError(getTranslationFromI18nKeyAndLabel('irm.documents.ai.failed', 'Failed to auto-classify'))
      } finally {
        if (!isCancelled) setAiLoading(false)
      }
    }
    run()
    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [watchedFiles, renameMode, watchedFolder, props.accessToken, form])

  useEffect(() => {
    if (renameMode || watchedFolder) return
    if (!aiSuggestion || aiApplied) return
    const hasGroup = !!form.getValues('documentGroupRef')
    if (!hasGroup && aiSuggestion.group) {
      const match = documentGroups.find(
        g => (g?.value || '').toString().trim().toLowerCase() === aiSuggestion.group!.toString().trim().toLowerCase()
      )
      if (match?.id) {
        form.setValue('documentGroupRef', match.id)
      }
    }
  }, [aiSuggestion, aiApplied, documentGroups, form, renameMode, watchedFolder])

  useEffect(() => {
    if (renameMode || watchedFolder) return
    if (!aiSuggestion) return
    const hasType = !!form.getValues('documentTypeRef')
    if (!hasType && aiSuggestion.type) {
      const matchT = filteredDocumentTypes.find(
        t => (t?.value || '').toString().trim().toLowerCase() === aiSuggestion.type!.toString().trim().toLowerCase()
      )
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
  }, [aiSuggestion, aiApplied, filteredDocumentTypes, form, renameMode, watchedFolder])

  useEffect(() => {
    if (renameMode || watchedFolder) return
    if (!applyTypeAfterGroup) return
    const current = form.getValues('documentTypeRef')
    if (current) {
      setApplyTypeAfterGroup(null)
      return
    }
    const t = filteredDocumentTypes.find(
      x => (x?.value || '').toString().trim().toLowerCase() === applyTypeAfterGroup.toString().trim().toLowerCase()
    )
    if (t?.id) {
      form.setValue('documentTypeRef', t.id, { shouldDirty: true, shouldValidate: true, shouldTouch: true })
      setAiApplied(true)
      setApplyTypeAfterGroup(null)
    }
  }, [filteredDocumentTypes, applyTypeAfterGroup, form, renameMode, watchedFolder])

  useEffect(() => {
    if (renameMode) return // no need to load folders for simple rename
    const loadParents = async () => {
      if (!props.accessToken || !contextValues.entityId) return
      setParentLoading(true)
      try {
        const idField = (() => {
          switch (contextValues.entityType) {
            case 'account':
              return 'accountId'
            case 'contact':
              return 'contactId'
            case 'lead':
              return 'leadId'
            case 'opportunity':
              return 'opportunityId'
            case 'investment':
              return 'investmentId'
            default:
              return 'account'
          }
        })()
        const query = `
          query GetParentFolders($id: uuid!) {
            InvestmentDocument(where: { ${idField}: { _eq: $id }, isDeleted: { _eq: false }, folder: { _eq: true } }) {
              id
              name
            }
          }
        `
        const cleanId = String(contextValues.entityId)
          .trim()
          .replace(/[.,;:]+$/, '')
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRe.test(cleanId)) {
          setParentFolders([])
          setParentLoading(false)
          return
        }
        const result = await graphqlClient.request<{ InvestmentDocument: { id: string; name: string }[] }>(query, {
          id: cleanId
        })
        setParentFolders(Array.isArray(result?.InvestmentDocument) ? result.InvestmentDocument : [])
      } catch {
        setParentFolders([])
      } finally {
        setParentLoading(false)
      }
    }
    loadParents()
  }, [props.accessToken, contextValues.entityId, contextValues.entityType, graphqlClient, renameMode])

  const isUpdatingFolder = isUpdateMode && !!(initialValues as any)?.investmentDocument?.folder
  const title = useMemo(() => {
    if (renameMode) return 'Rename Document'
    if (isUpdatingFolder) return 'Rename Folder'
    return isUpdateMode ? 'Update Document' : contextValues.folder ? 'Create Folder' : 'Create Document'
  }, [isUpdateMode, isUpdatingFolder, contextValues.folder, renameMode])
  const actionLabel = useMemo(
    () => (renameMode ? 'Save' : isUpdateMode ? 'Save' : 'Create'),
    [isUpdateMode, renameMode]
  )

  const entityIdKey = useMemo(() => {
    switch (contextValues.entityType) {
      case 'account':
        return 'accountId'
      case 'contact':
        return 'contactId'
      case 'lead':
        return 'leadId'
      case 'opportunity':
        return 'opportunityId'
      case 'investment':
        return 'investmentId'
      default:
        return 'accountId'
    }
  }, [contextValues.entityType])

  const getExtensionFromFile = (f: File): string | null => {
    const match = /\.([^.]+)$/.exec(f.name || '')
    if (match && match[1]) return match[1].toLowerCase()
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
    return baseName
  }

  // File upload handler for pre-submit
  const handleFileUpload = async (formData: DocumentPopupValues) => {
    if (!renameMode && !formData.folder && formData.files && formData.files.length > 0 && props.accessToken) {
      fileClient.setAccessToken(props.accessToken)

      const entityBindingKey = (() => {
        switch (contextValues.entityType) {
          case 'account':
            return 'account'
          case 'contact':
            return 'contact'
          case 'lead':
            return 'lead'
          case 'opportunity':
            return 'opportunity'
          case 'investment':
            return 'investment'
          default:
            return 'account'
        }
      })()

      const source = { ...(props as any), ...(initialValues as any) } as any
      const urlParams = new URLSearchParams(window.location.search)
      const idFromUrl = (() => {
        switch (contextValues.entityType) {
          case 'account':
            return urlParams.get('accountId')
          case 'contact':
            return urlParams.get('contactId')
          case 'lead':
            return urlParams.get('leadId')
          case 'opportunity':
            return urlParams.get('opportunityId')
          case 'investment':
            return urlParams.get('investmentId')
          default:
            return null
        }
      })()

      const resolvedId =
        contextValues.entityId ||
        source?.investmentDocument?.[entityBindingKey] ||
        source?.[entityBindingKey] ||
        source?.accountId ||
        source?.contactId ||
        source?.leadId ||
        source?.opportunityId ||
        source?.investmentId ||
        source?.account ||
        source?.contact ||
        source?.lead ||
        source?.opportunity ||
        source?.investment ||
        idFromUrl ||
        ''

      const folderEntity = (() => {
        switch (contextValues.entityType) {
          case 'account':
            return 'accounts'
          case 'contact':
            return 'contacts'
          case 'lead':
            return 'leads'
          case 'opportunity':
            return 'opportunities'
          case 'investment':
            return 'investments'
          default:
            return 'accounts'
        }
      })()

      // Ensure resolvedId exists and sanitize it
      if (!resolvedId || resolvedId.trim() === '') {
        throw new Error('Entity ID is required for file upload')
      }

      const sanitizedId = resolvedId.replace(/[^\w-]/g, '_')
      const folderPath = `/${folderEntity}/${sanitizedId}/documents`

      // Validate the folder path matches the expected regex
      const folderPathRegex = /^(\/[\w_-]{1,256})+$/
      if (!folderPathRegex.test(folderPath)) {
        console.error('ERROR: folderPath does not match regex:', folderPath)
        throw new Error(`Invalid folder path format: ${folderPath}`)
      }

      const pathParams = { accessScope: 'public' } as const
      const queryParams = { appName: 'irm', folderPath } as const

      // Upload all files
      const uploadResponses = await Promise.all(
        formData.files.map(file => fileClient.uploadFile(file, pathParams, queryParams))
      )

      return uploadResponses
    }
    return null
  }

  // Pre-submit handler to upload the file and attach fileInfo to form data
  const handlePreSubmit = async (formData: DocumentPopupValues) => {
    const uploadResponse = await handleFileUpload(formData)
    if (uploadResponse) {
      // Attach full fileInfo so submit can pass it to the process payload
      return { ...(formData as any), _fileUploadResponse: uploadResponse } as any
    }
    return formData
  }

  // Submit handler for AppActionForm
  const handleSubmit = async (formData: DocumentPopupValues) => {
    const entityBindingKey = (() => {
      switch (contextValues.entityType) {
        case 'account':
          return 'account'
        case 'contact':
          return 'contact'
        case 'lead':
          return 'lead'
        case 'opportunity':
          return 'opportunity'
        case 'investment':
          return 'investment'
        default:
          return 'account'
      }
    })()

    const source = { ...(props as any), ...(initialValues as any) } as any
    const urlParams = new URLSearchParams(window.location.search)
    const idFromUrl = (() => {
      switch (contextValues.entityType) {
        case 'account':
          return urlParams.get('accountId')
        case 'contact':
          return urlParams.get('contactId')
        case 'lead':
          return urlParams.get('leadId')
        case 'opportunity':
          return urlParams.get('opportunityId')
        case 'investment':
          return urlParams.get('investmentId')
        default:
          return null
      }
    })()
    const resolvedId =
      contextValues.entityId ||
      source?.[entityBindingKey] ||
      source?.investmentId ||
      source?.accountId ||
      source?.contactId ||
      source?.leadId ||
      source?.opportunityId ||
      source?.account ||
      source?.contact ||
      source?.lead ||
      source?.opportunity ||
      source?.investment ||
      idFromUrl ||
      ''

    const investmentDocument: Record<string, any> = { [entityBindingKey]: resolvedId }

    if (renameMode || isUpdateMode) {
      const existing = (initialValues as any)?.investmentDocument || {}

      investmentDocument.id = existing.id
      investmentDocument.version = existing.version ?? 0
      investmentDocument.name = formData.name.trim()
      if (formData.parentDocument) {
        investmentDocument.parentDocument = formData.parentDocument
      }
    } else {
      investmentDocument.version = 0
      investmentDocument.name = formData.folder
        ? formData.name.trim()
        : ensureNameHasExtension(formData.name.trim(), formData.files?.[0])
      investmentDocument.parentDocument = formData.parentDocument || undefined
      investmentDocument.format = formData.folder ? 'FOLDER' : 'FILE'
    }

    if (!renameMode) {
      if (formData.documentGroupRef) investmentDocument.documentGroupRef = formData.documentGroupRef
      if (formData.documentTypeRef) investmentDocument.documentTypeRef = formData.documentTypeRef
      if (formData.description) investmentDocument.description = formData.description
    }

    // Handle multiple uploaded files
    const uploadResponses = (formData as any)._fileUploadResponse
    if (uploadResponses && Array.isArray(uploadResponses) && uploadResponses.length > 0) {
      // For multiple files, create multiple documents
      if (uploadResponses.length > 1) {
        const investmentDocuments = uploadResponses.map((uploadResponse, index) => {
          const doc: Record<string, any> = { ...investmentDocument }

          if (uploadResponse?.fileInfo) {
            doc.fileInfo = uploadResponse.fileInfo
            doc.file = uploadResponse.fileInfo.fileId
            doc.fileSize = uploadResponse.fileInfo.fileMetadata?.size || formData.files?.[index]?.size
            doc.mimeType = uploadResponse.fileInfo.fileMetadata?.mimeType || formData.files?.[index]?.type || undefined
            // Use original file name for each document
            doc.name =
              uploadResponse.fileInfo.fileMetadata?.originalFileName ||
              formData.files?.[index]?.name ||
              formData.name?.trim()
          }

          return doc
        })

        return {
          [entityIdKey]: resolvedId,
          folder: formData.folder,
          investmentDocuments // Multiple documents
        }
      } else {
        // Single file
        const uploadResponse = uploadResponses[0]
        if (uploadResponse?.fileInfo) {
          investmentDocument.fileInfo = uploadResponse.fileInfo
          investmentDocument.file = uploadResponse.fileInfo.fileId
          investmentDocument.fileSize = uploadResponse.fileInfo.fileMetadata?.size || formData.files?.[0]?.size
          investmentDocument.mimeType =
            uploadResponse.fileInfo.fileMetadata?.mimeType || formData.files?.[0]?.type || undefined
          if (!investmentDocument.name) {
            investmentDocument.name = uploadResponse.fileInfo.fileMetadata?.originalFileName || formData.name?.trim()
          }
        }
      }
    }

    const finalPayload = {
      [entityIdKey]: resolvedId,
      folder: formData.folder,
      name: formData.name.trim(),
      parentDocument: investmentDocument.parentDocument,
      investmentDocument
    }

    return finalPayload
  }

  // Validation function
  const validateForm = (formData: DocumentPopupValues): string[] | null => {
    const errors: string[] = []

    if (!formData.name?.trim()) {
      errors.push('Please provide a name.')
    }

    // For create mode, require files only if not a folder and not rename mode
    if (!renameMode && !formData.folder && !isUpdateMode) {
      if (!formData.files || formData.files.length === 0) {
        errors.push('Please select at least one file.')
      }
    }

    // For update mode, files are optional - user can update just metadata

    return errors.length > 0 ? errors : null
  }

  // ---------- Render helpers to avoid nested ternaries ----------
  const renderRenameOrUpdate = () => (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{isUpdatingFolder ? 'Folder Name' : 'Document Name'}</FormLabel>
            <FormControl>
              <Input
                placeholder={isUpdatingFolder ? 'Folder name' : 'Document name'}
                {...field}
                data-testid={formatDataTestId(prefixDataTestId, 'RenameNameInput')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )

  const renderFolderBranch = () => (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Folder Name</FormLabel>
          <FormControl>
            <Input placeholder="Folder name" {...field} data-testid={formatDataTestId(prefixDataTestId, 'NameInput')} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const renderFileBranch = () => (
    <div className="gba:space-y-4">
      <FormField
        control={form.control}
        name="files"
        render={() => (
          <FormItem>
            <FormLabel>Files</FormLabel>
            <FormControl>
              <FileUpload
                layout="list"
                preview="icon"
                maxFiles={10}
                maxSizeMB={50}
                multiple={true}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip"
                onFilesChange={handleFilesChange}
                data-testid={formatDataTestId(prefixDataTestId, 'FileUpload')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="gba:text-sm gba:text-muted-foreground" data-testid="DocumentPopup-ai-status">
        {aiLoading && (
          <span data-testid="DocumentPopup-ai-status-loading">
            {getTranslationFromI18nKeyAndLabel('irm:document.ai.detecting', 'Detecting document group and type…')}
          </span>
        )}
        {!aiLoading && aiError && <span data-testid="DocumentPopup-ai-status-error">{aiError}</span>}
        {!aiLoading && !aiError && aiSuggestion && (
          <div className="gba:flex gba:flex-col gba:gap-1" data-testid="DocumentPopup-ai-status-suggestion">
            <span>{aiSuggestionText}</span>
            <div className="gba:flex gba:gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="DocumentPopup-ai-status-apply-button"
                onClick={handleApplyAiSuggestion}
              >
                {getTranslationFromI18nKeyAndLabel('irm:document.ai.applySuggestion', 'Apply suggestion')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <FormField
        control={form.control}
        name="documentGroupRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Document Group</FormLabel>
            <FormControl>
              <Select
                value={field.value || undefined}
                onValueChange={handleDocumentGroupChange}
                data-testid={formatDataTestId(prefixDataTestId, 'DocumentGroupSelect')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group..." />
                </SelectTrigger>
                <SelectContent position="popper" className="gba:z-[9999]" style={{ zIndex: 9999 }}>
                  {documentGroups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="documentTypeRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Document Type</FormLabel>
            <FormControl>
              <Select
                key={watchedDocumentGroupRef || 'no-group'}
                value={field.value || undefined}
                onValueChange={handleDocumentTypeChange}
                data-testid={formatDataTestId(prefixDataTestId, 'DocumentTypeSelect')}
              >
                <SelectTrigger disabled={!watchedDocumentGroupRef}>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent position="popper" className="gba:z-[9999]" style={{ zIndex: 9999 }}>
                  {filteredDocumentTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="parentDocument"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Parent Folder (optional)</FormLabel>
            <FormControl>
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                data-testid={formatDataTestId(prefixDataTestId, 'ParentFolderSelect')}
              >
                <SelectTrigger>
                  <SelectValue placeholder={parentLoading ? 'Loading...' : 'Select parent...'} />
                </SelectTrigger>
                <SelectContent position="popper" className="gba:z-[9999]" style={{ zIndex: 9999 }}>
                  {parentFolders.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Document Name</FormLabel>
            <FormControl>
              <Input
                placeholder="Document name"
                {...field}
                data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Description (optional)"
                {...field}
                data-testid={formatDataTestId(prefixDataTestId, 'DescriptionInput')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )

  const renderContent = () => {
    if (renameMode || isUpdatingFolder) return renderRenameOrUpdate()
    if (watchedFolder) return renderFolderBranch()
    return renderFileBranch()
  }

  return (
    <AppActionForm
      processType={renameMode ? 'update' : isUpdateMode ? 'update' : 'create'}
      onSubmit={handleSubmit}
      handlePreSubmit={handlePreSubmit}
      formData={form.getValues()}
      validateForm={validateForm}
      submitButtonText={actionLabel}
      form={form}
      businessAppContext={props}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold" data-testid={formatDataTestId(prefixDataTestId, 'Title')}>
            {title}
          </h2>
        </div>

        {renderContent()}
      </div>
    </AppActionForm>
  )
}

export default DocumentPopup
export { DocumentPopup }
