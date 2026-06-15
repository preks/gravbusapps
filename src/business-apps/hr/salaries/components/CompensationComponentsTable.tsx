import React from 'react'
import { Badge, TableCell, TableRow } from '@newwork/nw-design-system'
import { CompensationComponent, CompensationComponentType } from '../types/salaryTypes'
import { formatCurrency } from '../utils/salaryCalculations'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  SalaryActionCell,
  SalaryDateCell,
  SalaryFrequencyCell,
  SalaryStatusCell,
  SalaryTableShell
} from './SalaryTableShared'

interface CompensationComponentsTableProps {
  components: CompensationComponent[]
  loading?: boolean
  accessToken: string
  pagination?: {
    pageSize?: number
  }
  onChange?: () => void
}

/**
 * CompensationComponentsTable component for displaying employee compensation components
 * Follows project guidelines with AppActionButton as first column
 */
const CompensationComponentsTable: React.FC<CompensationComponentsTableProps> = ({
  components,
  loading = false,
  accessToken,
  pagination
}) => {
  const locale = getCurrentActiveUserLocale()
  const PREFIX = 'compensation-component-table'
  const columns = [
    { id: 'action', className: 'gba:w-16' },
    { id: 'name', label: getTranslationFromI18nKeyAndLabel('compensation.table.name', 'Name') },
    { id: 'type', label: getTranslationFromI18nKeyAndLabel('compensation.table.type', 'Type') },
    { id: 'amount', label: getTranslationFromI18nKeyAndLabel('compensation.table.amount', 'Amount') },
    { id: 'frequency', label: getTranslationFromI18nKeyAndLabel('compensation.table.frequency', 'Frequency') },
    {
      id: 'effectiveDate',
      label: getTranslationFromI18nKeyAndLabel('compensation.table.effectiveDate', 'Effective Date')
    },
    { id: 'status', label: getTranslationFromI18nKeyAndLabel('compensation.table.status', 'Status') }
  ]

  const getComponentTypeVariant = (type: CompensationComponentType) => {
    switch (type) {
      case CompensationComponentType.BONUS:
        return 'success'
      case CompensationComponentType.ALLOWANCE:
        return 'info'
      case CompensationComponentType.COMMISSION:
        return 'secondary'
      case CompensationComponentType.BENEFIT:
        return 'info'
      case CompensationComponentType.DEDUCTION:
        return 'destructive'
      case CompensationComponentType.OTHER:
        return 'warning'
      default:
        return 'secondary'
    }
  }

  const visibleComponents = pagination?.pageSize ? components.slice(0, pagination.pageSize) : components

  return (
    <SalaryTableShell
      columns={columns}
      containerTestId="compensation-components-table-container"
      emptyMessage={getTranslationFromI18nKeyAndLabel('compensation.empty', 'No compensation components available')}
      isEmpty={visibleComponents.length === 0}
      loading={loading}
      prefix={PREFIX}
      tableTestId="compensation-components-table"
    >
      {visibleComponents.map(record => (
        <TableRow key={record.id} data-testid={`${PREFIX}-row-${record.id}`}>
          <SalaryActionCell accessToken={accessToken} actionName="component" prefix={PREFIX} recordId={record.id} />
          <TableCell data-testid={`${PREFIX}-name-${record.id}`}>{record.name}</TableCell>
          <TableCell>
            <Badge variant={getComponentTypeVariant(record.type)} data-testid={`${PREFIX}-type-${record.type}`}>
              {record.type.replace('_', ' ')}
            </Badge>
          </TableCell>
          <TableCell data-testid={`${PREFIX}-amount-${record.id}`}>
            {formatCurrency(record.amount, record.currency, locale)}
          </TableCell>
          <SalaryFrequencyCell paymentFrequency={record.paymentFrequency} prefix={PREFIX} />
          <SalaryDateCell date={record.effectiveDate} locale={locale} />
          <SalaryStatusCell
            activeLabelKey="compensation.status.active"
            inactiveLabelKey="compensation.status.inactive"
            isActive={record.isActive}
          />
        </TableRow>
      ))}
    </SalaryTableShell>
  )
}

export default CompensationComponentsTable
