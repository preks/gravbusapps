import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { buildCustomerDocumentPayload } from '@/common/data/customer/types/customerDocumentTypes'
import { buildInvestmentDocumentPayload } from '@/common/data/investment/types/investmentDocumentTypes'
import { Spinner, Alert, AlertDescription, Button } from '@newwork/nw-design-system'
import { FormProvider, useForm } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { DocumentSegment } from './components/DocumentSegment'
import { useDocumentFileUpload } from './hooks/useDocumentFileUpload'
import { useDocumentFormData } from './hooks/useDocumentFormData'
import { useDocumentAIClassification } from './hooks/useDocumentAIClassification'

export interface DocumentPopupProps extends BusinessAppContextProps {
  isOpen?: boolean
  onClose?: () => void

  // Generic configuration (required)
  groupCatalogIdentifier: string // e.g., 'SalesDocumentGroup' or 'InvestmentDocumentGroup'
  typeCatalogIdentifier: string // e.g., 'SalesDocumentType' or 'InvestmentDocumentType'
  appName: string // e.g., 'crm' or 'irm'

  // Entity context (required - must be provided by wrapper)
  entityType?: string // e.g., 'account', 'contact', 'lead', 'opportunity', 'investment'
  entityId: string // The ID of the entity this document belongs to
  entityIdFieldName: string // e.g., 'accountId', 'contactId', 'leadId', 'opportunityId', 'investmentId'
  folderEntityName: string // e.g., 'accounts', 'contacts', 'leads', 'opportunities', 'investments'

  // Entity associations for payload (required - must be provided by wrapper)
  entityAssociations: Record<string, string>

  // Mode (required - provided by wrapper)
  mode?: 'create' | 'update' | 'rename'
  isFolder?: boolean

  // Pre-fetched document data (required for update/rename mode)
  document?: DocumentData | null
  documentLoading?: boolean
  documentError?: string | null

  // Pre-fetched parent folders (optional - provided by wrappers for create mode)
  parentFolders?: { id: string; name: string }[]
  parentFoldersLoading?: boolean

  // AI classification (optional - for CRM)
  enableAIClassification?: boolean
  aiClassificationEndpoint?: string

  onSuccess?: () => void

  'data-testid'?: string
}

export interface DocumentData {
  id?: string
  version?: number
  name?: string
  description?: string
  documentGroupRef?: string // Catalog reference string (e.g., "SalesDocumentGroup:v1:FINANCIALS")
  documentTypeRef?: string // Catalog reference string (e.g., "SalesDocumentType:v1:QUOTE")
  expirationDate?: string
  parentDocument?: string
  folder?: boolean
  file?: string // Derived from fileInfo.fileId
  fileInfo?: {
    fileId?: string
    path?: string
    folderPath?: string
    fileMetadata?: {
      originalFileName?: string
      mimeType?: string
      size?: number
      updatedAt?: string
    }
    appName?: string
    accessScope?: string
    uploadedAt?: string
  }
  fileSize?: number | null // Derived from fileInfo.fileMetadata.size
  mimeType?: string | null
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

/**
 * DocumentPopup (Layout Component)
 *
 * Orchestrates document creation/update/rename using hook-based architecture:
 * - useDocumentFileUpload: File upload logic
 * - useDocumentFormData: Form data population
 * - useDocumentAIClassification: AI classification logic
 * - DocumentSegment: Pure presentation component for form fields
 *
 * Wrappers (CRM/IRM) are responsible for:
 * - Fetching document data via GraphQL
 * - Passing loadedDocument/documentLoading/documentError props
 * - Fetching parent folders
 */
export const DocumentPopup: React.FC<DocumentPopupProps> = ({
  isOpen = true,
  onClose,
  accessToken,
  userInfo,
  additionalData,
  groupCatalogIdentifier,
  typeCatalogIdentifier,
  appName,
  entityId,
  folderEntityName,
  entityAssociations,
  mode = 'create',
  isFolder = false,
  document,
  documentLoading = false,
  documentError = null,
  parentFolders = [],
  parentFoldersLoading = false,
  enableAIClassification = false,
  aiClassificationEndpoint,
  onSuccess,
  'data-testid': dataTestId = prefixDataTestId
}) => {
  const isUpdateMode = mode === 'update'
  const isRenameMode = mode === 'rename'

  const form = useForm<FormValues>({
    defaultValues: {
      documentId: document?.id || '',
      documentVersion: document?.version || 0,
      name: document?.name || '',
      description: document?.description || '',
      documentGroupRef: document?.documentGroupRef || '',
      documentTypeRef: document?.documentTypeRef || '',
      expirationDate: document?.expirationDate || '',
      parentDocument: document?.parentDocument || undefined,
      files: [],
      folder: isFolder
    }
  })

  // Use hooks for business logic
  const fileUpload = useDocumentFileUpload({
    accessToken,
    entityId,
    folderEntityName,
    appName,
    existingFile: document,
    isRenameMode
  })

  useDocumentFormData({
    form,
    loadedDocument: document,
    loading: documentLoading,
    onExistingFileInfoChange: fileUpload.setExistingFileInfo
  })

  const watchedFiles = form.watch('files')
  const watchedFolder = form.watch('folder')
  const firstWatchedFile = watchedFiles?.[0] as File | undefined

  const aiClassification = useDocumentAIClassification({
    accessToken,
    appName,
    groupCatalogIdentifier,
    typeCatalogIdentifier,
    file: firstWatchedFile,
    endpoint: aiClassificationEndpoint,
    enabled: enableAIClassification,
    isRenameMode,
    watchedFolder
  })

  const handleSubmit = async () => {
    const formData = form.getValues()

    if ((isUpdateMode || isRenameMode) && formData.files && formData.files.length > 1) {
      throw new Error('Update mode only supports single file upload')
    }

    const fileInfoList = await fileUpload.uploadFiles(formData.files, formData.folder)
    const isBulk = fileInfoList.length > 1

    // Prepare document data with entity associations
    // Spread original document first to preserve all fields (fileInfo, file, fileSize, etc.)
    const documentData: Record<string, any> = {
      ...document, // Preserve original document fields
      ...formData, // Override with form changes
      // Map form field names to payload field names
      id: formData.documentId || document?.id,
      version: formData.documentVersion ?? document?.version,
      ...entityAssociations // Add entity associations
    }

    // Use domain-specific payload builder
    const payloadBuilder = appName === 'crm' ? buildCustomerDocumentPayload : buildInvestmentDocumentPayload

    return payloadBuilder(documentData, {
      mode,
      isFolder: formData.folder,
      isBulk,
      fileInfoList
    })
  }

  const validateForm = (data: any): string[] | null => {
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
  }

  const handleFormSuccess = () => {
    onSuccess?.()
    onClose?.()
  }

  if (!isOpen) {
    return null
  }

  if (documentLoading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(dataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p className="gba:mt-4">{getTranslationFromI18nKeyAndLabel('document.loading', 'Loading document data...')}</p>
      </div>
    )
  }

  if (documentError) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(dataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription>{documentError}</AlertDescription>
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

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <FormProvider {...form}>
        <AppActionForm
          processType={isUpdateMode || isRenameMode ? 'update' : 'create'}
          onSubmit={handleSubmit}
          formData={form.getValues()}
          validateForm={validateForm}
          submitButtonText={getSubmitButtonText()}
          onSuccess={handleFormSuccess}
          form={form}
          data-testid={formatDataTestId(dataTestId, 'form')}
        >
          <div className="gba:space-y-6" data-testid={formatDataTestId(dataTestId, 'container')}>
            <div className="gba:mb-4">
              <h2 className="gba:text-xl gba:font-semibold" data-testid={formatDataTestId(dataTestId, 'title')}>
                {getDialogTitle()}
              </h2>
            </div>

            <DocumentSegment
              mode={mode}
              isFolder={isFolder}
              groupCatalogIdentifier={groupCatalogIdentifier}
              typeCatalogIdentifier={typeCatalogIdentifier}
              parentFolders={parentFolders}
              parentFoldersLoading={parentFoldersLoading}
              existingFileInfo={fileUpload.existingFileInfo}
              enableAIClassification={enableAIClassification}
              aiSuggestion={aiClassification.suggestion}
              aiLoading={aiClassification.loading}
              aiError={aiClassification.error}
              onFilesChange={files => fileUpload.handleFilesChange(files, form)}
              data-testid={formatDataTestId(dataTestId, 'segment')}
            />
          </div>
        </AppActionForm>
      </FormProvider>
    </CatalogSelect.Provider>
  )
}

export default DocumentPopup
