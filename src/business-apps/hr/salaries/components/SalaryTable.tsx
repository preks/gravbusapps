import React from 'react'
import { Table, Tag } from 'antd'
import type { TableProps } from 'antd'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { SalaryData, SalaryType, PaymentFrequency } from '../types/salaryTypes'
import { formatCurrency } from '../utils/salaryCalculations'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface SalaryTableProps {
  salaries: SalaryData[]
  loading?: boolean
  accessToken: string
  pagination?: TableProps<SalaryData>['pagination']
  onChange?: TableProps<SalaryData>['onChange']
}

/**
 * SalaryTable component for displaying employee salary data
 * Follows project guidelines with AppActionButton as first column
 */
const SalaryTable: React.FC<SalaryTableProps> = ({ salaries, loading = false, accessToken, pagination, onChange }) => {
  const locale = getCurrentActiveUserLocale()
  const PREFIX = 'salary-table'

  // Helper function to get color for salary type tag
  const getSalaryTypeColor = (type: SalaryType) => {
    switch (type) {
      case SalaryType.MONTHLY:
        return 'blue'
      case SalaryType.HOURLY:
        return 'green'
      default:
        return 'default'
    }
  }

  // Helper function to get color for payment frequency tag
  const getFrequencyColor = (frequency: PaymentFrequency) => {
    switch (frequency) {
      case PaymentFrequency.MONTHLY:
        return 'purple'
      case PaymentFrequency.BI_WEEKLY:
        return 'cyan'
      case PaymentFrequency.WEEKLY:
        return 'geekblue'
      case PaymentFrequency.QUARTERLY:
        return 'orange'
      case PaymentFrequency.ANNUALLY:
        return 'magenta'
      case PaymentFrequency.ONE_TIME:
        return 'volcano'
      default:
        return 'default'
    }
  }

  const columns = [
    {
      title: '',
      key: 'actions',
      width: '60px',
      render: (_: any, record: SalaryData) => (
        <div className="gba:flex gba:justify-start gba:gap-2">
          <AppActionButton
            data-testid={`${PREFIX}-update-salary-button-${record.id}`}
            variant="secondary"
            contextsArray={[FlowContextName.entityContext]}
            externalContextData={{ entityId: record.id }}
            prefixDataTestId={`${PREFIX}-update-salary`}
            accessToken={accessToken}
            emptyStateBehavior="disable"
            deferMainContextRequestsUntilClick
            onClick={e => e.stopPropagation()}
          />
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('salary.table.amount', 'Amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: SalaryData) => (
        <span data-testid={`${PREFIX}-amount-${record.id}`}>{formatCurrency(amount, record.currency, locale)}</span>
      ),
      sorter: (a: SalaryData, b: SalaryData) => a.amount - b.amount
    },
    {
      title: getTranslationFromI18nKeyAndLabel('salary.table.type', 'Type'),
      dataIndex: 'salaryType',
      key: 'salaryType',
      render: (type: SalaryType) => (
        <Tag color={getSalaryTypeColor(type)} data-testid={`${PREFIX}-type-${type}`}>
          {type}
        </Tag>
      ),
      filters: [
        { text: 'Monthly', value: SalaryType.MONTHLY },
        { text: 'Hourly', value: SalaryType.HOURLY }
      ],
      onFilter: (value: string, record: SalaryData) => record.salaryType === value
    },
    {
      title: getTranslationFromI18nKeyAndLabel('salary.table.frequency', 'Frequency'),
      dataIndex: 'paymentFrequency',
      key: 'paymentFrequency',
      render: (frequency: PaymentFrequency) => (
        <Tag color={getFrequencyColor(frequency)} data-testid={`${PREFIX}-frequency-${frequency}`}>
          {frequency.replace('_', ' ')}
        </Tag>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('salary.table.effectiveDate', 'Effective Date'),
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (date: string) => <span>{new Date(date).toLocaleDateString(locale)}</span>,
      sorter: (a: SalaryData, b: SalaryData) =>
        new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    },
    {
      title: getTranslationFromI18nKeyAndLabel('salary.table.status', 'Status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive
            ? getTranslationFromI18nKeyAndLabel('salary.status.active', 'Active')
            : getTranslationFromI18nKeyAndLabel('salary.status.inactive', 'Inactive')}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false }
      ],
      onFilter: (value: boolean, record: SalaryData) => record.isActive === value
    }
  ]

  return (
    <div data-testid="salary-table-container">
      <Table
        dataSource={salaries}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={onChange}
        data-testid="salary-table"
      />
    </div>
  )
}

export default SalaryTable
