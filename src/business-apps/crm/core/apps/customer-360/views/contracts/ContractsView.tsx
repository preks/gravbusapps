import React, { useCallback, useMemo } from 'react'
import { Badge, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { FileTextIcon, DownloadSimpleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { handleDocumentClick } from '@/common/utils/documentClickHandler'
import customer360I18n from '../../_i18n'
import type { Customer360Snapshot, Customer360Subject, CustomerContract } from '../../data/types'
import Customer360Section from '../../components/Customer360Section'
import Customer360List, { type Customer360RowData } from '../../components/Customer360List'
import { formatDate } from '../../utils/format'

export interface ContractsViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

function buildSecondary(contract: CustomerContract): string {
  return [contract.documentType, contract.createdAt ? formatDate(contract.createdAt) : null].filter(Boolean).join(' · ')
}

/**
 * Contracts tab — CrmDocument records typed as contracts, with file-service
 * preview/download for each binary.
 */
const ContractsView: React.FC<ContractsViewProps> = ({ snapshot, loading, accessToken }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const contracts = snapshot.contracts ?? []

  const openContract = useCallback(
    (contract: CustomerContract) => {
      if (!contract.fileInfo?.path) return
      void handleDocumentClick(
        { id: contract.id, name: contract.name, mimeType: contract.mimeType, fileInfo: contract.fileInfo },
        accessToken
      )
    },
    [accessToken]
  )

  const rows = useMemo<Customer360RowData[]>(
    () =>
      contracts.map(contract => ({
        id: contract.id,
        icon: FileTextIcon,
        primary: contract.name || t('contracts-untitled'),
        secondary: buildSecondary(contract),
        onClick: contract.fileInfo?.path ? () => openContract(contract) : undefined,
        testId: `customer-360-contract-${contract.id}`,
        trailing: (
          <div className="gba:flex gba:items-center gba:gap-2">
            {contract.endDate ? (
              <Badge variant="outline" size="sm">
                {t('contracts-expires', { date: formatDate(contract.endDate) })}
              </Badge>
            ) : null}
            {contract.fileInfo?.path ? <DownloadSimpleIcon className="gba:size-4 gba:text-muted-foreground" /> : null}
          </div>
        )
      })),
    [contracts, openContract, t]
  )

  return (
    <div className="gba:col-span-12 gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-contracts-view">
      <Customer360Section
        title={t('tab-contracts')}
        icon={FileTextIcon}
        count={loading ? undefined : contracts.length}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={rows.length === 0}
        emptyTitle={t('contracts-empty-title')}
        emptyDescription={t('contracts-empty-description')}
        testId="customer-360-contracts-section"
      >
        <Customer360List rows={rows} testId="customer-360-contracts-list" />
      </Customer360Section>
    </div>
  )
}

export default ContractsView
export { ContractsView }
