import React from 'react'
import { Badge, TableCell, TableRow } from '@newwork/nw-design-system'
import { SalaryData, SalaryType } from '../types/salaryTypes'
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

interface SalaryTableProps {
  salaries: SalaryData[]
  loading?: boolean
  accessToken: string
  pagination?: {
    pageSize?: number
  }
  onChange?: () => void
}

/**
 * SalaryTable component for displaying employee salary data
 * Follows project guidelines with AppActionButton as first column
 */
const SalaryTable: React.FC<SalaryTableProps> = ({ salaries, loading = false, accessToken, pagination }) => {
  const locale = getCurrentActiveUserLocale()
  const PREFIX = 'salary-table'
  const columns = [
    { id: 'action', className: 'gba:w-16' },
    { id: 'amount', label: getTranslationFromI18nKeyAndLabel('salary.table.amount', 'Amount') },
    { id: 'type', label: getTranslationFromI18nKeyAndLabel('salary.table.type', 'Type') },
    { id: 'frequency', label: getTranslationFromI18nKeyAndLabel('salary.table.frequency', 'Frequency') },
    { id: 'effectiveDate', label: getTranslationFromI18nKeyAndLabel('salary.table.effectiveDate', 'Effective Date') },
    { id: 'status', label: getTranslationFromI18nKeyAndLabel('salary.table.status', 'Status') }
  ]

  const visibleSalaries = pagination?.pageSize ? salaries.slice(0, pagination.pageSize) : salaries

  return (
    <SalaryTableShell
      columns={columns}
      containerTestId="salary-table-container"
      emptyMessage={getTranslationFromI18nKeyAndLabel('salary.empty', 'No salary data available')}
      isEmpty={visibleSalaries.length === 0}
      loading={loading}
      prefix={PREFIX}
      tableTestId="salary-table"
    >
      {visibleSalaries.map(record => (
        <TableRow key={record.id} data-testid={`${PREFIX}-row-${record.id}`}>
          <SalaryActionCell accessToken={accessToken} actionName="salary" prefix={PREFIX} recordId={record.id} />
          <TableCell data-testid={`${PREFIX}-amount-${record.id}`}>
            {formatCurrency(record.amount, record.currency, locale)}
          </TableCell>
          <TableCell>
            <Badge
              variant={record.salaryType === SalaryType.MONTHLY ? 'info' : 'success'}
              data-testid={`${PREFIX}-type-${record.salaryType}`}
            >
              {record.salaryType}
            </Badge>
          </TableCell>
          <SalaryFrequencyCell paymentFrequency={record.paymentFrequency} prefix={PREFIX} />
          <SalaryDateCell date={record.effectiveDate} locale={locale} />
          <SalaryStatusCell
            activeLabelKey="salary.status.active"
            inactiveLabelKey="salary.status.inactive"
            isActive={record.isActive}
          />
        </TableRow>
      ))}
    </SalaryTableShell>
  )
}

export default SalaryTable
