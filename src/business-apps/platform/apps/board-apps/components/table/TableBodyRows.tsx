/**
 * TableBodyRows – row-level rendering extracted for use with react-virtuoso's
 * TableVirtuoso.  Exports:
 *   • VirtuosoContext  – shared context type
 *   • VirtuosoTableRow – custom <tr> with useSortable (dnd-kit), highlight, sub-rows
 *   • renderRowCells   – itemContent callback (returns <td> children)
 */

import React from 'react'
import { toast, Badge, Spinner, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { FileText, FilePlus, ChevronRight, ChevronDown, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BoardRow, BoardColumn } from '../../types'
import type { FlowSubRow } from '../../hooks/useFlowExpandableRows'
import { RelationPicker } from '../RelationPicker'
import { CellRenderer } from './CellRenderer'
import { CellEditor } from './CellEditor'
import { CellContextMenu } from './CellContextMenu'

export interface VirtuosoContext {
  columns: BoardColumn[]
  boardId: string
  sheetId: string
  reorderEnabled: boolean
  activeHighlight: string | null
  selectedCell: { rowId: string; colName: string } | null
  editingCell: { rowId: string; colName: string } | null
  editInitialKey?: string
  onCellClick: (rowIndex: number, colIndex: number) => void
  onStartEdit: (rowId: string, colName: string, currentValue: unknown, initial?: string) => void
  onUpdateCell?: (
    rowId: string,
    columnName: string,
    value: unknown,
    extraData?: Record<string, unknown>
  ) => Promise<void>
  onDeleteRow?: (rowId: string) => void
  onRowClick?: (row: BoardRow) => void
  onSaveEdit: (rowId: string, colName: string, newValue: unknown, extraData?: Record<string, unknown>) => void
  onCancelEdit: () => void
  onMoveNext: () => void
  onMoveRow?: (rowId: string, afterRowId: string | null, beforeRowId: string | null) => void
  displayRows: BoardRow[]
  hasFlowRows: boolean
  isFlowExpanded?: (rowId: string) => boolean
  getFlowSubRows?: (rowId: string) => { isLoading: boolean; subRows: FlowSubRow[] } | undefined
  onToggleFlowExpand?: (row: BoardRow) => void
  peopleLookup?: Map<string, import('../../types/columns').SelectOption>
  focusedCells?: Map<string, { userId: string; userName: string; userColor: string }>
  testId: string
  onAddRow?: () => void
}

// ── Sortable handle context (passes useSortable listeners to the grip button) ─

const SortableHandleCtx = React.createContext<{
  attributes: Record<string, unknown>
  listeners: Record<string, unknown> | undefined
} | null>(null)

// ── VirtuosoTableRow ────────────────────────────────────────────────────────

export const VirtuosoTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { context?: VirtuosoContext; 'data-item-index'?: number; item?: BoardRow }
>(({ children, context: ctx, style, item, ...props }, ref) => {
  const row = item ?? ctx?.displayRows?.[props['data-item-index'] ?? -1]

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row?.id ?? '__noop',
    disabled: !row || !ctx?.reorderEnabled
  })

  if (!row || !ctx)
    return (
      <tr ref={ref} style={style} {...props}>
        {children}
      </tr>
    )

  const assignRef = (node: HTMLTableRowElement | null) => {
    setNodeRef(node)
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as React.MutableRefObject<HTMLTableRowElement | null>).current = node
  }

  const isHighlighted = ctx.activeHighlight === row.id
  const sortableStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined
  }

  const expanded = ctx.hasFlowRows && ctx.isFlowExpanded?.(row.id)
  const subState = expanded ? ctx.getFlowSubRows?.(row.id) : undefined
  const colSpan = ctx.columns.length + (ctx.reorderEnabled ? 1 : 0)

  return (
    <>
      <SortableHandleCtx.Provider value={{ attributes, listeners }}>
        <tr
          ref={assignRef}
          style={sortableStyle}
          className={`gba:transition-colors gba:group ${isHighlighted ? 'gba:bg-primary/10 gba:animate-pulse' : 'gba:hover:bg-muted/20'}`}
          data-testid={`${ctx.testId}-row-${row.id}`}
          {...props}
        >
          {children}
        </tr>
      </SortableHandleCtx.Provider>
      {expanded &&
        subState &&
        renderSubRows(subState, ctx.columns, colSpan, ctx.testId, row.id, ctx.reorderEnabled, ctx.peopleLookup)}
    </>
  )
})
VirtuosoTableRow.displayName = 'VirtuosoTableRow'

// ── Drag handle (reads sortable listeners from context) ─────────────────────

function DragHandle({ testId, rowId }: { testId: string; rowId: string }) {
  const sortable = React.useContext(SortableHandleCtx)
  return (
    <td className="gba:w-7 gba:p-0 gba:border-0 gba:bg-transparent gba:align-middle">
      <button
        type="button"
        className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full gba:py-1.5 gba:cursor-grab gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:text-muted-foreground gba:hover:text-foreground active:gba:cursor-grabbing"
        data-testid={`${testId}-grip-${rowId}`}
        {...(sortable?.attributes as any)}
        {...(sortable?.listeners as any)}
      >
        <GripVertical className="gba:w-3.5 gba:h-3.5" />
      </button>
    </td>
  )
}

// ── itemContent callback ────────────────────────────────────────────────────

export function renderRowCells(index: number, row: BoardRow, ctx: VirtuosoContext): React.ReactNode {
  const hasFlowId = Boolean(row.data.flowId && typeof row.data.flowId === 'string')

  const moveUp =
    ctx.reorderEnabled && ctx.onMoveRow && index > 0
      ? () => {
          const afterId = index >= 2 ? ctx.displayRows[index - 2].id : null
          const beforeId = ctx.displayRows[index - 1].id
          ctx.onMoveRow!(row.id, afterId, beforeId)
        }
      : undefined
  const moveDown =
    ctx.reorderEnabled && ctx.onMoveRow && index < ctx.displayRows.length - 1
      ? () => {
          const afterId = ctx.displayRows[index + 1].id
          const beforeId = index + 2 < ctx.displayRows.length ? ctx.displayRows[index + 2].id : null
          ctx.onMoveRow!(row.id, afterId, beforeId)
        }
      : undefined

  return (
    <>
      {ctx.reorderEnabled && <DragHandle testId={ctx.testId} rowId={row.id} />}
      {ctx.columns.map((col, colIndex) => {
        const isEditing = ctx.editingCell?.rowId === row.id && ctx.editingCell?.colName === col.name
        const isSelected = ctx.selectedCell?.rowId === row.id && ctx.selectedCell?.colName === col.name && !isEditing
        const presence = ctx.focusedCells?.get(`${row.id}:${col.name}`)

        return (
          <CellContextMenu
            key={col.id || col.name}
            value={row.data[col.name]}
            onEdit={() => ctx.onStartEdit(row.id, col.name, row.data[col.name])}
            onClear={ctx.onUpdateCell ? () => void ctx.onUpdateCell!(row.id, col.name, null) : () => {}}
            onOpenRowPage={ctx.onRowClick ? () => ctx.onRowClick!(row) : undefined}
            onDeleteRow={ctx.onDeleteRow ? () => ctx.onDeleteRow!(row.id) : undefined}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            data-testid={`${ctx.testId}-ctx-${row.id}-${col.name}`}
          >
            <td
              className={`gba:px-2.5 gba:py-1.5 gba:border-b gba:border-r gba:w-40 gba:relative ${
                presence ? 'gba:overflow-visible' : 'gba:truncate'
              } ${isSelected ? 'gba:ring-2 gba:ring-primary gba:ring-inset gba:bg-primary/5' : ''} ${
                presence ? 'gba:ring-2 gba:ring-inset' : ''
              } ${ctx.onUpdateCell ? 'gba:cursor-cell' : ''}`}
              style={presence ? ({ '--tw-ring-color': presence.userColor } as React.CSSProperties) : undefined}
              onClick={() => ctx.onCellClick(index, colIndex)}
              data-testid={`${ctx.testId}-cell-${row.id}-${col.name}`}
            >
              {presence && (
                <span
                  className="gba:absolute gba:-top-2.5 gba:left-1 gba:text-[10px] gba:leading-none gba:px-1 gba:py-0.5 gba:rounded gba:text-white gba:whitespace-nowrap gba:z-[9999] gba:pointer-events-none"
                  style={{ backgroundColor: presence.userColor }}
                >
                  {presence.userName}
                </span>
              )}
              {isEditing ? (
                <EditingContent row={row} col={col} ctx={ctx} />
              ) : (
                <DisplayContent row={row} col={col} colIndex={colIndex} hasFlowId={hasFlowId} ctx={ctx} />
              )}
            </td>
          </CellContextMenu>
        )
      })}
    </>
  )
}

// ── Cell content helpers ────────────────────────────────────────────────────

function EditingContent({ row, col, ctx }: { row: BoardRow; col: BoardColumn; ctx: VirtuosoContext }) {
  if (col.type === 'relation' && col.relationConfig && ctx.onUpdateCell) {
    return (
      <RelationPicker
        config={col.relationConfig}
        selectedIds={
          Array.isArray(row.data[col.name])
            ? ((row.data[col.name] as unknown[]).filter(x => typeof x === 'string') as string[])
            : []
        }
        onChange={async (ids, labels, statuses) => {
          try {
            await ctx.onUpdateCell!(row.id, col.name, ids, {
              [`_rel_${col.name}`]: labels,
              [`_rel_${col.name}_status`]: statuses
            })
          } catch {
            toast.error('Failed to save')
          }
          ctx.onCancelEdit()
        }}
        data-testid={`${ctx.testId}-relation-${row.id}-${col.name}`}
      />
    )
  }
  return (
    <CellEditor
      column={col}
      value={row.data[col.name]}
      initialKey={ctx.editInitialKey}
      boardId={ctx.boardId}
      sheetId={ctx.sheetId}
      onSave={async newValue => {
        if (col.type === 'people' && col.selectOptions?.length) {
          const label = col.selectOptions.find(o => o.value === String(newValue))?.label
          ctx.onSaveEdit(row.id, col.name, newValue, label ? { [`_people_${col.name}`]: label } : undefined)
        } else {
          ctx.onSaveEdit(row.id, col.name, newValue)
        }
      }}
      onCancel={ctx.onCancelEdit}
      onMoveNext={ctx.onMoveNext}
    />
  )
}

const USER_COLUMNS = new Set(['initiatedby', 'assignedto', 'assignee', 'claimedby'])

function DisplayContent({
  row,
  col,
  colIndex,
  hasFlowId,
  ctx
}: {
  row: BoardRow
  col: BoardColumn
  colIndex: number
  hasFlowId: boolean
  ctx: VirtuosoContext
}) {
  const expanded = hasFlowId && ctx.isFlowExpanded?.(row.id)
  return (
    <div className="gba:flex gba:items-center gba:gap-1 gba:w-full gba:overflow-hidden">
      {colIndex === 0 && hasFlowId && ctx.onToggleFlowExpand && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            ctx.onToggleFlowExpand!(row)
          }}
          className="gba:flex-shrink-0 gba:p-0.5 gba:rounded gba:hover:bg-muted/60 gba:transition-colors gba:mr-0.5"
          data-testid={`${ctx.testId}-expand-${row.id}`}
        >
          {expanded ? (
            <ChevronDown className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
          ) : (
            <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
          )}
        </button>
      )}
      <span className={`gba:flex-1 gba:truncate ${colIndex === 0 ? 'gba:font-medium' : ''}`}>
        {USER_COLUMNS.has(col.name.toLowerCase().replace(/[\s_-]+/g, '')) &&
        typeof row.data[col.name] === 'string' &&
        row.data[col.name] ? (
          <UserDisplay
            userId={row.data[col.name] as string}
            lookup={ctx.peopleLookup}
            fallbackId={row.data[`${col.name}Id`] as string | undefined}
          />
        ) : (
          <CellRenderer
            value={row.data[col.name]}
            type={col.type}
            columnName={col.name}
            options={col.selectOptions}
            isPrimary={!!col.isPrimary}
            rowData={row.data}
            relationConfig={col.relationConfig}
          />
        )}
      </span>
      {colIndex === 0 && ctx.onRowClick && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            ctx.onRowClick!(row)
          }}
          className="gba:flex-shrink-0 gba:p-0.5 gba:rounded gba:hover:bg-muted/60 gba:transition-colors"
          data-testid={`${ctx.testId}-open-row-${row.id}`}
        >
          {(row.data as Record<string, unknown>)._rowPage ? (
            <FileText className="gba:w-3.5 gba:h-3.5 gba:text-primary/60 gba:hover:text-primary" />
          ) : (
            <FilePlus className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/30 gba:hover:text-primary" />
          )}
        </button>
      )}
    </div>
  )
}

// ── Sub-rows (flow expansion) ───────────────────────────────────────────────

type PeopleLookup = Map<string, import('../../types/columns').SelectOption>

function renderSubRows(
  subState: { isLoading: boolean; subRows: FlowSubRow[] },
  columns: BoardColumn[],
  colSpan: number,
  testId: string,
  parentId: string,
  reorderEnabled: boolean,
  peopleLookup?: PeopleLookup
) {
  if (subState.isLoading) {
    return (
      <tr data-testid={`${testId}-subrows-loading-${parentId}`}>
        <td colSpan={colSpan} className="gba:px-4 gba:py-2 gba:border-b gba:bg-muted/10">
          <div className="gba:flex gba:items-center gba:gap-2 gba:pl-6">
            <Spinner size="sm" />
            <span className="gba:text-xs gba:text-muted-foreground">Loading steps...</span>
          </div>
        </td>
      </tr>
    )
  }
  if (subState.subRows.length === 0) {
    return (
      <tr data-testid={`${testId}-subrows-empty-${parentId}`}>
        <td colSpan={colSpan} className="gba:px-4 gba:py-2 gba:border-b gba:bg-muted/10">
          <span className="gba:text-xs gba:text-muted-foreground gba:pl-6">No steps found</span>
        </td>
      </tr>
    )
  }
  return subState.subRows.map(sub => (
    <tr
      key={sub.id}
      className="gba:bg-muted/10 gba:hover:bg-muted/20 gba:transition-colors"
      data-testid={`${testId}-subrow-${sub.id}`}
    >
      {reorderEnabled && <td className="gba:w-7 gba:p-0 gba:border-0" />}
      {columns.map((col, ci) => (
        <td key={col.id || col.name} className="gba:px-2.5 gba:py-1.5 gba:border-b gba:border-r gba:truncate gba:w-40">
          {ci === 0 ? (
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:pl-7">
              <div className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-border gba:flex-shrink-0" />
              <span className="gba:text-xs gba:text-foreground gba:truncate">{sub.step.title}</span>
              <Badge variant={stepStatusBadgeVariant(sub.step.status)} className="gba:text-[9px] gba:flex-shrink-0">
                {sub.step.status}
              </Badge>
            </div>
          ) : (
            <span className="gba:text-xs gba:text-muted-foreground gba:truncate">
              <SubRowCellValue col={col} step={sub.step} peopleLookup={peopleLookup} />
            </span>
          )}
        </td>
      ))}
    </tr>
  ))
}

function stepStatusBadgeVariant(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'success' as const
    case 'IN_PROGRESS':
    case 'ASSIGNED':
    case 'CLAIMED':
      return 'info' as const
    case 'FAILED':
    case 'TIMED_OUT':
      return 'destructive' as const
    default:
      return 'secondary' as const
  }
}

// ── Shared display helpers ──────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function UserDisplay({
  userId,
  lookup,
  fallbackId,
  size = 'sm'
}: {
  userId: string
  lookup?: PeopleLookup
  fallbackId?: string
  size?: 'sm' | 'xs'
}) {
  const entry = lookup?.get(userId) ?? (fallbackId ? lookup?.get(fallbackId) : undefined)
  const displayName = entry?.label ?? userId
  const rawAvatar = entry?.avatarUrl
  const avatarUrl = rawAvatar
    ? rawAvatar.startsWith('data:')
      ? rawAvatar
      : `data:image/png;base64,${rawAvatar}`
    : undefined
  const sizeClass = size === 'xs' ? 'gba:h-4 gba:w-4' : 'gba:h-5 gba:w-5'
  const textSize = size === 'xs' ? 'gba:text-[7px]' : 'gba:text-[8px]'
  const nameSize = size === 'xs' ? 'gba:text-[10px]' : 'gba:text-xs'

  return (
    <span className="gba:flex gba:items-center gba:gap-1 gba:truncate">
      <Avatar size="sm" className={`gba:flex-shrink-0 ${sizeClass}`}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
        <AvatarFallback className={textSize}>{getInitials(displayName)}</AvatarFallback>
      </Avatar>
      <span className={`${nameSize} gba:truncate`}>{displayName}</span>
    </span>
  )
}

function SubRowCellValue({
  col,
  step,
  peopleLookup
}: {
  col: BoardColumn
  step: import('../../services/flowEngine').FlowProgressStep
  peopleLookup?: PeopleLookup
}) {
  const n = col.name.toLowerCase().replace(/[\s_-]+/g, '')
  if (n === 'status') return <>{step.status}</>
  if (n === 'assignedto' || n === 'assignee' || n === 'initiatedby' || n === 'claimedby') {
    const userId = step.claimedBy ?? step.assignedTo
    if (!userId) return null
    return <UserDisplay userId={userId} lookup={peopleLookup} size="xs" />
  }
  if (n === 'progress')
    return <>{step.status === 'COMPLETED' ? '100%' : step.status === 'IN_PROGRESS' ? 'In progress' : ''}</>
  if (n.includes('start')) return <>{step.startedAt ? new Date(step.startedAt).toLocaleDateString() : ''}</>
  if (n.includes('complete') || n.includes('end') || n.includes('done') || n.includes('update'))
    return <>{step.completedAt ? new Date(step.completedAt).toLocaleDateString() : ''}</>
  if (n.includes('due')) return <>{step.dueDate ? new Date(step.dueDate).toLocaleDateString() : ''}</>
  if (n === 'type') return <>{step.type}</>
  if (n === 'priority' || n === 'isoverdue') return null
  return null
}
