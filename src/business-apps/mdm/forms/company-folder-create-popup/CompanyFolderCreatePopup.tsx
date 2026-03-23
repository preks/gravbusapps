import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
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
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { Company } from '@/common/data/orgchart/types/companyTypes'
import translations from './_i18n'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

export interface CompanyFolderCreatePopupProps {
  open: boolean
  company: Company
  accessToken: string
  parentFolderId?: string // Optional parent folder ID
  onClose: () => void
  onSuccess: () => void
  mode?: 'create' | 'update' // Default to 'create'
  folder?: any // Existing folder for update mode
}

interface FormState {
  name: string
  parentDocumentId: string
}

const CompanyFolderCreatePopup: React.FC<CompanyFolderCreatePopupProps> = ({
  open,
  company,
  accessToken,
  parentFolderId,
  onClose,
  onSuccess,
  mode = 'create',
  folder
}) => {
  const { t } = useTranslation(translations)
  const companyId = company.id
  const [formState, setFormState] = useState<FormState>({
    name: '',
    parentDocumentId: parentFolderId || ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)

  const orgchartClient = useOrgchartClient(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)

  // Pre-fill form in update mode
  useEffect(() => {
    if (mode === 'update' && folder && open) {
      setFormState({
        name: folder.name || '',
        parentDocumentId: folder.parentDocument || ''
      })
    }
  }, [mode, folder, open])

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
   * Only sends fields with actual values (matches API specification)
   */
  const buildFolderPayload = (): any => {
    const newFolder: any = {
      companyId: companyId,
      name: formState.name.trim(),
      folder: true,
      changeMode: 'UPSERT' // Required for updateCompany endpoint
    }

    // In update mode, add folder ID (required for updates)
    // Do NOT include version - backend manages this
    if (mode === 'update' && folder) {
      newFolder.id = folder.id
    }

    // Add parent folder only if selected (null/undefined = root level)
    if (formState.parentDocumentId) {
      newFolder.parentDocumentId = formState.parentDocumentId
    }

    return newFolder
  }

  /**
   * Build minimal company payload with only the new folder
   * Uses changeMode: 'UPSERT' approach - only send the document being created
   */
  const buildCompanyPayloadWithFolder = (newFolder: any): any => {
    const payload: any = {
      structureId: company.structureId, // Required
      code: company.code // Required
    }

    // Only send the new folder in documents array
    payload.documents = [newFolder]

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
      await orgchartClient.updateCompany(companyId, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      // Success
      onSuccess()
    } catch (err) {
      const errorKey = mode === 'update' ? 'error-update-failed' : 'error-create-failed'
      const errorMessage = err instanceof Error ? err.message : t(errorKey)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormState({
      name: '',
      parentDocumentId: parentFolderId || ''
    })
    setError(null)
    onClose()
  }

  const isFormValid = formState.name.trim().length > 0

  // Extract button text logic to avoid nested ternary
  const submitButtonText = loading
    ? mode === 'update'
      ? t('button-updating')
      : t('button-creating')
    : mode === 'update'
      ? t('button-update')
      : t('button-create')

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent
        className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
        data-testid="company-folder-create-popup"
      >
        <DialogHeader>
          <DialogTitle data-testid="company-folder-create-title">
            {mode === 'update' ? t('modal-title-update') : t('modal-title')}
          </DialogTitle>
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

          {/* Parent Folder - Always visible with Root Level option */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">{t('label-parent')}</label>
            <Select
              value={formState.parentDocumentId || 'root'}
              onValueChange={value => handleFieldChange('parentDocumentId', value === 'root' ? '' : value)}
              disabled={loadingFolders}
            >
              <SelectTrigger data-testid="company-folder-parent-select">
                <SelectValue
                  placeholder={loadingFolders ? t('placeholder-loading-folders') : t('placeholder-root-level')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">{t('option-root-level')}</SelectItem>
                {folders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                {submitButtonText}
              </>
            ) : (
              submitButtonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompanyFolderCreatePopup
