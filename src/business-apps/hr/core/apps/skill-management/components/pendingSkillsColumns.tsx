import { Badge, Button } from '@newwork/nw-design-system'
import { CheckIcon, XIcon } from '@phosphor-icons/react'
import { Column, ColumnDef } from '@tanstack/react-table'
import type { EmployeeSkillRecord } from '../types'

export type PendingSkillAction = 'approve' | 'reject'

export interface PendingSkillActionState {
  skill: EmployeeSkillRecord
  action: PendingSkillAction
}

export function getSkillName(skill: EmployeeSkillRecord): string {
  return skill.skill?.name || '-'
}

export function getEmployeeName(skill: EmployeeSkillRecord): string {
  const firstName = skill.employee.firstName ?? ''
  const lastName = skill.employee.lastName ?? ''
  const fullName = `${firstName} ${lastName}`.trim()

  return skill.employee.displayName || fullName || '-'
}

function SortableTextHeader<TData>({
  column,
  children
}: Readonly<{ column: Column<TData>; children: React.ReactNode }>) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
    >
      {children}
    </Button>
  )
}

function renderSkillNameCell(skill: EmployeeSkillRecord) {
  const title = getSkillName(skill)
  return (
    <span className="gba:block gba:max-w-[260px] gba:truncate gba:font-semibold" title={title}>
      {title}
    </span>
  )
}

function renderEmployeeCell(skill: EmployeeSkillRecord) {
  const employeeName = getEmployeeName(skill)
  return (
    <span className="gba:block gba:max-w-[220px] gba:truncate gba:text-sm" title={employeeName}>
      {employeeName}
    </span>
  )
}

function renderDateRequestedCell(date?: string | null) {
  return date ? (
    <span className="gba:text-sm gba:whitespace-nowrap">{new Date(date).toLocaleDateString()}</span>
  ) : (
    <span className="gba:text-muted-foreground">—</span>
  )
}

function renderPendingActionsCell(
  skill: EmployeeSkillRecord,
  prefixDataTestId: string | undefined,
  onStartAction: (skill: EmployeeSkillRecord, action: PendingSkillAction) => void,
  isApprovalLoading: boolean,
  t: (key: string) => string
) {
  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Button
        size="sm"
        variant="outline"
        className="gba:hover:bg-accent gba:hover:text-accent-foreground"
        onClick={() => onStartAction(skill, 'approve')}
        disabled={isApprovalLoading}
        data-testid={`${prefixDataTestId}-approve-${skill.id}`}
      >
        <CheckIcon className="gba:h-4 gba:w-4 gba:mr-1" />
        {t('pending-approve')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gba:text-destructive gba:hover:bg-destructive/10 gba:hover:text-destructive"
        onClick={() => onStartAction(skill, 'reject')}
        disabled={isApprovalLoading}
        data-testid={`${prefixDataTestId}-reject-${skill.id}`}
      >
        <XIcon className="gba:h-4 gba:w-4 gba:mr-1" />
        {t('pending-reject')}
      </Button>
    </div>
  )
}

export function buildPendingSkillsColumns(
  t: (key: string, options?: Record<string, string>) => string,
  prefixDataTestId: string | undefined,
  onStartAction: (skill: EmployeeSkillRecord, action: PendingSkillAction) => void,
  isApprovalLoading: boolean
): ColumnDef<EmployeeSkillRecord>[] {
  return [
    {
      id: 'skillName',
      accessorFn: row => getSkillName(row),
      header: ({ column }) => <SortableTextHeader column={column}>{t('pending-skill-name')}</SortableTextHeader>,
      enableSorting: true,
      size: 240,
      maxSize: 300,
      cell: ({ row }) => renderSkillNameCell(row.original)
    },
    {
      id: 'requestedBy',
      header: t('pending-requested-by'),
      enableSorting: false,
      size: 280,
      maxSize: 340,
      cell: ({ row }) => renderEmployeeCell(row.original)
    },
    {
      id: 'dateRequested',
      accessorFn: row => row.createdAt ?? null,
      header: ({ column }) => <SortableTextHeader column={column}>{t('pending-date')}</SortableTextHeader>,
      enableSorting: true,
      size: 150,
      maxSize: 170,
      cell: ({ getValue }) => renderDateRequestedCell(getValue() as string | null)
    },
    {
      id: 'status',
      header: t('pending-status'),
      enableSorting: false,
      size: 140,
      maxSize: 160,
      cell: () => (
        <Badge variant="outline" className="gba:text-orange-600 gba:border-orange-300">
          {t('pending-status-pending')}
        </Badge>
      )
    },
    {
      id: 'actions',
      header: t('pending-actions'),
      enableSorting: false,
      size: 210,
      maxSize: 240,
      cell: ({ row }) => renderPendingActionsCell(row.original, prefixDataTestId, onStartAction, isApprovalLoading, t)
    }
  ]
}
