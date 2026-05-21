import React, { useState, useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  FileUpload,
  Alert,
  AlertDescription,
  Spinner,
  DateInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { CatalogSelect } from '@/components/catalog-select'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { Company } from '@/common/data/orgchart/types/companyTypes'
import translations from './_i18n'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

/** Minimal company when the remote shell omits `company` (platform passes only accessToken / userInfo / additionalData). */
const REMOTE_SHELL_COMPANY_STUB: Company = {
  id: '00000000-0000-0000-0000-000000000001',
  name: '',
  code: 'REMOTE',
  structureId: '00000000-0000-0000-0000-000000000002',
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
  isDeleted: false
}

export interface CompanyDocumentUploadPopupProps {
  open?: boolean
  company?: Company
  accessToken: string
  onClose?: () => void
  onSuccess?: () => void
  mode?: 'create' | 'update' // Default to 'create'
  document?: any // Existing document for update mode
}

interface FormState {
  name: string
  description: string
  documentGroupRef: string
  documentTypeRef: string
  parentDocumentId: string
  expirationDate: string
}

const CompanyDocumentUploadPopup: React.FC<CompanyDocumentUploadPopupProps> = ({
  open = true,
  company: companyProp,
  accessToken,
  onClose = () => {},
  onSuccess = () => {},
  mode = 'create',
  document
}) => {
  const { t } = useTranslation(translations)
  const company = companyProp ?? REMOTE_SHELL_COMPANY_STUB
  const companyId = company.id
  const [formState, setFormState] = useState<FormState>({
    name: '',
    description: '',
    documentGroupRef: '',
    documentTypeRef: '',
    parentDocumentId: '',
    expirationDate: ''
  })

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)

  const orgchartClient = useOrgchartClient(accessToken)
  const fileClient = useFileClient({ accessToken } as any)
  const graphqlClient = useGraphQLClient(accessToken)

  /** CatalogSelect expects react-hook-form context (`useFormState`); this popup uses local state for fields. */
  const catalogSelectFormShell = useForm({ defaultValues: {} })

  // Pre-fill form in update mode
  useEffect(() => {
    if (mode === 'update' && document && open) {
      setFormState({
        name: document.name || '',
        description: document.description || '',
        documentGroupRef: document.documentGroup?.id || '',
        documentTypeRef: document.documentType?.id || '',
        parentDocumentId: document.parentDocument || '',
        expirationDate: document.expirationDate || ''
      })
    }
  }, [mode, document, open])

  // Load existing folders for parent selection
  useEffect(() => {
    if (!open || !companyId) return

    const loadFolders = async () => {
      setLoadingFolders(true)
      try {
        const query = `
          query GetCompanyFolders($companyId: uuid!) {
            CompanyDocument(
              where: {
                companyId: { _eq: $companyId }
                folder: { _eq: true }
                isDeleted: { _eq: false }
              }
              orderBy: { name: ASC }
            ) {
              id
              name
            }
          }
        `
        const result = await graphqlClient.request<{ CompanyDocument: Array<{ id: string; name: string }> }>(query, {
          companyId
        })
        setFolders(result?.CompanyDocument || [])
      } catch {
        setFolders([])
      } finally {
        setLoadingFolders(false)
      }
    }

    loadFolders()
  }, [open, companyId])

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }

  const handleFilesChange = (files: any[]) => {
    const validFiles = files.map(f => f.file).filter((f): f is File => f instanceof File)
    setSelectedFiles(validFiles)

    // Auto-fill name from first file if empty
    if (validFiles.length > 0 && !formState.name) {
      handleFieldChange('name', validFiles[0].name)
    }
  }

  const validateForm = (): string | null => {
    if (!formState.name.trim()) {
      return t('error-name-required')
    }

    // File is required only in create mode
    if (mode === 'create' && selectedFiles.length === 0) {
      return t('error-file-required')
    }

    return null
  }

  /**
   * Build document payload with form data
   * Only sends fields with actual values (no empty strings for catalog fields)
   * Update mode: only sends changed fields + required identifiers (matches Scenario 3)
   */
  const buildDocumentPayload = (fileInfo?: any): any => {
    const newDocument: any = {
      companyId: companyId,
      name: formState.name.trim(),
      changeMode: 'UPSERT' // Required for updateCompany endpoint
    }

    // In update mode, add document ID (required for updates)
    // Do NOT include version or folder - backend manages these
    if (mode === 'update' && document) {
      newDocument.id = document.id
    }

    // Include fileInfo if uploading a new file, otherwise preserve existing one
    // Backend does not preserve fileInfo on UPSERT if not provided in payload
    if (fileInfo) {
      newDocument.fileInfo = fileInfo
    } else if (mode === 'update' && document?.fileInfo) {
      newDocument.fileInfo = document.fileInfo
    }

    // Only add optional fields if they have values (backend rejects empty strings)
    if (formState.description.trim()) {
      newDocument.description = formState.description.trim()
    }
    if (formState.documentGroupRef) {
      newDocument.documentGroup = formState.documentGroupRef
    }
    if (formState.documentTypeRef) {
      newDocument.documentType = formState.documentTypeRef
    }
    if (formState.parentDocumentId) {
      newDocument.parentDocumentId = formState.parentDocumentId
    }
    if (formState.expirationDate) {
      newDocument.expirationDate = formState.expirationDate
    }

    return newDocument
  }

  /**
   * Build minimal company payload with only the new document
   * Uses changeMode: 'UPSERT' approach - only send the document being created/updated
   */
  const buildCompanyPayloadWithDocument = (newDocument: any): any => {
    const payload: any = {
      structureId: company.structureId, // Required
      code: company.code // Required
    }

    // Only send the new/updated document in documents array
    payload.documents = [newDocument]

    return payload
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let uploadedFileInfo = null

      // Upload file if selected (required in create, optional in update)
      if (selectedFiles.length > 0) {
        const file = selectedFiles[0]
        const uploadResponse = await fileClient.uploadFile(
          file,
          { accessScope: 'tenant' },
          {
            appName: 'mdm',
            folderPath: `/companies/${companyId}/documents`,
            mimeType: file.type || 'application/octet-stream'
          },
          'fileContent'
        )
        uploadedFileInfo = uploadResponse.fileInfo
      }

      // Build document and company payloads using helper functions
      const newDocument = buildDocumentPayload(uploadedFileInfo)
      const payload = buildCompanyPayloadWithDocument(newDocument)

      // Submit to API - PUT to company endpoint with complete payload
      await orgchartClient.updateCompany(companyId, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      // Success
      onSuccess()
    } catch (err) {
      let errorMessage: string
      if (err instanceof Error) {
        errorMessage = err.message
      } else {
        errorMessage = mode === 'update' ? t('error-update-failed') : t('error-upload-failed')
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormState({
      name: '',
      description: '',
      documentGroupRef: '',
      documentTypeRef: '',
      parentDocumentId: '',
      expirationDate: ''
    })
    setSelectedFiles([])
    setError(null)
    onClose()
  }

  const isFormValid = formState.name.trim().length > 0 && (mode === 'update' || selectedFiles.length > 0)

  // Extract button text logic to avoid nested ternary
  const submitButtonText = loading
    ? mode === 'update'
      ? t('button-updating')
      : t('button-uploading')
    : mode === 'update'
      ? t('button-update')
      : t('button-upload')

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <FormProvider {...catalogSelectFormShell}>
        <DialogContent
          className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
          data-testid="company-document-upload-popup"
        >
          <DialogHeader>
            <DialogTitle data-testid="company-document-upload-title">
              {mode === 'update' ? t('modal-title-update') : t('modal-title')}
            </DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" data-testid="company-document-upload-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* File Upload */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                {t('label-file')}
                {mode === 'create' && <span className="gba:text-destructive"> {t('message-required-field')}</span>}
                {mode === 'update' && document?.fileInfo && (
                  <span className="gba:text-sm gba:text-muted-foreground gba:ml-2">(Current: {document.name})</span>
                )}
              </label>
              <FileUpload
                layout="list"
                preview="icon"
                maxFiles={1}
                maxSizeMB={50}
                multiple={false}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip"
                onChange={handleFilesChange}
                data-testid="company-document-file-upload"
              />
            </div>

            {/* Document Name */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">
                {t('label-name')}
                <span className="gba:text-destructive"> {t('message-required-field')}</span>
              </label>
              <Input
                value={formState.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                placeholder={t('placeholder-name')}
                data-testid="company-document-name-input"
              />
            </div>

            {/* Description */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">{t('label-description')}</label>
              <Textarea
                value={formState.description}
                onChange={e => handleFieldChange('description', e.target.value)}
                rows={3}
                placeholder={t('placeholder-description')}
                data-testid="company-document-description-input"
              />
            </div>

            {/* Document Group */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">{t('label-group')}</label>
              <CatalogSelect
                catalogIdentifier="CompanyDocumentGroup"
                value={formState.documentGroupRef || null}
                onValueChange={value => {
                  const stringValue = Array.isArray(value) ? value[0] : value
                  handleFieldChange('documentGroupRef', stringValue || '')
                }}
                data-testid="company-document-group-select"
              />
            </div>

            {/* Document Type */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">{t('label-type')}</label>
              <CatalogSelect
                catalogIdentifier="CompanyDocumentType"
                parentField="documentGroupRef"
                requireSourceForEnable={true}
                value={formState.documentTypeRef || null}
                onValueChange={value => {
                  const stringValue = Array.isArray(value) ? value[0] : value
                  handleFieldChange('documentTypeRef', stringValue || '')
                }}
                data-testid="company-document-type-select"
              />
            </div>

            {/* Parent Folder */}
            {folders.length > 0 && (
              <div>
                <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">{t('label-parent')}</label>
                <Select
                  value={formState.parentDocumentId}
                  onValueChange={value => handleFieldChange('parentDocumentId', value)}
                  disabled={loadingFolders}
                >
                  <SelectTrigger data-testid="company-document-parent-select">
                    <SelectValue
                      placeholder={loadingFolders ? t('placeholder-loading-folders') : t('placeholder-no-parent')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map(folder => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Expiration Date */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">{t('label-expiration')}</label>
              <DateInput
                type="date"
                value={formState.expirationDate}
                onChange={value => {
                  const dateValue = Array.isArray(value) ? value[0] : value
                  handleFieldChange('expirationDate', dateValue || '')
                }}
                className="gba:w-full"
                data-testid="company-document-expiration-input"
              />
            </div>
          </div>

          <DialogFooter className="gba:mt-6">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              data-testid="company-document-cancel-button"
            >
              {t('button-cancel')}
            </Button>
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              data-testid="company-document-submit-button"
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="gba:mr-2" />
                  {submitButtonText}
                </>
              ) : (
                submitButtonText
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </FormProvider>
    </Dialog>
  )
}

export default CompanyDocumentUploadPopup
