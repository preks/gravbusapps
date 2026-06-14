import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, toast } from '@newwork/nw-design-system'
import type { Customer360Subject, CustomerContract } from '../../../data/types'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'
import type { DriveSearchResult } from '@/business-apps/core/office/apps/drive/types/drive.types'
import {
  assignContractAsset,
  ensureAccountSpace,
  FALLBACK_CONTRACT_CATALOGS,
  getContractCatalogs,
  notifyCustomerContractsChanged,
  updateContractMetadata,
  upsertContractMetadata,
  type Customer360ContractCatalogs,
  type Customer360ContractAssetType,
  type Customer360ContractMetadataInput
} from './customerContractService'
import ContractAssetPicker from './ContractAssetPicker'
import ContractDriveSearchDialog from './ContractDriveSearchDialog'
import ContractMetadataDialogFooter from './ContractMetadataDialogFooter'
import ContractMetadataFields from './ContractMetadataFields'

interface AttachContractAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  subject: Customer360Subject
  contract?: CustomerContract | null
  onAttached?: () => void
}

interface SelectedAsset {
  assetType: Customer360ContractAssetType
  assetId: string
  name: string
}

const EMPTY_METADATA: Customer360ContractMetadataInput = {
  status: 'active'
}

const CONTRACT_UPLOAD_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const ALLOWED_CONTRACT_FILE_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])

const ALLOWED_CONTRACT_FILE_EXTENSIONS = new Set(['pdf', 'doc', 'docx'])
const CONTRACT_DRIVE_SEARCH_TYPES = ['document', 'drive_file'] as const

function isAllowedContractFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return (
    ALLOWED_CONTRACT_FILE_MIME_TYPES.has(file.type) ||
    Boolean(extension && ALLOWED_CONTRACT_FILE_EXTENSIONS.has(extension))
  )
}

function normalizeAssetType(value: string): Customer360ContractAssetType {
  switch (value) {
    case 'document':
    case 'drive_file':
    case 'spreadsheet_app':
    case 'slide':
    case 'whiteboard':
    case 'note':
      return value
    case 'spreadsheet':
      return 'spreadsheet_app'
    default:
      return 'drive_file'
  }
}

function normalizeUploadedAsset(result: unknown, fallbackName: string): SelectedAsset | null {
  if (!result || typeof result !== 'object') return null
  const record = result as Record<string, unknown>
  let assetId = ''
  if (typeof record.id === 'string') {
    assetId = record.id
  } else if (typeof record.entityId === 'string') {
    assetId = record.entityId
  }
  if (!assetId) return null
  let rawType = 'drive_file'
  if (typeof record.type === 'string') {
    rawType = record.type
  } else if (typeof record.entityType === 'string') {
    rawType = record.entityType
  }
  const name = typeof record.name === 'string' ? record.name : fallbackName
  return { assetType: normalizeAssetType(rawType), assetId, name }
}

function toDateInputValue(value?: string): string | undefined {
  if (!value) return undefined
  return value.includes('T') ? value.slice(0, 10) : value
}

function toMetadata(contract?: CustomerContract | null): Customer360ContractMetadataInput {
  if (!contract) return EMPTY_METADATA
  return {
    contractNumber: contract.contractNumber,
    contractType: contract.contractType,
    status: contract.status,
    effectiveDate: toDateInputValue(contract.effectiveDate ?? contract.startDate),
    signedDate: toDateInputValue(contract.signedDate),
    expiryDate: toDateInputValue(contract.expiryDate ?? contract.endDate),
    renewalDate: toDateInputValue(contract.renewalDate),
    reminderDeadlineDate: toDateInputValue(contract.reminderDeadlineDate),
    terminationDate: toDateInputValue(contract.terminationDate),
    noticePeriodDays: contract.noticePeriodDays
  }
}

const AttachContractAssetDialog: React.FC<AttachContractAssetDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  subject,
  contract,
  onAttached
}) => {
  const isEditMode = Boolean(contract)
  const [metadata, setMetadata] = useState<Customer360ContractMetadataInput>(EMPTY_METADATA)
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DriveSearchResult[]>([])
  const [catalogs, setCatalogs] = useState<Customer360ContractCatalogs>(FALLBACK_CONTRACT_CATALOGS)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = useCallback(() => {
    setMetadata(toMetadata(contract))
    setSelectedAsset(null)
    setFile(null)
    setSearchQuery('')
    setSearchResults([])
  }, [contract])

  const updateMetadata = useCallback((key: keyof Customer360ContractMetadataInput, value: string | boolean) => {
    if (key === 'noticePeriodDays') {
      const parsed = Number(value)
      setMetadata(prev => ({ ...prev, noticePeriodDays: value !== '' && Number.isFinite(parsed) ? parsed : undefined }))
      return
    }

    setMetadata(prev => ({ ...prev, [key]: value === '' ? undefined : value }))
  }, [])

  useEffect(() => {
    if (!open || !accessToken) return
    getContractCatalogs(accessToken)
      .then(setCatalogs)
      .catch(() => setCatalogs(FALLBACK_CONTRACT_CATALOGS))
  }, [accessToken, open])

  useEffect(() => {
    if (!open) return
    setMetadata(toMetadata(contract))
  }, [contract, open])

  const handleSearchQueryChange = useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (query.trim().length < 2 || !accessToken) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      DriveApiService.setAccessToken(accessToken)
      DriveApiService.search(query, [...CONTRACT_DRIVE_SEARCH_TYPES], 20)
        .then(results => setSearchResults(results.filter(result => result.type !== 'drive_folder')))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false))
    },
    [accessToken]
  )

  const handleSelectAsset = useCallback((result: DriveSearchResult) => {
    if (result.type === 'drive_folder') {
      toast.error('Folders cannot be assigned as contracts')
      return
    }
    setSelectedAsset({ assetType: normalizeAssetType(result.type), assetId: result.id, name: result.name })
    setFile(null)
  }, [])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    if (selected && isAllowedContractFile(selected) === false) {
      event.target.value = ''
      setFile(null)
      toast.error('Only PDF and Word documents can be uploaded as contracts')
      return
    }
    setFile(selected)
    if (selected) setSelectedAsset(null)
  }, [])

  const canSubmit = (isEditMode || Boolean(selectedAsset || file)) && Boolean(accessToken) && !isSubmitting

  const submit = useCallback(async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    DriveApiService.setAccessToken(accessToken)

    try {
      if (isEditMode) {
        await updateContractMetadata(accessToken, contract?.assignmentId ?? '', metadata)
        notifyCustomerContractsChanged()
        onAttached?.()
        reset()
        onOpenChange(false)
        toast.success('Contract metadata updated')
        return
      }

      const space = await ensureAccountSpace(accessToken, subject.id, subject.displayName)
      let asset = selectedAsset

      if (!asset && file) {
        if (isAllowedContractFile(file) === false) {
          throw new Error('Only PDF and Word documents can be uploaded as contracts')
        }
        const uploaded = await DriveApiService.uploadFile(file, undefined, space.id)
        asset = normalizeUploadedAsset(uploaded, file.name)
      }

      if (!asset) {
        throw new Error('No document-service asset selected')
      }

      await DriveApiService.createShortcut(asset.assetType, asset.assetId, null, space.id).catch(() => undefined)
      const assignment = await assignContractAsset(accessToken, {
        spaceId: space.id,
        assetType: asset.assetType,
        assetId: asset.assetId
      })

      await upsertContractMetadata(accessToken, assignment.id, metadata)
      notifyCustomerContractsChanged()
      onAttached?.()
      reset()
      onOpenChange(false)
      toast.success('Contract asset assigned')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign contract asset')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    accessToken,
    canSubmit,
    contract?.assignmentId,
    file,
    isEditMode,
    metadata,
    onAttached,
    onOpenChange,
    reset,
    selectedAsset,
    subject.displayName,
    subject.id
  ])

  const selectedLabel = selectedAsset?.name ?? file?.name ?? 'No asset selected'
  const title = isEditMode ? 'Update contract metadata' : 'Attach contract asset'
  const description = isEditMode
    ? 'Update the generic contract metadata stored on this account assignment.'
    : 'Assign an Every Office asset to this account Space and store contract metadata for Customer 360.'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="gba:grid gba:gap-4 gba:py-2">
            {isEditMode ? null : (
              <ContractAssetPicker
                selectedLabel={selectedLabel}
                onOpenSearch={() => setSearchOpen(true)}
                onFileChange={handleFileChange}
                accept={CONTRACT_UPLOAD_ACCEPT}
              />
            )}

            <ContractMetadataFields metadata={metadata} catalogs={catalogs} onUpdate={updateMetadata} />
          </div>

          <ContractMetadataDialogFooter
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            isEditMode={isEditMode}
            onCancel={() => onOpenChange(false)}
            onSubmit={submit}
          />
        </DialogContent>
      </Dialog>

      <ContractDriveSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        query={searchQuery}
        onQueryChange={handleSearchQueryChange}
        results={searchResults}
        isSearching={isSearching}
        onSelectResult={handleSelectAsset}
      />
    </>
  )
}

export default AttachContractAssetDialog
