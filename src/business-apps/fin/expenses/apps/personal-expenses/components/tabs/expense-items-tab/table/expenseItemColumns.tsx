import React from 'react'
import type { CellContext, ColumnDef } from '@tanstack/react-table'
import { Checkbox, Badge } from '@newwork/nw-design-system'
import { FileTextIcon, ImageIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'
import { formatCurrencyDisplay, getExpenseItemStatusDisplayT } from '../../../../utils'

export const EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX = 'ExpenseItemsTable'

function ExpenseItemsTableSelectAllHeader({
  items,
  selectedRowKeys,
  onSelectAll
}: Readonly<{
  items: ExpenseItem[] | undefined
  selectedRowKeys: React.Key[]
  onSelectAll: (checked: boolean) => void
}>) {
  const itemCount = items?.length ?? 0
  const allSelected = itemCount > 0 && (items ?? []).every(item => selectedRowKeys.includes(item.id))
  return (
    <Checkbox
      checked={allSelected}
      onCheckedChange={checked => onSelectAll(checked === true)}
      data-testid={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-select-all-checkbox`}
    />
  )
}

function ExpenseItemSelectionCell({
  record,
  isSelected,
  onCheckedChange
}: Readonly<{
  record: ExpenseItem
  isSelected: boolean
  onCheckedChange: (id: string, checked: boolean) => void
}>) {
  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={checked => onCheckedChange(record.id, checked === true)}
      onClick={e => e.stopPropagation()}
      data-testid={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-selection-checkbox-${record.id}`}
    />
  )
}

function ExpenseItemTitleCell({ record }: Readonly<{ record: ExpenseItem }>) {
  return (
    <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="expense-title-cell">
      {record.title}
    </div>
  )
}

function ExpenseItemExpenseDateCell({ record }: Readonly<{ record: ExpenseItem }>) {
  if (!record.expenseDate) {
    return <span className="gba:text-sm gba:text-muted-foreground">N/A</span>
  }
  let formatted: string
  try {
    formatted = formatDate(record.expenseDate, 'date.short') || 'N/A'
  } catch {
    formatted = 'N/A'
  }
  return (
    <div className="gba:text-sm gba:truncate" data-testid="expense-expense-date-cell">
      {formatted}
    </div>
  )
}

function ExpenseItemStatusCell({ record, t }: Readonly<{ record: ExpenseItem; t: (key: string) => string }>) {
  const statusConf = getExpenseItemStatusDisplayT(t, record.status)
  return (
    <Badge variant={statusConf.badgeVariant || 'outline'} data-testid="expense-status-cell">
      {statusConf.label}
    </Badge>
  )
}

function ExpenseItemAttachmentCell({ record }: Readonly<{ record: ExpenseItem }>) {
  const hasFiles = record.expenseItemFile && record.expenseItemFile.length > 0
  return (
    <div className="gba:flex gba:items-center gba:justify-center">
      {hasFiles ? (
        <FileTextIcon size={24} className="gba:text-blue-500" />
      ) : (
        <ImageIcon size={24} className="gba:text-gray-300" />
      )}
    </div>
  )
}

function ExpenseItemReimbursableAmountCell({ record }: Readonly<{ record: ExpenseItem }>) {
  return (
    <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate" data-testid="expense-amount-cell">
      {formatCurrencyDisplay(record.reimbursableAmount ?? 0, record.currency?.code)}
    </div>
  )
}

function renderItemTitleCell(info: CellContext<ExpenseItem, unknown>) {
  return <ExpenseItemTitleCell record={info.row.original} />
}
function renderItemExpenseDateCell(info: CellContext<ExpenseItem, unknown>) {
  return <ExpenseItemExpenseDateCell record={info.row.original} />
}
function renderItemAttachmentCell(info: CellContext<ExpenseItem, unknown>) {
  return <ExpenseItemAttachmentCell record={info.row.original} />
}
function renderItemReimbursableAmountCell(info: CellContext<ExpenseItem, unknown>) {
  return <ExpenseItemReimbursableAmountCell record={info.row.original} />
}

export interface CreateExpenseItemColumnsParams {
  items: ExpenseItem[] | undefined
  selectedRowKeys: React.Key[]
  onSelectAll: (checked: boolean) => void
  onRowSelectionChange: (id: string, checked: boolean) => void
  expenseDateLabel: string
  t: (key: string) => string
}

export function createExpenseItemColumns({
  items,
  selectedRowKeys,
  onSelectAll,
  onRowSelectionChange,
  expenseDateLabel,
  t
}: CreateExpenseItemColumnsParams): ColumnDef<ExpenseItem>[] {
  const renderItemStatusCell = (info: CellContext<ExpenseItem, unknown>) => (
    <ExpenseItemStatusCell record={info.row.original} t={t} />
  )

  return [
    {
      id: 'selection',
      size: 40,
      header: () => (
        <ExpenseItemsTableSelectAllHeader items={items} selectedRowKeys={selectedRowKeys} onSelectAll={onSelectAll} />
      ),
      cell: ({ row }) => (
        <ExpenseItemSelectionCell
          record={row.original}
          isSelected={selectedRowKeys.includes(row.original.id)}
          onCheckedChange={onRowSelectionChange}
        />
      )
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: t('expense-items-column-title'),
      size: 200,
      cell: renderItemTitleCell
    },
    {
      id: 'expenseDate',
      accessorKey: 'expenseDate',
      header: expenseDateLabel,
      size: 120,
      cell: renderItemExpenseDateCell
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('expense-items-column-status'),
      size: 100,
      cell: renderItemStatusCell
    },
    {
      id: 'attachment',
      accessorFn: (row: ExpenseItem) => row.expenseItemFile?.length ?? 0,
      header: t('expense-items-column-attachment'),
      enableSorting: false,
      size: 80,
      cell: renderItemAttachmentCell
    },
    {
      id: 'reimbursableAmount',
      accessorKey: 'reimbursableAmount',
      sortDescFirst: false,
      header: t('expense-items-column-reimbursable'),
      size: 140,
      meta: { align: 'right' as const },
      cell: renderItemReimbursableAmountCell
    }
  ]
}
