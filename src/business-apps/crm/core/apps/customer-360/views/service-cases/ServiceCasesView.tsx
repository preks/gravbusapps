import React, { useMemo } from 'react'
import { Badge, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { FoldersIcon, WarningOctagonIcon, type Icon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customer360I18n from '../../_i18n'
import type { Customer360Snapshot, Customer360Subject } from '../../data/types'
import Customer360Section from '../../components/Customer360Section'
import Customer360List, { type Customer360RowData } from '../../components/Customer360List'
import { getStatusBadgeVariant } from '../../utils/statusBadge'
import { formatDate } from '../../utils/format'

export interface ServiceCasesViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

interface CaseLike {
  id: string
  title?: string
  status?: string
  createdAt?: string
}

function buildRows(items: CaseLike[], icon: Icon, prefix: string, untitled: string): Customer360RowData[] {
  return items.map(item => ({
    id: item.id,
    icon,
    primary: item.title || untitled,
    secondary: undefined,
    testId: `customer-360-${prefix}-${item.id}`,
    trailing: (
      <div className="gba:flex gba:items-center gba:gap-2">
        {item.status ? (
          <Badge variant={getStatusBadgeVariant(item.status)} size="sm">
            {item.status}
          </Badge>
        ) : null}
        {item.createdAt ? (
          <span className="gba:text-xs gba:text-muted-foreground">{formatDate(item.createdAt)}</span>
        ) : null}
      </div>
    )
  }))
}

/**
 * Service Cases tab — flow-engine cases grouping plus a dedicated reclamation /
 * complaint section.
 */
const ServiceCasesView: React.FC<ServiceCasesViewProps> = ({ snapshot, loading }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const cases = snapshot.cases ?? []
  const reclamations = snapshot.reclamations ?? []

  const caseRows = useMemo(() => buildRows(cases, FoldersIcon, 'case', t('cases-untitled')), [cases, t])
  const reclamationRows = useMemo(
    () => buildRows(reclamations, WarningOctagonIcon, 'reclamation', t('reclamations-untitled')),
    [reclamations, t]
  )

  return (
    <div className="gba:col-span-12 gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-service-cases-view">
      <Customer360Section
        title={t('cases-title')}
        icon={FoldersIcon}
        count={loading ? undefined : cases.length}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={caseRows.length === 0}
        emptyTitle={t('cases-empty-title')}
        emptyDescription={t('cases-empty-description')}
        testId="customer-360-cases-section"
      >
        <Customer360List rows={caseRows} testId="customer-360-cases-list" />
      </Customer360Section>

      <Customer360Section
        title={t('reclamations-title')}
        icon={WarningOctagonIcon}
        count={loading ? undefined : reclamations.length}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={reclamationRows.length === 0}
        emptyTitle={t('reclamations-empty-title')}
        emptyDescription={t('reclamations-empty-description')}
        testId="customer-360-reclamations-section"
      >
        <Customer360List rows={reclamationRows} testId="customer-360-reclamations-list" />
      </Customer360Section>
    </div>
  )
}

export default ServiceCasesView
export { ServiceCasesView }
