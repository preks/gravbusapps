import React from 'react'
import { Table, Tag } from 'antd'
import type { TableProps } from 'antd'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { CompensationComponent, CompensationComponentType, PaymentFrequency } from '../types/salaryTypes'
import { formatCurrency } from '../utils/salaryCalculations'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface CompensationComponentsTableProps {
  components: CompensationComponent[]
  loading?: boolean
  accessToken: string
  pagination?: TableProps<CompensationComponent>['pagination']
  onChange?: TableProps<CompensationComponent>['onChange']
}

/**
 * CompensationComponentsTable component for displaying employee compensation components
 * Follows project guidelines with AppActionButton as first column
 */
const CompensationComponentsTable: React.FC<CompensationComponentsTableProps> = ({
  components,
  loading = false,
  accessToken,
  pagination,
  onChange
}) => {
  const locale = getCurrentActiveUserLocale()
  const PREFIX = 'compensation-component-table'

  // Helper function to get color for component type tag
  const getComponentTypeColor = (type: CompensationComponentType) => {
    switch (type) {
      case CompensationComponentType.BONUS:
        return 'green'
      case CompensationComponentType.ALLOWANCE:
        return 'blue'
      case CompensationComponentType.COMMISSION:
        return 'purple'
      case CompensationComponentType.BENEFIT:
        return 'cyan'
      case CompensationComponentType.DEDUCTION:
        return 'red'
      case CompensationComponentType.OTHER:
        return 'orange'
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
      render: (_: any, record: CompensationComponent) => (
        <div className="gba:flex gba:justify-start gba:gap-2">
          <AppActionButton
            data-testid={`${PREFIX}-update-component-button-${record.id}`}
            variant="secondary"
            contextsArray={[FlowContextName.entityContext]}
            externalContextData={{ entityId: record.id }}
            prefixDataTestId={`${PREFIX}-update-component`}
            accessToken={accessToken}
            emptyStateBehavior="disable"
            deferMainContextRequestsUntilClick
            onClick={e => e.stopPropagation()}
          />
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('compensation.table.name', 'Name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: CompensationComponent) => (
        <span data-testid={`${PREFIX}-name-${record.id}`}>{name}</span>
      ),
      sorter: (a: CompensationComponent, b: CompensationComponent) => a.name.localeCompare(b.name)
    },
    {
      title: getTranslationFromI18nKeyAndLabel('compensation.table.type', 'Type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: CompensationComponentType) => (
        <Tag color={getComponentTypeColor(type)} data-testid={`${PREFIX}-type-${type}`}>
          {type.replace('_', ' ')}
        </Tag>
      ),
      filters: Object.values(CompensationComponentType).map(type => ({
        text: type.replace('_', ' '),
        value: type
      })),
      onFilter: (value: string, record: CompensationComponent) => record.type === value
    },
    {
      title: getTranslationFromI18nKeyAndLabel('compensation.table.amount', 'Amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: CompensationComponent) => (
        <span data-testid={`${PREFIX}-amount-${record.id}`}>{formatCurrency(amount, record.currency, locale)}</span>
      ),
      sorter: (a: CompensationComponent, b: CompensationComponent) => a.amount - b.amount
    },
    {
      title: getTranslationFromI18nKeyAndLabel('compensation.table.frequency', 'Frequency'),
      dataIndex: 'paymentFrequency',
      key: 'paymentFrequency',
      render: (frequency: PaymentFrequency) => (
        <Tag color={getFrequencyColor(frequency)} data-testid={`${PREFIX}-frequency-${frequency}`}>
          {frequency.replace('_', ' ')}
        </Tag>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('compensation.table.effectiveDate', 'Effective Date'),
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (date: string) => <span>{new Date(date).toLocaleDateString(locale)}</span>,
      sorter: (a: CompensationComponent, b: CompensationComponent) =>
        new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    },
    {
      title: getTranslationFromI18nKeyAndLabel('compensation.table.status', 'Status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive
            ? getTranslationFromI18nKeyAndLabel('compensation.status.active', 'Active')
            : getTranslationFromI18nKeyAndLabel('compensation.status.inactive', 'Inactive')}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false }
      ],
      onFilter: (value: boolean, record: CompensationComponent) => record.isActive === value
    }
  ]

  return (
    <div data-testid="compensation-components-table-container">
      <Table
        dataSource={components}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={onChange}
        data-testid="compensation-components-table"
      />
    </div>
  )
}

export default CompensationComponentsTable
