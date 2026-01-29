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
  Alert,
  AlertDescription,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { env } from '@/common/env/EnvUtils'
import type { Company } from '@/common/data/orgchart/types/companyTypes'
import translations from './_i18n'

export interface CompanyFolderCreatePopupProps {
  open: boolean
  company: Company
  accessToken: string
  parentFolderId?: string // Optional parent folder ID
  onClose: () => void
  onSuccess: () => void
}

interface FormState {
  name: string
  description: string
  parentDocumentId: string
}

const CompanyFolderCreatePopup: React.FC<CompanyFolderCreatePopupProps> = ({
  open,
  company,
  accessToken,
  parentFolderId,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation(translations)
  const companyId = company.id
  const [formState, setFormState] = useState<FormState>({
    name: '',
    description: '',
    parentDocumentId: parentFolderId || ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)

  const restClient = useRestClient(env('NEXT_PUBLIC_ORGCHART_API_URL'))
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

  // Set parent folder ID when provided
  useEffect(() => {
    if (parentFolderId) {
      setFormState(prev => ({ ...prev, parentDocumentId: parentFolderId }))
    }
  }, [parentFolderId])

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): string | null => {
    if (!formState.name.trim()) {
      return t('error-name-required')
    }

    return null
  }

  /**
   * Build folder payload with form data
   */
  const buildFolderPayload = (): any => {
    const newFolder: any = {
      companyId: companyId,
      name: formState.name.trim(),
      folder: true
    }

    // Add optional fields only if they have values
    if (formState.description.trim()) {
      newFolder.description = formState.description.trim()
    }
    if (formState.parentDocumentId) {
      newFolder.parentDocumentId = formState.parentDocumentId
    }

    return newFolder
  }

  /**
   * Build complete company payload with existing fields and new folder
   */
  const buildCompanyPayloadWithFolder = (newFolder: any): any => {
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

    // Add new folder to existing documents array
    payload.documents = [...(company.documents || []), newFolder]

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
      // Build folder and company payloads using helper functions
      const newFolder = buildFolderPayload()
      const payload = buildCompanyPayloadWithFolder(newFolder)

      // Submit to API - PUT to company endpoint with complete payload
      await restClient.put(`/orgchart/api/v1/companies/${companyId}`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      // Success
      onSuccess()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('error-create-failed')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormState({
      name: '',
      description: '',
      parentDocumentId: parentFolderId || ''
    })
    setError(null)
    onClose()
  }

  const isFormValid = formState.name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent
        className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
        data-testid="company-folder-create-popup"
      >
        <DialogHeader>
          <DialogTitle data-testid="company-folder-create-title">{t('modal-title')}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" data-testid="company-folder-create-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Folder Name */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">
              {t('label-name')}
              <span className="gba:text-destructive"> {t('message-required-field')}</span>
            </label>
            <Input
              value={formState.name}
              onChange={e => handleFieldChange('name', e.target.value)}
              placeholder={t('placeholder-name')}
              data-testid="company-folder-name-input"
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
              data-testid="company-folder-description-input"
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
                <SelectTrigger data-testid="company-folder-parent-select">
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
        </div>

        <DialogFooter className="gba:mt-6">
          <Button variant="outline" onClick={handleClose} disabled={loading} data-testid="company-folder-cancel-button">
            {t('button-cancel')}
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
            data-testid="company-folder-submit-button"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="gba:mr-2" />
                {t('button-creating')}
              </>
            ) : (
              t('button-create')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompanyFolderCreatePopup
