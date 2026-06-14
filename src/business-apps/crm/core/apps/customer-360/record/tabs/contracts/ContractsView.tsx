import React, { useCallback, useMemo, useState } from 'react'
import { Badge, Button, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import {
  ArrowSquareOutIcon,
  BellIcon,
  CaretDownIcon,
  CaretRightIcon,
  FileIcon,
  FileTextIcon,
  NoteIcon,
  PencilIcon,
  PlusIcon,
  PresentationIcon,
  TableIcon,
  TrashIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { openInNewTab } from '@/common/utils/navigationUtils'
import customer360I18n from '../../../_i18n'
import type { Customer360Snapshot, Customer360Subject, CustomerContract } from '../../../data/types'
import { useCustomerContracts } from '../../../data/record/hooks/useCustomerContracts'
import Customer360Section from '../../../shared/Customer360Section'
import { formatDate } from '../../../utils/format'
import { getStatusBadgeVariant } from '../../../utils/statusBadge'
import AttachContractAssetDialog from './AttachContractAssetDialog'
import { buildOfficeAssetUrl, deleteContractAssignment } from './customerContractService'

export interface ContractsViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

const ASSET_ICONS = {
  document: FileTextIcon,
  drive_file: FileIcon,
  spreadsheet_app: TableIcon,
  slide: PresentationIcon,
  whiteboard: FileIcon,
  note: NoteIcon
} as const

function formatAssetType(contract: CustomerContract): string {
  switch (contract.assetType) {
    case 'document':
      return 'Document'
    case 'drive_file':
      return contract.mimeType || 'Drive file'
    case 'spreadsheet_app':
      return 'Spreadsheet'
    case 'slide':
      return 'Slides'
    case 'whiteboard':
      return 'Whiteboard'
    case 'note':
      return 'Note'
    default:
      return contract.documentType || 'Asset'
  }
}

function contractDateLabel(value?: string): string | null {
  const formatted = formatDate(value)
  return formatted || null
}

function formatMetadataValue(value?: string | number | boolean | null): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  return value || '-'
}

function formatCatalogValue(value?: string): string | undefined {
  if (!value) return undefined
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildMetadataItems(contract: CustomerContract, t: (key: string) => string) {
  return [
    { label: t('contracts-status'), value: formatCatalogValue(contract.status) },
    { label: t('contracts-contract-number'), value: contract.contractNumber },
    { label: t('contracts-contract-type'), value: formatCatalogValue(contract.contractType) },
    { label: t('contracts-effective-date'), value: contractDateLabel(contract.effectiveDate) },
    { label: t('contracts-signed-date'), value: contractDateLabel(contract.signedDate) },
    { label: t('contracts-expiry-date'), value: contractDateLabel(contract.expiryDate) },
    { label: t('contracts-renewal-date'), value: contractDateLabel(contract.renewalDate) },
    { label: t('contracts-termination-date'), value: contractDateLabel(contract.terminationDate) },
    { label: t('contracts-reminder-deadline-date'), value: contractDateLabel(contract.reminderDeadlineDate) },
    {
      label: t('contracts-notice-period'),
      value: contract.noticePeriodDays
        ? t('contracts-notice-period-days', { days: contract.noticePeriodDays })
        : undefined
    }
  ]
}

const ContractsView: React.FC<ContractsViewProps> = ({ subject, snapshot, loading, accessToken }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const [attachOpen, setAttachOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<CustomerContract | null>(null)
  const [expandedMetadataIds, setExpandedMetadataIds] = useState<Set<string>>(() => new Set())
  const contractsResult = useCustomerContracts(accessToken, subject)
  const contracts =
    contractsResult.data.length > 0 || contractsResult.error ? contractsResult.data : (snapshot.contracts ?? [])
  const isLoading = contractsResult.loading || loading
  const error = contractsResult.error

  const openContract = useCallback((contract: CustomerContract) => {
    const url = buildOfficeAssetUrl(contract)
    if (url) openInNewTab(url)
  }, [])

  const toggleMetadata = useCallback((contractId: string) => {
    setExpandedMetadataIds(prev => {
      const next = new Set(prev)
      if (next.has(contractId)) next.delete(contractId)
      else next.add(contractId)
      return next
    })
  }, [])

  const deleteContract = useCallback(
    async (contract: CustomerContract) => {
      await deleteContractAssignment(accessToken, contract.assignmentId ?? '')
      await contractsResult.refetch()
    },
    [accessToken, contractsResult]
  )

  const rows = useMemo(
    () =>
      contracts.map(contract => {
        const AssetIcon = contract.assetType ? (ASSET_ICONS[contract.assetType] ?? FileIcon) : FileTextIcon
        return { contract, AssetIcon, metadataItems: buildMetadataItems(contract, t) }
      }),
    [contracts, t]
  )

  return (
    <div className="gba:col-span-12 gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-contracts-view">
      <Customer360Section
        title={t('tab-contracts')}
        icon={FileTextIcon}
        count={isLoading ? undefined : contracts.length}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAttachOpen(true)}
            data-testid="customer-360-contracts-attach"
          >
            <PlusIcon className="gba:size-4" />
            {t('contracts-attach-action')}
          </Button>
        }
        loading={isLoading}
        error={error}
        errorTitle={t('error-title')}
        isEmpty={rows.length === 0}
        emptyTitle={t('contracts-empty-title')}
        emptyDescription={t('contracts-empty-description')}
        testId="customer-360-contracts-section"
      >
        <div className="gba:flex gba:flex-col gba:gap-3" data-testid="customer-360-contracts-list">
          {rows.map(({ contract, AssetIcon, metadataItems }) => {
            const isMetadataExpanded = expandedMetadataIds.has(contract.id)

            return (
              <div
                key={contract.id}
                className="gba:flex gba:flex-col gba:gap-4 gba:rounded-lg gba:border gba:border-border gba:p-4"
                data-testid={`customer-360-contract-${contract.id}`}
              >
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                  <div className="gba:flex gba:min-w-0 gba:items-start gba:gap-3">
                    <span className="gba:mt-0.5 gba:flex gba:size-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:text-muted-foreground">
                      <AssetIcon className="gba:size-4" />
                    </span>
                    <div className="gba:min-w-0">
                      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                        <span className="gba:font-medium gba:text-foreground">
                          {contract.name || t('contracts-untitled')}
                        </span>
                        {contract.status ? (
                          <Badge variant={getStatusBadgeVariant(contract.status)} size="sm">
                            {formatCatalogValue(contract.status)}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="gba:text-xs gba:text-muted-foreground">{formatAssetType(contract)}</p>
                    </div>
                  </div>
                  <div className="gba:flex gba:shrink-0 gba:flex-wrap gba:items-center gba:justify-end gba:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMetadata(contract.id)}
                      aria-expanded={isMetadataExpanded}
                      data-testid={`customer-360-contract-metadata-toggle-${contract.id}`}
                    >
                      {isMetadataExpanded ? (
                        <CaretDownIcon className="gba:size-4" />
                      ) : (
                        <CaretRightIcon className="gba:size-4" />
                      )}
                      {isMetadataExpanded ? t('contracts-hide-metadata') : t('contracts-show-metadata')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingContract(contract)}
                      title={t('contracts-edit-action')}
                      aria-label={t('contracts-edit-action')}
                      data-testid={`customer-360-contract-edit-${contract.id}`}
                    >
                      <PencilIcon className="gba:size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        deleteContract(contract).catch(() => undefined)
                      }}
                      disabled={!contract.assignmentId}
                      title={t('contracts-delete-action')}
                      aria-label={t('contracts-delete-action')}
                      data-testid={`customer-360-contract-delete-${contract.id}`}
                    >
                      <TrashIcon className="gba:size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openContract(contract)}
                      disabled={!buildOfficeAssetUrl(contract)}
                      data-testid={`customer-360-contract-open-${contract.id}`}
                    >
                      <ArrowSquareOutIcon className="gba:size-4" />
                      {t('contracts-open-action')}
                    </Button>
                  </div>
                </div>

                {isMetadataExpanded ? (
                  <div className="gba:grid gba:grid-cols-1 gba:gap-2 gba:sm:grid-cols-2 gba:lg:grid-cols-5">
                    {metadataItems.map(item => (
                      <div key={item.label} className="gba:rounded-md gba:bg-muted/40 gba:p-3">
                        <p className="gba:text-[11px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="gba:mt-1 gba:text-sm gba:font-medium gba:text-foreground">
                          {formatMetadataValue(item.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {contract.nextReminder ? (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                    <BellIcon className="gba:size-3.5" />
                    <span>
                      {t('contracts-next-reminder')}:{' '}
                      {contract.nextReminder.label ||
                        formatDate(contract.nextReminder.dueDate) ||
                        t('contracts-reminder')}
                    </span>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </Customer360Section>
      <AttachContractAssetDialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        accessToken={accessToken}
        subject={subject}
        onAttached={contractsResult.refetch}
      />
      <AttachContractAssetDialog
        open={Boolean(editingContract)}
        onOpenChange={open => {
          if (!open) setEditingContract(null)
        }}
        accessToken={accessToken}
        subject={subject}
        contract={editingContract}
        onAttached={contractsResult.refetch}
      />
    </div>
  )
}

export default ContractsView
export { ContractsView }
