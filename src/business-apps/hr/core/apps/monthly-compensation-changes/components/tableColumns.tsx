import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage, Badge } from '@newwork/nw-design-system'
import { GiftIcon, HeartIcon, TrendUpIcon } from '@phosphor-icons/react'
import type {
  ActiveBenefitRow,
  BenefitChangeRecord,
  BonusRecord,
  ChangeCategory,
  CompensationChangeRow,
  SalaryChangeRecord
} from '../types/compensationChanges.types'
import {
  formatCurrencyValue,
  formatDateShort,
  getInitials,
  statusBadgeVariant,
  translateStatusLabel
} from '../utils/formatUtils'

function categoryBadgeVariant(cat: ChangeCategory) {
  if (cat === 'salary') return 'default' as const
  if (cat === 'bonus') return 'success' as const
  return 'info' as const
}

function categoryIcon(cat: ChangeCategory) {
  if (cat === 'salary') return TrendUpIcon
  if (cat === 'bonus') return GiftIcon
  return HeartIcon
}

function renderEmployeeCell(employeeName: string, employeePicture?: string | null) {
  return (
    <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
      <Avatar size="sm">
        <AvatarImage src={employeePicture ?? undefined} alt={employeeName} />
        <AvatarFallback>{getInitials(employeeName)}</AvatarFallback>
      </Avatar>
      <span className="gba:block gba:max-w-[220px] gba:truncate gba:font-medium gba:text-sm" title={employeeName}>
        {employeeName}
      </span>
    </div>
  )
}

function getChangeAmountSortValue(row: CompensationChangeRow): number {
  if (row.category === 'salary') {
    return (row.raw as SalaryChangeRecord).monthlyGrossSalary ?? Number.NEGATIVE_INFINITY
  }
  if (row.category === 'bonus') {
    return (row.raw as BonusRecord).amount ?? Number.NEGATIVE_INFINITY
  }
  return (row.raw as BenefitChangeRecord).monthlyAmount ?? Number.NEGATIVE_INFINITY
}

export function buildChangeColumns(t: (key: string) => string, locale: string): ColumnDef<CompensationChangeRow>[] {
  return [
    {
      id: 'employee',
      accessorKey: 'employeeName',
      header: t('col-employee'),
      size: 260,
      maxSize: 320,
      cell: ({ row }) => renderEmployeeCell(row.original.employeeName, row.original.employeePicture)
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: t('col-type'),
      size: 170,
      maxSize: 200,
      cell: ({ row }) => {
        const Icon = categoryIcon(row.original.category)
        return (
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <Icon className="gba:size-3.5 gba:text-muted-foreground" />
            <Badge variant={categoryBadgeVariant(row.original.category)} size="sm">
              {t(`category-${row.original.category === 'salary' ? 'salary-change' : row.original.category}`)}
            </Badge>
          </div>
        )
      }
    },
    {
      id: 'date',
      accessorKey: 'date',
      header: t('col-date'),
      size: 150,
      maxSize: 170,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">{formatDateShort(row.original.date, locale)}</span>
      )
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: t('col-description'),
      size: 260,
      maxSize: 320,
      cell: ({ row }) => (
        <span className="gba:block gba:max-w-[240px] gba:truncate gba:text-sm" title={row.original.description}>
          {row.original.description}
        </span>
      )
    },
    {
      id: 'detail',
      accessorKey: 'detail',
      header: t('col-detail-reason'),
      size: 230,
      maxSize: 280,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:max-w-[200px] gba:block">
          {row.original.detail}
        </span>
      )
    },
    {
      id: 'amount',
      accessorFn: row => getChangeAmountSortValue(row),
      header: t('col-amount'),
      size: 170,
      maxSize: 190,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:font-medium gba:tabular-nums gba:whitespace-nowrap">
          {row.original.amount}
        </span>
      )
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('col-status'),
      size: 160,
      maxSize: 180,
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant(row.original.status)} size="sm">
          {translateStatusLabel(row.original.status, t)}
        </Badge>
      )
    }
  ]
}

export function buildBenefitColumns(t: (key: string) => string, locale: string): ColumnDef<ActiveBenefitRow>[] {
  return [
    {
      id: 'employee',
      accessorKey: 'employeeName',
      header: t('col-employee'),
      size: 250,
      maxSize: 300,
      cell: ({ row }) => renderEmployeeCell(row.original.employeeName, row.original.employeePicture)
    },
    {
      id: 'benefitType',
      accessorKey: 'benefitType',
      header: t('col-benefit-type'),
      size: 180,
      maxSize: 220,
      cell: ({ row }) => (
        <Badge variant="info" size="sm">
          {row.original.benefitType}
        </Badge>
      )
    },
    {
      id: 'provider',
      accessorKey: 'provider',
      header: t('col-provider'),
      size: 200,
      maxSize: 240,
      cell: ({ row }) => (
        <span className="gba:block gba:max-w-[180px] gba:truncate gba:text-sm" title={row.original.provider}>
          {row.original.provider}
        </span>
      )
    },
    {
      id: 'monthlyAmount',
      header: t('col-monthly-amount'),
      accessorFn: row => row.monthlyAmount,
      size: 170,
      maxSize: 190,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:font-medium gba:tabular-nums gba:whitespace-nowrap">
          {formatCurrencyValue(row.original.monthlyAmount, row.original.currency)}
        </span>
      )
    },
    {
      id: 'yearlyAmount',
      header: t('col-yearly-amount'),
      accessorFn: row => row.yearlyAmount,
      size: 170,
      maxSize: 190,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums gba:whitespace-nowrap">
          {formatCurrencyValue(row.original.yearlyAmount, row.original.currency)}
        </span>
      )
    },
    {
      id: 'employeeContribution',
      header: t('col-employee-contribution'),
      accessorFn: row => row.employeeContribution,
      size: 200,
      maxSize: 230,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums gba:whitespace-nowrap">
          {formatCurrencyValue(row.original.employeeContribution, row.original.currency)}
        </span>
      )
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: t('col-start-date'),
      size: 150,
      maxSize: 170,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">{formatDateShort(row.original.startDate, locale)}</span>
      )
    },
    {
      id: 'endDate',
      accessorKey: 'endDate',
      header: t('col-end-date'),
      size: 150,
      maxSize: 170,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">{formatDateShort(row.original.endDate, locale)}</span>
      )
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('col-status'),
      size: 150,
      maxSize: 170,
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant(row.original.status)} size="sm">
          {translateStatusLabel(row.original.status, t)}
        </Badge>
      )
    }
  ]
}
