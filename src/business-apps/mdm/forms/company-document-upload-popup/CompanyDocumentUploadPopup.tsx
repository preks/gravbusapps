import React, { useState, useEffect } from 'react'
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
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { env } from '@/common/env/EnvUtils'
import type { Company } from '@/common/data/orgchart/types/companyTypes'
import translations from './_i18n'

export interface CompanyDocumentUploadPopupProps {
  open: boolean
  company: Company
  accessToken: string
  onClose: () => void
  onSuccess: () => void
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
  open,
  company,
  accessToken,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation(translations)
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

  const restClient = useRestClient(env('NEXT_PUBLIC_ORGCHART_API_URL'))
  const fileClient = useFileClient({ accessToken } as any)
  const graphqlClient = useGraphQLClient(accessToken)

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

    if (selectedFiles.length === 0) {
      return t('error-file-required')
    }

    return null
  }

  /**
   * Build document payload with form data
   */
  const buildDocumentPayload = (fileInfo: any): any => {
    const newDocument: any = {
      companyId: companyId,
      name: formState.name.trim(),
      folder: false,
      fileInfo: fileInfo
    }

    // Add optional fields only if they have values
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
   * Build complete company payload with existing fields and new document
   */
  const buildCompanyPayloadWithDocument = (newDocument: any): any => {
    const payload: any = {
      id: company.id,
      code: company.code, // Required
      name: company.name, // Required
      structureId: company.structureId // Required
    }

    // Include all optional fields that exist in the company
    if (company.description) payload.description = company.description
    if (company.directorId) payload.directorId = company.directorId
    if (company.commercialRegistrationNumber)
      payload.commercialRegistrationNumber = company.commercialRegistrationNumber
    if (company.taxIdentificationNumber) payload.taxIdentificationNumber = company.taxIdentificationNumber
    if (company.taxNumber) payload.taxNumber = company.taxNumber
    if (company.valueAddedTaxNumber) payload.valueAddedTaxNumber = company.valueAddedTaxNumber
    if (company.currencyRef) payload.currencyRef = company.currencyRef
    if (company.additionalProperties) payload.additionalProperties = company.additionalProperties
    if (company.picture) payload.picture = company.picture
    if (company.pictureThumbnail) payload.pictureThumbnail = company.pictureThumbnail

    // Include addresses if they exist
    if (company.addresses && company.addresses.length > 0) {
      payload.addresses = company.addresses
    }

    // Add new document to existing documents array
    payload.documents = [...(company.documents || []), newDocument]

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
      // Upload file
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

      // Build document and company payloads using helper functions
      const newDocument = buildDocumentPayload(uploadResponse.fileInfo)
      const payload = buildCompanyPayloadWithDocument(newDocument)

      // Submit to API - PUT to company endpoint with complete payload
      await restClient.put(`/orgchart/api/v1/companies/${companyId}`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      // Success
      onSuccess()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('error-upload-failed')
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

  const isFormValid = formState.name.trim().length > 0 && selectedFiles.length > 0

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent
        className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
        data-testid="company-document-upload-popup"
      >
        <DialogHeader>
          <DialogTitle data-testid="company-document-upload-title">{t('modal-title')}</DialogTitle>
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
              <span className="gba:text-destructive"> {t('message-required-field')}</span>
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
                {t('button-uploading')}
              </>
            ) : (
              t('button-upload')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompanyDocumentUploadPopup
