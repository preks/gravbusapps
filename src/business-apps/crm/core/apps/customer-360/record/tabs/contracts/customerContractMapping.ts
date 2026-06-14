import { Navigation, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { DriveItemType } from '@/business-apps/core/office/apps/drive/types/drive.types'
import type { CustomerContract } from '../../../data/types'

export type Customer360ContractAssetType = Exclude<DriveItemType, 'drive_folder'>

interface RawContractAsset {
  id?: string
  type?: string
  name?: string
  title?: string
  mimeType?: string | null
  fileSize?: number | null
  createdAt?: string
  updatedAt?: string
}

interface RawContractReminder {
  id?: string
  remindAt?: string
  dueDate?: string
  triggerDate?: string
  reminderDate?: string
  title?: string
  label?: string
}

interface RawContractMetadata {
  id?: string
  contractNumber?: string
  contractType?: string
  status?: string
  effectiveDate?: string
  signedDate?: string
  expiryDate?: string
  renewalDate?: string
  reminderDeadlineDate?: string
  terminationDate?: string
  noticePeriodDays?: number
  nextReminder?: RawContractReminder | null
}

interface RawAssignmentEnvelope {
  id?: string
  spaceId?: string
  assetType?: string
  assetId?: string
  role?: string
}

export interface RawContractAssignment {
  id?: string
  assignmentId?: string
  assignment?: RawAssignmentEnvelope | null
  spaceId?: string
  assetType?: string
  assetId?: string
  role?: string
  asset?: RawContractAsset | null
  contractMetadata?: RawContractMetadata | null
  contract_metadata?: RawContractMetadata | null
  metadata?: RawContractMetadata | null
  nextReminder?: RawContractReminder | null
  createdAt?: string
  updatedAt?: string
}

export function normalizeContractAssetType(value?: string): Customer360ContractAssetType {
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

function mapReminder(reminder?: RawContractReminder | null): CustomerContract['nextReminder'] {
  if (!reminder) return undefined
  const dueDate = reminder.dueDate ?? reminder.remindAt ?? reminder.triggerDate ?? reminder.reminderDate
  if (!dueDate && !reminder.title && !reminder.label) return undefined
  return {
    id: reminder.id,
    dueDate,
    label: reminder.label ?? reminder.title
  }
}

export function mapContractAssignment(raw: RawContractAssignment): CustomerContract {
  const metadata = raw.contractMetadata ?? raw.contract_metadata ?? raw.metadata ?? {}
  const assignment = raw.assignment
  const assetType = normalizeContractAssetType(assignment?.assetType ?? raw.assetType ?? raw.asset?.type)
  const assetId = assignment?.assetId ?? raw.assetId ?? raw.asset?.id ?? ''
  const legacyTopLevelAssignmentId = raw.role === 'contract' ? raw.id : undefined
  const assignmentId = assignment?.id ?? raw.assignmentId ?? legacyTopLevelAssignmentId
  const assetName = raw.asset?.name ?? raw.asset?.title

  return {
    id: assignmentId ?? assetId,
    assignmentId,
    spaceId: assignment?.spaceId ?? raw.spaceId,
    assetType,
    assetId,
    name: assetName,
    status: metadata.status,
    contractNumber: metadata.contractNumber,
    contractType: metadata.contractType,
    effectiveDate: metadata.effectiveDate,
    signedDate: metadata.signedDate,
    expiryDate: metadata.expiryDate,
    renewalDate: metadata.renewalDate,
    reminderDeadlineDate: metadata.reminderDeadlineDate,
    terminationDate: metadata.terminationDate,
    noticePeriodDays: metadata.noticePeriodDays,
    contractMetadataId: metadata.id,
    documentType: assetType,
    mimeType: raw.asset?.mimeType ?? null,
    fileSize: raw.asset?.fileSize ?? null,
    createdAt: raw.asset?.createdAt ?? raw.createdAt,
    updatedAt: raw.asset?.updatedAt ?? raw.updatedAt,
    nextReminder: mapReminder(metadata.nextReminder ?? raw.nextReminder)
  }
}

export function buildOfficeAssetUrl(contract: Pick<CustomerContract, 'assetType' | 'assetId'>): string | null {
  if (!contract.assetId) return null

  switch (contract.assetType) {
    case 'document':
      return buildPlatformUrl(Navigation.OFFICE_DOCUMENTS, {
        docId: contract.assetId,
        view: 'editor',
        from: 'customer-360'
      })
    case 'spreadsheet_app':
      return buildPlatformUrl(Navigation.OFFICE_SPREADSHEETS, {
        appId: contract.assetId,
        view: 'viewer',
        from: 'customer-360'
      })
    case 'slide':
      return buildPlatformUrl(Navigation.OFFICE_SLIDES, {
        slideId: contract.assetId,
        view: 'editor',
        from: 'customer-360'
      })
    case 'note':
      return buildPlatformUrl(Navigation.OFFICE_NOTES, {
        noteId: contract.assetId,
        view: 'editor',
        from: 'customer-360'
      })
    case 'whiteboard':
      return buildPlatformUrl(Navigation.OFFICE_WHITEBOARDS, { whiteboardId: contract.assetId, from: 'customer-360' })
    case 'drive_file':
      return buildPlatformUrl(Navigation.OFFICE_DRIVE, { fileId: contract.assetId, from: 'customer-360' })
    default:
      return null
  }
}
