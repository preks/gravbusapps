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
    <div className="gba:flex gba:items-center gba:gap-2">
      <Avatar size="sm">
        <AvatarImage src={employeePicture ?? undefined} alt={employeeName} />
        <AvatarFallback>{getInitials(employeeName)}</AvatarFallback>
      </Avatar>
      <span className="gba:font-medium gba:text-sm">{employeeName}</span>
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
      cell: ({ row }) => renderEmployeeCell(row.original.employeeName, row.original.employeePicture)
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: t('col-type'),
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
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">{formatDateShort(row.original.date, locale)}</span>
      )
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: t('col-description'),
      cell: ({ row }) => <span className="gba:text-sm">{row.original.description}</span>
    },
    {
      id: 'detail',
      accessorKey: 'detail',
      header: t('col-detail-reason'),
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
      cell: ({ row }) => <span className="gba:text-sm gba:font-medium gba:tabular-nums">{row.original.amount}</span>
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('col-status'),
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
      cell: ({ row }) => renderEmployeeCell(row.original.employeeName, row.original.employeePicture)
    },
    {
      id: 'benefitType',
      accessorKey: 'benefitType',
      header: t('col-benefit-type'),
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
      cell: ({ row }) => <span className="gba:text-sm">{row.original.provider}</span>
    },
    {
      id: 'monthlyAmount',
      header: t('col-monthly-amount'),
      accessorFn: row => row.monthlyAmount,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:font-medium gba:tabular-nums">
          {formatCurrencyValue(row.original.monthlyAmount, row.original.currency)}
        </span>
      )
    },
    {
      id: 'yearlyAmount',
      header: t('col-yearly-amount'),
      accessorFn: row => row.yearlyAmount,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">
          {formatCurrencyValue(row.original.yearlyAmount, row.original.currency)}
        </span>
      )
    },
    {
      id: 'employeeContribution',
      header: t('col-employee-contribution'),
      accessorFn: row => row.employeeContribution,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">
          {formatCurrencyValue(row.original.employeeContribution, row.original.currency)}
        </span>
      )
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: t('col-start-date'),
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">{formatDateShort(row.original.startDate, locale)}</span>
      )
    },
    {
      id: 'endDate',
      accessorKey: 'endDate',
      header: t('col-end-date'),
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">{formatDateShort(row.original.endDate, locale)}</span>
      )
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('col-status'),
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant(row.original.status)} size="sm">
          {translateStatusLabel(row.original.status, t)}
        </Badge>
      )
    }
  ]
}
