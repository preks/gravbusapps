import React from 'react'
import type { CellContext, ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage, Badge, type FilterConfiguration } from '@newwork/nw-design-system'
import type { InvestmentCompany } from '@/common/data/investment/types/investmentCompanyTypes'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { navigateTo } from '@/common/utils/navigationUtils'

interface CompanyNameCellProps extends CellContext<InvestmentCompany, unknown> {
  t: (key: string) => string
}

interface OwnsPropertyCellProps extends CellContext<InvestmentCompany, unknown> {
  t: (key: string) => string
}

type CompanyTableRow = { original: InvestmentCompany }

const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

const formatOwnerName = (company: InvestmentCompany): string =>
  company.ownerEmployee?.displayName ||
  company.ownerEmployee?.fullName ||
  `${company.ownerEmployee?.firstName || ''} ${company.ownerEmployee?.lastName || ''}`.trim() ||
  '-'

const getOwnerInitials = (ownerName: string): string => {
  if (ownerName === '-') return 'O'

  const initials = ownerName
    .split(' ')
    .map(namePart => namePart[0] || '')
    .join('')
    .toUpperCase()

  return initials || 'O'
}

const CompanyNameCell = ({ row, t }: CompanyNameCellProps) => (
  <div className="gba:min-w-0">
    <div className="gba:truncate gba:font-medium">{row.original.name || t('unnamed-investment-company')}</div>
    <div className="gba:text-xs gba:text-muted-foreground">{row.original.code || t('no-code')}</div>
  </div>
)

const OwnerEmployeeCell = ({ row }: CellContext<InvestmentCompany, unknown>) => {
  if (!row.original.ownerEmployee) {
    return <span className="gba:text-sm gba:text-muted-foreground">No owner</span>
  }

  const ownerName = formatOwnerName(row.original)

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    const employeeId = row.original.ownerEmployee?.id
    if (employeeId) {
      navigateTo(`/platform/employee-record?employeeId=${employeeId}`)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
      data-testid={`owner-link-${row.original.id}`}
    >
      <Avatar className="gba:w-8 gba:h-8 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
        {row.original.ownerEmployee.pictureThumbnail && (
          <AvatarImage src={`data:image/gif;base64,${row.original.ownerEmployee.pictureThumbnail}`} alt={ownerName} />
        )}
        <AvatarFallback>{getOwnerInitials(ownerName)}</AvatarFallback>
      </Avatar>
      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors">
          {ownerName}
        </div>
      </div>
    </button>
  )
}

const OwnsPropertyCell = ({ row, t }: OwnsPropertyCellProps) => {
  const ownsProperty = row.original.ownsProperty === true

  return (
    <Badge variant={ownsProperty ? 'success' : 'secondary'} data-testid={`owns-property-badge-${row.original.id}`}>
      {ownsProperty ? t('yes-label') : t('no-label')}
    </Badge>
  )
}

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
    id: 'ownerEmployee',
    header: t('owner-column'),
    accessorKey: 'ownerEmployee.displayName',
    cell: OwnerEmployeeCell
  },
  {
    id: 'ownsProperty',
    header: t('owns-property-column'),
    accessorKey: 'ownsProperty',
    cell: cellContext => <OwnsPropertyCell {...cellContext} t={t} />
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
