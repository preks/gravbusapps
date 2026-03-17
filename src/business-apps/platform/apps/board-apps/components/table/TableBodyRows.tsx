/**
 * TableBodyRows - renders table body rows with inline editing, context menus,
 * row-page icons, and expandable flow sub-rows.
 */

import React from 'react'
import { toast, Badge, Spinner, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Plus, FileText, FilePlus, ChevronRight, ChevronDown, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BoardRow, BoardColumn } from '../../types'
import type { FlowSubRow } from '../../hooks/useFlowExpandableRows'
import { RelationPicker } from '../RelationPicker'
import { CellRenderer } from './CellRenderer'
import { CellEditor } from './CellEditor'
import { CellContextMenu } from './CellContextMenu'

export interface TableBodyRowsProps {
  boardId: string
  sheetId: string
  displayRows: BoardRow[]
  totalRows: number
  columns: BoardColumn[]
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
  onAddRow?: () => void
  isFlowExpanded?: (rowId: string) => boolean
  getFlowSubRows?: (rowId: string) => { isLoading: boolean; subRows: FlowSubRow[] } | undefined
  onToggleFlowExpand?: (row: BoardRow) => void
  peopleLookup?: Map<string, import('../../types/columns').SelectOption>
  reorderEnabled?: boolean
  onMoveRow?: (rowId: string, afterRowId: string | null, beforeRowId: string | null) => void
  testId: string
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

interface MemoizedRowProps {
  row: BoardRow
  rowIndex: number
  boardId: string
  sheetId: string
  columns: BoardColumn[]
  isHighlighted: boolean
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
  expanded: boolean
  hasFlowId: boolean
  subRowState?: { isLoading: boolean; subRows: FlowSubRow[] }
  onToggleFlowExpand?: (row: BoardRow) => void
  peopleLookup?: Map<string, import('../../types/columns').SelectOption>
  reorderEnabled?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  testId: string
}

const MemoizedRow = React.memo<MemoizedRowProps>(
  ({
    row,
    rowIndex,
    boardId,
    sheetId,
    columns,
    isHighlighted,
    selectedCell,
    editingCell,
    editInitialKey,
    onCellClick,
    onStartEdit,
    onUpdateCell,
    onDeleteRow,
    onRowClick,
    onSaveEdit,
    onCancelEdit,
    onMoveNext,
    expanded,
    hasFlowId,
    subRowState,
    onToggleFlowExpand,
    peopleLookup,
    reorderEnabled,
    onMoveUp,
    onMoveDown,
    testId
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: row.id,
      disabled: !reorderEnabled
    })

    const sortableStyle: React.CSSProperties = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : undefined
    }

    return (
      <React.Fragment>
        <tr
          ref={setNodeRef}
          style={sortableStyle}
          className={`gba:transition-colors gba:group ${
            isHighlighted ? 'gba:bg-primary/10 gba:animate-pulse' : 'gba:hover:bg-muted/20'
          }`}
          data-testid={`${testId}-row-${row.id}`}
        >
          {reorderEnabled && (
            <td className="gba:w-7 gba:p-0 gba:border-0 gba:bg-transparent gba:align-middle">
              <button
                type="button"
                className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full gba:py-1.5 gba:cursor-grab gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:text-muted-foreground gba:hover:text-foreground active:gba:cursor-grabbing"
                {...attributes}
                {...listeners}
                data-testid={`${testId}-grip-${row.id}`}
              >
                <GripVertical className="gba:w-3.5 gba:h-3.5" />
              </button>
            </td>
          )}
          {columns.map((col, colIndex) => {
            const isEditing = editingCell?.rowId === row.id && editingCell?.colName === col.name
            const isSelected = selectedCell?.rowId === row.id && selectedCell?.colName === col.name && !isEditing

            return (
              <CellContextMenu
                key={col.id || col.name}
                value={row.data[col.name]}
                onEdit={() => onStartEdit(row.id, col.name, row.data[col.name])}
                onClear={onUpdateCell ? () => void onUpdateCell(row.id, col.name, null) : () => {}}
                onOpenRowPage={onRowClick ? () => onRowClick(row) : undefined}
                onDeleteRow={onDeleteRow ? () => onDeleteRow(row.id) : undefined}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                data-testid={`${testId}-ctx-${row.id}-${col.name}`}
              >
                <td
                  className={`gba:px-2.5 gba:py-1.5 gba:border-b gba:border-r gba:truncate gba:w-40 ${
                    isSelected ? 'gba:ring-2 gba:ring-primary gba:ring-inset gba:bg-primary/5' : ''
                  } ${onUpdateCell ? 'gba:cursor-cell' : ''}`}
                  onClick={() => onCellClick(rowIndex, colIndex)}
                  data-testid={`${testId}-cell-${row.id}-${col.name}`}
                >
                  {isEditing ? (
                    col.type === 'relation' && col.relationConfig && onUpdateCell ? (
                      <RelationPicker
                        config={col.relationConfig}
                        selectedIds={
                          Array.isArray(row.data[col.name])
                            ? ((row.data[col.name] as unknown[]).filter(x => typeof x === 'string') as string[])
                            : []
                        }
                        onChange={async (ids, labels, statuses) => {
                          try {
                            await onUpdateCell(row.id, col.name, ids, {
                              [`_rel_${col.name}`]: labels,
                              [`_rel_${col.name}_status`]: statuses
                            })
                          } catch {
                            toast.error('Failed to save')
                          }
                          onCancelEdit()
                        }}
                        data-testid={`${testId}-relation-${row.id}-${col.name}`}
                      />
                    ) : (
                      <CellEditor
                        column={col}
                        value={row.data[col.name]}
                        initialKey={editInitialKey}
                        boardId={boardId}
                        sheetId={sheetId}
                        onSave={async newValue => {
                          if (col.type === 'people' && col.selectOptions?.length) {
                            const label = col.selectOptions.find(o => o.value === String(newValue))?.label
                            onSaveEdit(
                              row.id,
                              col.name,
                              newValue,
                              label ? { [`_people_${col.name}`]: label } : undefined
                            )
                          } else {
                            onSaveEdit(row.id, col.name, newValue)
                          }
                        }}
                        onCancel={onCancelEdit}
                        onMoveNext={onMoveNext}
                      />
                    )
                  ) : (
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {colIndex === 0 && hasFlowId && onToggleFlowExpand && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            onToggleFlowExpand(row)
                          }}
                          className="gba:flex-shrink-0 gba:p-0.5 gba:rounded gba:hover:bg-muted/60 gba:transition-colors gba:mr-0.5"
                          data-testid={`${testId}-expand-${row.id}`}
                        >
                          {expanded ? (
                            <ChevronDown className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                          ) : (
                            <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <span className={`gba:flex-1 gba:truncate ${colIndex === 0 ? 'gba:font-medium' : ''}`}>
                        {isUserColumn(col.name) && typeof row.data[col.name] === 'string' && row.data[col.name] ? (
                          <UserDisplay
                            userId={row.data[col.name] as string}
                            lookup={peopleLookup}
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
                      {colIndex === 0 && onRowClick && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            onRowClick(row)
                          }}
                          className="gba:flex-shrink-0 gba:p-0.5 gba:rounded gba:hover:bg-muted/60 gba:transition-colors"
                          data-testid={`${testId}-open-row-${row.id}`}
                        >
                          {(row.data as Record<string, unknown>)._rowPage ? (
                            <FileText className="gba:w-3.5 gba:h-3.5 gba:text-primary/60 gba:hover:text-primary" />
                          ) : (
                            <FilePlus className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/30 gba:hover:text-primary" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </CellContextMenu>
            )
          })}
        </tr>

        {expanded &&
          subRowState &&
          (subRowState.isLoading ? (
            <tr data-testid={`${testId}-subrows-loading-${row.id}`}>
              <td
                colSpan={columns.length + (reorderEnabled ? 1 : 0)}
                className="gba:px-4 gba:py-2 gba:border-b gba:bg-muted/10"
              >
                <div className="gba:flex gba:items-center gba:gap-2 gba:pl-6">
                  <Spinner size="sm" />
                  <span className="gba:text-xs gba:text-muted-foreground">Loading steps...</span>
                </div>
              </td>
            </tr>
          ) : subRowState.subRows.length === 0 ? (
            <tr data-testid={`${testId}-subrows-empty-${row.id}`}>
              <td
                colSpan={columns.length + (reorderEnabled ? 1 : 0)}
                className="gba:px-4 gba:py-2 gba:border-b gba:bg-muted/10"
              >
                <span className="gba:text-xs gba:text-muted-foreground gba:pl-6">No steps found</span>
              </td>
            </tr>
          ) : (
            subRowState.subRows.map(sub => (
              <tr
                key={sub.id}
                className="gba:bg-muted/10 gba:hover:bg-muted/20 gba:transition-colors"
                data-testid={`${testId}-subrow-${sub.id}`}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={col.id || col.name}
                    className="gba:px-2.5 gba:py-1.5 gba:border-b gba:border-r gba:truncate gba:w-40"
                  >
                    {colIndex === 0 ? (
                      <div className="gba:flex gba:items-center gba:gap-1.5 gba:pl-7">
                        <div className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-border gba:flex-shrink-0" />
                        <span className="gba:text-xs gba:text-foreground gba:truncate">{sub.step.title}</span>
                        <Badge
                          variant={stepStatusBadgeVariant(sub.step.status)}
                          className="gba:text-[9px] gba:flex-shrink-0"
                        >
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
          ))}
      </React.Fragment>
    )
  },
  (prev, next) => {
    if (prev.row.id !== next.row.id) return false
    if (prev.row.data !== next.row.data) return false
    if (prev.isHighlighted !== next.isHighlighted) return false
    if (prev.expanded !== next.expanded) return false
    if (prev.rowIndex !== next.rowIndex) return false
    const prevSelRow = prev.selectedCell?.rowId === prev.row.id
    const nextSelRow = next.selectedCell?.rowId === next.row.id
    if (prevSelRow !== nextSelRow) return false
    if (prevSelRow && nextSelRow && prev.selectedCell?.colName !== next.selectedCell?.colName) return false
    const prevEditRow = prev.editingCell?.rowId === prev.row.id
    const nextEditRow = next.editingCell?.rowId === next.row.id
    if (prevEditRow !== nextEditRow) return false
    if (prevEditRow && nextEditRow && prev.editingCell?.colName !== next.editingCell?.colName) return false
    if (prev.columns !== next.columns) return false
    if (prev.reorderEnabled !== next.reorderEnabled) return false
    return true
  }
)

MemoizedRow.displayName = 'MemoizedRow'

export const TableBodyRows: React.FC<TableBodyRowsProps> = ({
  boardId,
  sheetId,
  displayRows,
  totalRows,
  columns,
  activeHighlight,
  selectedCell,
  editingCell,
  editInitialKey,
  onCellClick,
  onStartEdit,
  onUpdateCell,
  onDeleteRow,
  onRowClick,
  onSaveEdit,
  onCancelEdit,
  onMoveNext,
  onAddRow,
  isFlowExpanded,
  getFlowSubRows,
  onToggleFlowExpand,
  peopleLookup,
  reorderEnabled,
  onMoveRow,
  testId
}) => {
  const colSpan = columns.length + (reorderEnabled ? 1 : 0)

  return (
    <tbody>
      {displayRows.map((row, rowIndex) => {
        const hasFlowId = Boolean(row.data.flowId && typeof row.data.flowId === 'string')
        const expanded = (hasFlowId && isFlowExpanded?.(row.id)) || false
        const subRowState = expanded ? getFlowSubRows?.(row.id) : undefined

        const handleMoveUp =
          reorderEnabled && onMoveRow && rowIndex > 0
            ? () => {
                const afterId = rowIndex >= 2 ? displayRows[rowIndex - 2].id : null
                const beforeId = displayRows[rowIndex - 1].id
                onMoveRow(row.id, afterId, beforeId)
              }
            : undefined

        const handleMoveDown =
          reorderEnabled && onMoveRow && rowIndex < displayRows.length - 1
            ? () => {
                const afterId = displayRows[rowIndex + 1].id
                const beforeId = rowIndex + 2 < displayRows.length ? displayRows[rowIndex + 2].id : null
                onMoveRow(row.id, afterId, beforeId)
              }
            : undefined

        return (
          <MemoizedRow
            key={row.id}
            row={row}
            rowIndex={rowIndex}
            boardId={boardId}
            sheetId={sheetId}
            columns={columns}
            isHighlighted={activeHighlight === row.id}
            selectedCell={selectedCell}
            editingCell={editingCell}
            editInitialKey={editInitialKey}
            onCellClick={onCellClick}
            onStartEdit={onStartEdit}
            onUpdateCell={onUpdateCell}
            onDeleteRow={onDeleteRow}
            onRowClick={onRowClick}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onMoveNext={onMoveNext}
            expanded={expanded}
            hasFlowId={hasFlowId}
            subRowState={subRowState}
            onToggleFlowExpand={onToggleFlowExpand}
            peopleLookup={peopleLookup}
            reorderEnabled={reorderEnabled}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            testId={testId}
          />
        )
      })}

      {onAddRow && (
        <tr>
          <td colSpan={colSpan} className="gba:px-2.5 gba:py-1 gba:border-b">
            <button
              onClick={onAddRow}
              className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:py-0.5"
              data-testid={`${testId}-quick-add`}
            >
              <Plus className="gba:w-3 gba:h-3" /> New row
            </button>
          </td>
        </tr>
      )}

      {displayRows.length === 0 && (
        <tr>
          <td colSpan={colSpan} className="gba:px-4 gba:py-8 gba:text-center gba:text-muted-foreground">
            {totalRows > 0 ? 'No rows match the current filters.' : 'No rows yet.'}
          </td>
        </tr>
      )}
    </tbody>
  )
}

type PeopleLookup = Map<string, import('../../types/columns').SelectOption>

const USER_COLUMNS = new Set(['initiatedby', 'assignedto', 'assignee', 'claimedby'])

function isUserColumn(colName: string): boolean {
  return USER_COLUMNS.has(colName.toLowerCase().replace(/[\s_-]+/g, ''))
}

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

  if (n === 'progress') {
    return <>{step.status === 'COMPLETED' ? '100%' : step.status === 'IN_PROGRESS' ? 'In progress' : ''}</>
  }

  if (n.includes('start')) {
    return <>{step.startedAt ? new Date(step.startedAt).toLocaleDateString() : ''}</>
  }

  if (n.includes('complete') || n.includes('end') || n.includes('done') || n.includes('update')) {
    return <>{step.completedAt ? new Date(step.completedAt).toLocaleDateString() : ''}</>
  }

  if (n.includes('due')) {
    return <>{step.dueDate ? new Date(step.dueDate).toLocaleDateString() : ''}</>
  }

  if (n === 'type') return <>{step.type}</>
  if (n === 'priority' || n === 'isoverdue') return null

  return null
}
