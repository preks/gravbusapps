import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { DotsThreeVerticalIcon } from '@phosphor-icons/react'
import { formatDate as formatPlatformDate } from '@/common/utils/windowUtils'
import { BudgetPlanStatusBadge } from '../shared/BudgetPlanStatusBadge'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import type { BudgetPlanStatusApi } from '../../../../types/budgetPlanGraphqlEnums'
import { formatBudgetPlanStatusLabelForDisplay, type TranslateFn } from './budgetSetupDisplayUtils'

/** Matches `buildBudgetSetupPlansTableColumns.tsx` (Budget setup table). */
const TABLE_HEADER_CLASS = 'gba:text-sm gba:font-medium gba:text-muted-foreground gba:leading-normal'
const TABLE_BODY = 'gba:text-sm gba:font-normal gba:text-foreground gba:leading-normal'
const TABLE_BODY_NUM = `${TABLE_BODY} gba:tabular-nums`
/**
 * Sortable `SortingHeader` in nw-design-system applies inner `px-2` on top of `th` `px-2`, so header labels
 * start 0.5rem further in than raw `td` `p-2` content. Match that inset so body lines up with headers.
 */
const TABLE_BODY_CELL = `${TABLE_BODY} gba:block gba:w-full gba:text-left gba:pl-2`
const TABLE_BODY_NUM_CELL = `${TABLE_BODY_NUM} gba:block gba:w-full gba:text-left gba:pl-2`

const LEFT_TEXT_COLUMN_META = { align: 'left' as const, type: 'text' as const }

function columnHeader(t: TranslateFn, messageKey: string) {
  return function OverviewPlansColumnHeader() {
    return <span className={TABLE_HEADER_CLASS}>{t(messageKey)}</span>
  }
}

function formatPlanDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return formatPlatformDate(dateStr, 'date.short') ?? '—'
}

function sortTimestamp(iso: string | null | undefined): number {
  if (!iso) return 0
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? 0 : ms
}

export function buildOverviewPlansTableColumns(
  t: TranslateFn,
  onEditPlan: (plan: CompensationBudgetPlanRow) => void
): ColumnDef<CompensationBudgetPlanRow>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: columnHeader(t, 'overview-plans-col-name'),
      meta: LEFT_TEXT_COLUMN_META,
      cell: ({ row }) => <span className={TABLE_BODY_CELL}>{row.original.name}</span>
    },
    {
      id: 'budgetPlanStatus',
      accessorKey: 'budgetPlanStatus',
      header: columnHeader(t, 'overview-plans-col-status'),
      meta: LEFT_TEXT_COLUMN_META,
      sortingFn: (a, b) => {
        const la = formatBudgetPlanStatusLabelForDisplay(a.original.budgetPlanStatus, t)
        const lb = formatBudgetPlanStatusLabelForDisplay(b.original.budgetPlanStatus, t)
        return la.localeCompare(lb)
      },
      cell: ({ row }) => (
        <div className="gba:flex gba:min-w-0 gba:w-full gba:justify-start gba:text-left gba:pl-2">
          <BudgetPlanStatusBadge status={row.original.budgetPlanStatus as BudgetPlanStatusApi} />
        </div>
      )
    },
    {
      id: 'startDate',
      accessorFn: row => sortTimestamp(row.startDate),
      header: columnHeader(t, 'overview-plans-col-start'),
      meta: LEFT_TEXT_COLUMN_META,
      cell: ({ row }) => <span className={TABLE_BODY_NUM_CELL}>{formatPlanDate(row.original.startDate)}</span>
    },
    {
      id: 'endDate',
      accessorFn: row => sortTimestamp(row.endDate),
      header: columnHeader(t, 'overview-plans-col-end'),
      meta: LEFT_TEXT_COLUMN_META,
      cell: ({ row }) => <span className={TABLE_BODY_NUM_CELL}>{formatPlanDate(row.original.endDate)}</span>
    },
    {
      id: 'effectiveDate',
      accessorFn: row => sortTimestamp(row.original.effectiveDate),
      header: columnHeader(t, 'overview-plans-col-effective'),
      meta: LEFT_TEXT_COLUMN_META,
      cell: ({ row }) => <span className={TABLE_BODY_NUM_CELL}>{formatPlanDate(row.original.effectiveDate)}</span>
    },
    {
      id: 'actions',
      header: () => null,
      meta: { align: 'right' as const, type: 'text' as const },
      enableSorting: false,
      cell: ({ row }) => (
        <div className="gba:flex gba:w-full gba:justify-end gba:pr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={event => event.stopPropagation()}
                data-testid={`overview-plans-row-actions-${row.original.id}`}
                aria-label={t('compensation-planning-row-menu-aria-label')}
              >
                <DotsThreeVerticalIcon className="gba:size-4" weight="bold" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={event => {
                  event.stopPropagation()
                  onEditPlan(row.original)
                }}
                data-testid={`overview-plans-row-edit-${row.original.id}`}
              >
                {t('compensation-planning-action-edit')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ]
}

export const OVERVIEW_PLANS_VISIBLE_COLUMN_IDS = [
  'name',
  'budgetPlanStatus',
  'startDate',
  'endDate',
  'effectiveDate',
  'actions'
] as const
