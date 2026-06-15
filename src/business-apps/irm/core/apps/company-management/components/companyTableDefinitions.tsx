import React from 'react'
import type { CellContext, ColumnDef } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { InvestmentCompany } from '@/common/data/investment/types/investmentCompanyTypes'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface CompanyNameCellProps extends CellContext<InvestmentCompany, unknown> {
  t: (key: string) => string
}

type CompanyTableRow = { original: InvestmentCompany }

const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

const CompanyNameCell = ({ row, t }: CompanyNameCellProps) => (
  <div className="gba:min-w-0">
    <div className="gba:truncate gba:font-medium">{row.original.name || t('unnamed-investment-company')}</div>
    <div className="gba:text-xs gba:text-muted-foreground">{row.original.code || t('no-code')}</div>
  </div>
)

const CompanyRowActions: React.FC<{ company: InvestmentCompany; accessToken?: string }> = ({
  company,
  accessToken
}) => (
  <AppAction
    variant="table-row"
    contexts={[
      {
        context: FlowContextName.investmentCompanyEntity,
        contextData: {
          investmentCompanyId: company.id,
          investmentCompany: {
            id: company.id,
            version: company.version
          },
          changeMode: 'UPDATE'
        }
      }
    ]}
    prefixDataTestId="investment-company-row-action"
    accessToken={accessToken}
    emptyState="enable"
    lazyLoad
    onClick={event => event.stopPropagation()}
    data-testid={`investment-company-row-action-button-${company.id}`}
  />
)

export const createCompanyRowActions =
  (accessToken?: string) =>
  (row: CompanyTableRow): React.ReactElement => <CompanyRowActions company={row.original} accessToken={accessToken} />

export const createCompanyColumns = (t: (key: string) => string): Array<ColumnDef<InvestmentCompany>> => [
  {
    id: 'name',
    header: t('investment-company-column'),
    accessorKey: 'name',
    size: 260,
    cell: cellContext => <CompanyNameCell {...cellContext} t={t} />
  },
  {
    id: 'commercialRegistrationNumber',
    header: t('registration-number-column'),
    accessorKey: 'commercialRegistrationNumber',
    cell: ({ row }) => row.original.commercialRegistrationNumber || '-'
  },
  {
    id: 'taxIdentificationNumber',
    header: t('tax-id-column'),
    accessorKey: 'taxIdentificationNumber',
    cell: ({ row }) => row.original.taxIdentificationNumber || '-'
  },
  {
    id: 'currency',
    header: t('currency-column'),
    accessorKey: 'currency.code',
    enableSorting: false,
    cell: ({ row }) => row.original.currency?.code || row.original.currency?.value || row.original.currencyRef || '-'
  },
  {
    id: 'createdAt',
    header: t('created-column'),
    accessorKey: 'createdAt',
    meta: { type: 'date' as const },
    cell: ({ row }) => formatDate(row.original.createdAt)
  }
]

export const companyFilterConfig: FilterConfiguration = {
  id: 'investment-company-filters',
  name: 'Investment Company Filters',
  groups: [
    {
      id: 'owner-group',
      label: 'Owner',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'ownerEmployeeIds',
          field: 'ownerEmployeeIds',
          label: 'Owner',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search owners...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'owns-property-group',
      label: 'Owns Property',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'ownsProperty',
          field: 'ownsProperty',
          label: 'Owns Property',
          type: 'multi-select',
          config: {
            options: [
              { id: 'true', label: 'Yes' },
              { id: 'false', label: 'No' }
            ],
            totalCount: 2,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'currency-group',
      label: 'Currency',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'currencyIds',
          field: 'currencyIds',
          label: 'Currency',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search currencies...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'date-group',
      label: 'Created',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'createdAtRange',
          field: 'createdAtRange',
          label: 'Created Date',
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: 'Start Date',
            placeholderEnd: 'End Date',
            showClearButton: true
          }
        }
      ]
    }
  ]
}
