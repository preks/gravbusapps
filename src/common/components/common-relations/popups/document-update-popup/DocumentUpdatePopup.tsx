import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useDocumentCatalogs } from '@/common/hooks/useDocumentCatalogs'
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

export interface DocumentUpdatePopupProps extends BusinessAppContextProps {
  isOpen?: boolean
  onClose?: () => void
  documentId?: string
  documentVersion?: number

  // Generic configuration (required)
  graphqlEntity: string // e.g., 'CrmDocument' or 'InvestmentDocument'
  payloadKey: string // e.g., 'crmDocument' or 'investmentDocument'
  groupCatalogIdentifier: string // e.g., 'SalesDocumentGroup' or 'InvestmentDocumentGroup'
  typeCatalogIdentifier: string // e.g., 'SalesDocumentType' or 'InvestmentDocumentType'
  appName: string // e.g., 'crm' or 'irm'
  entityRelationships: string[] // e.g., ['account', 'contact', 'lead', 'opportunity'] or [..., 'investment']

  // Entity context (required - must be provided by wrapper)
  entityType?: string // e.g., 'account', 'contact', 'lead', 'opportunity', 'investment' (not used internally, for debugging/logging)
  entityId: string // The ID of the entity this document belongs to
  entityIdFieldName: string // e.g., 'accountId', 'contactId', 'leadId', 'opportunityId', 'investmentId'
  folderEntityName: string // e.g., 'account', 'investment-account', 'opportunity', 'investment-opportunity'

  // Entity associations for payload (required - must be provided by wrapper)
  // Maps entity GraphQL field names to their IDs - defines which entities this document belongs to
  // Multiple associations allow the document to appear in multiple entity contexts
  // Example CRM: { account: 'uuid-123', contact: 'uuid-456', opportunity: 'uuid-789' }
  // Example IRM: { account: 'uuid-123', investment: 'uuid-456' }
  entityAssociations: Record<string, string>

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

interface DocumentData {
  id: string
  version: number
  name: string
  description?: string
  documentGroupRef?: string
  documentTypeRef?: string
  expirationDate?: string
  parentDocument?: string
  folder: boolean
}

interface FormValues {
  documentId: string
  documentVersion: number
  name: string
  description?: string
  documentGroupRef?: string
  documentTypeRef?: string
  expirationDate?: string
  parentDocument?: string
  file?: File | null
}

const prefixDataTestId = 'document-update-popup'

/**
 * DocumentUpdatePopup
 * Fully generic popup for updating documents across any domain.
 * - NO hardcoded entity logic - everything received as input from wrappers
 * - Wrappers (CRM/IRM) extract entity context and pass all required configuration
 * - Loads document data and catalog options from specified catalogs
 * - Routes update through Flow Registry with correct payload structure
 */
export const DocumentUpdatePopup: React.FC<DocumentUpdatePopupProps> = ({
  isOpen = true,
  onClose,
  documentId: propDocumentId,
  documentVersion,
  accessToken,
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
  onSuccess,
  onError,
  'data-testid': dataTestId = prefixDataTestId,
  ...props
}) => {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFileId, setUploadedFileId] = useState<string>('')
  const [parentFolders, setParentFolders] = useState<{ id: string; name: string }[]>([])
  const [parentLoading, setParentLoading] = useState(false)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken || '')

  // Use propDocumentId or extract from additionalData (simple extraction only)
  const documentId = propDocumentId || props.additionalData?.documentId || ''

  const form = useForm<FormValues>({
    defaultValues: {
      documentId: documentId || '',
      documentVersion: documentVersion || 0,
      name: '',
      description: '',
      documentGroupRef: '',
      documentTypeRef: '',
      expirationDate: '',
      parentDocument: '',
      file: null
    }
  })

  // Watch document group selection for filtering types
  const watchedDocumentGroupRef = form.watch('documentGroupRef')

  // Use document catalogs hook with provided catalog identifiers
  const {
    documentGroups,
    documentTypes,
    filteredDocumentTypes,
    loading: catalogLoading
  } = useDocumentCatalogs(accessToken || '', watchedDocumentGroupRef || '', {
    groupCatalogIdentifier,
    typeCatalogIdentifier
  })

  // Reset document type when document group changes (only after initial load)
  useEffect(() => {
    // Skip validation during initial data load to prevent clearing the loaded document type
    if (!initialDataLoaded) return

    // Skip validation if catalogs are still loading
    if (catalogLoading.groups || catalogLoading.types) return

    const currentType = form.getValues('documentTypeRef')
    if (currentType && watchedDocumentGroupRef) {
      // Check if current type is still valid for the selected group
      const isTypeValid = filteredDocumentTypes.some(type => type.id === currentType)
      if (!isTypeValid) {
        form.setValue('documentTypeRef', '')
      }
    }
  }, [watchedDocumentGroupRef, filteredDocumentTypes, form, initialDataLoaded, catalogLoading])

  // Load document data
  useEffect(() => {
    const loadData = async () => {
      if (!accessToken || !documentId) {
        setError(getTranslationFromI18nKeyAndLabel('document.error.noData', 'Access token or document ID missing'))
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Build entity relationship fields dynamically
        const entityFields = entityRelationships
          .map(
            entity => `
              ${entity} {
                id
              }`
          )
          .join('')

        // Build GraphQL query with dynamic entity relationships
        const query = `
          query GetDocumentById {
            ${graphqlEntity}(where: { id: { _eq: "${documentId}" }, isDeleted: { _eq: false } }) {
              id
              version
              name
              description
              documentGroupRef
              documentTypeRef
              expirationDate
              parentDocument {
                id
              }
              folder${entityFields}
            }
          }
        `

        // Fetch document data
        const documentResponse = await graphqlClient.request(query)

        const document = documentResponse?.[graphqlEntity]?.[0]
        if (!document) {
          throw new Error(getTranslationFromI18nKeyAndLabel('document.error.notFound', 'Document not found'))
        }

        setDocumentData({
          id: document.id,
          version: document.version || 0,
          name: document.name || '',
          description: document.description || '',
          documentGroupRef: document.documentGroupRef || '',
          documentTypeRef: document.documentTypeRef || '',
          expirationDate: document.expirationDate || '',
          parentDocument: document.parentDocument?.id || '',
          folder: document.folder || false
        })

        // Set form values
        form.setValue('documentId', document.id)
        form.setValue('documentVersion', document.version || 0)
        form.setValue('name', document.name || '')
        form.setValue('description', document.description || '')
        form.setValue('documentGroupRef', document.documentGroupRef || '')
        form.setValue('documentTypeRef', document.documentTypeRef || '')
        form.setValue('expirationDate', document.expirationDate || '')
        form.setValue('parentDocument', document.parentDocument?.id || '')

        // Note: We don't set initialDataLoaded here anymore - it's set after catalogs load
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

    if (isOpen) {
      // Reset initial load flag when popup opens
      setInitialDataLoaded(false)
      loadData()
    }
  }, [accessToken, documentId, isOpen, graphqlClient, graphqlEntity, form, onError])

  // Mark initial data as loaded once catalogs are ready and data is loaded
  useEffect(() => {
    // Only mark as loaded if:
    // 1. We're not in loading state for the document
    // 2. Catalogs have finished loading
    // 3. We have document data
    if (!loading && !catalogLoading.groups && !catalogLoading.types && documentData && !initialDataLoaded) {
      setInitialDataLoaded(true)
    }
  }, [loading, catalogLoading.groups, catalogLoading.types, documentData, initialDataLoaded])

  // Load parent folders (folders that can be used as parent)
  useEffect(() => {
    const loadParentFolders = async () => {
      if (!accessToken || !entityId || !isOpen) return

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
  }, [accessToken, entityId, entityIdFieldName, isOpen, graphqlClient, graphqlEntity])

  // Handle file selection from FileUpload component
  const handleFilesChange = (files: any[]) => {
    const file = files?.[0]?.file || null
    if (file) {
      setSelectedFile(file)
      form.setValue('file', file)
    } else {
      setSelectedFile(null)
      setUploadedFileId('')
      form.setValue('file', null)
    }
  }

  // Submit handler
  const handleSubmit = async () => {
    const currentFormValues = form.getValues()

    // Upload file if selected
    let fileInfo: any = null
    if (selectedFile && !uploadedFileId) {
      try {
        // Sanitize the entityId for folder path
        const sanitizedId = entityId.replace(/[^\w-]/g, '_')
        const folderPath = `/${folderEntityName}/${sanitizedId}/documents`

        // Validate the folder path matches the expected regex
        const folderPathRegex = /^(\/[\w-]{1,256})+$/
        if (!folderPathRegex.test(folderPath)) {
          throw new Error(`Invalid folder path format: ${folderPath}`)
        }

        const pathParams = { accessScope: 'public' }
        const queryParams = { appName, folderPath }
        const uploadResult = await fileClient.uploadFile(selectedFile, pathParams, queryParams)

        fileInfo = uploadResult.fileInfo
        setUploadedFileId(uploadResult.fileInfo.fileId)
      } catch (err) {
        console.error('Failed to upload file:', err)
        throw new Error(getTranslationFromI18nKeyAndLabel('document.error.uploadFailed', 'Failed to upload file'))
      }
    }

    // Build payload based on domain
    const documentPayload: any = {
      id: currentFormValues.documentId,
      version: currentFormValues.documentVersion,
      name: currentFormValues.name,
      description: currentFormValues.description || '',
      documentGroupRef: currentFormValues.documentGroupRef || '',
      documentTypeRef: currentFormValues.documentTypeRef || '',
      expirationDate: currentFormValues.expirationDate || null,
      parentDocument: currentFormValues.parentDocument || null
    }

    // Add file info if uploaded
    if (fileInfo) {
      documentPayload.fileInfo = fileInfo
      documentPayload.file = fileInfo.fileId
      documentPayload.fileSize = fileInfo.fileMetadata?.size || selectedFile?.size
      documentPayload.mimeType = fileInfo.fileMetadata?.mimeType || selectedFile?.type
    }

    // Add entity associations (provided by wrapper)
    Object.entries(entityAssociations).forEach(([key, value]) => {
      if (value) {
        documentPayload[key] = value
      }
    })

    return {
      [payloadKey]: documentPayload,
      changeMode: 'UPDATE'
    }
  }

  const handleFormSuccess = () => {
    onSuccess?.()
    onClose?.()
  }

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

  if (error || !documentData) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(dataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription>
            {error || getTranslationFromI18nKeyAndLabel('document.error.failed', 'Failed to load document data')}
          </AlertDescription>
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

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      formData={form.getValues()}
      submitButtonText={getTranslationFromI18nKeyAndLabel('document.update', 'Update Document')}
      businessAppContext={{ ...props, accessToken }}
      onSuccess={handleFormSuccess}
      data-testid={formatDataTestId(dataTestId, 'form')}
    >
      <div className="gba:space-y-6" data-testid={formatDataTestId(dataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold" data-testid={formatDataTestId(dataTestId, 'title')}>
            {getTranslationFromI18nKeyAndLabel('document.updateTitle', 'Update Document')}
          </h2>
        </div>

        {/* File Upload */}
        <FormField
          control={form.control}
          name="file"
          render={() => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('document.file', 'File (optional)')}</FormLabel>
              <FormControl>
                <FileUpload
                  layout="list"
                  preview="icon"
                  maxFiles={1}
                  maxSizeMB={50}
                  multiple={false}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip"
                  onFilesChange={handleFilesChange}
                  data-testid={formatDataTestId(dataTestId, 'file-upload')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
            // During initial load, show all types to preserve loaded value
            // After initial load, show only filtered types based on selected group
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

        {/* Parent Folder (optional) */}
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
                          : getTranslationFromI18nKeyAndLabel('document.parentFolder.select', 'Select parent folder')
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
              <FormLabel>{getTranslationFromI18nKeyAndLabel('document.name', 'Document Name')}</FormLabel>
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
              <FormLabel>{getTranslationFromI18nKeyAndLabel('document.expirationDate', 'Expiration Date')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} data-testid={formatDataTestId(dataTestId, 'expiration-date-input')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hidden fields */}
        <input type="hidden" {...form.register('documentId')} />
        <input type="hidden" {...form.register('documentVersion')} />
      </div>
    </AppActionForm>
  )
}

export default DocumentUpdatePopup
