import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  Button
} from '@newwork/nw-design-system'
import { ColumnsIcon, EyeIcon, EyeClosedIcon } from '@phosphor-icons/react'
import { ColumnVisibilityConfig } from './DataController'

export interface DataControllerActionsProps {
  actions?: React.ReactNode | React.ReactNode[]
  addButton?: {
    onClick: () => void
    label: string
    icon?: React.ReactNode
    'data-testid'?: string
  }
  columnVisibility?: ColumnVisibilityConfig
}

function getNodeSignature(node: React.ReactNode): string {
  if (React.isValidElement(node)) {
    const anyEl: any = node as any
    const dataTestId = anyEl?.props?.['data-testid']
    const key = anyEl?.key != null ? String(anyEl.key) : ''
    const typeName = (anyEl?.type?.displayName || anyEl?.type?.name || 'type') as string
    return ['el', dataTestId || 'no-testid', key || 'no-key', typeName].join(':')
  }
  if (Array.isArray(node)) {
    return node.map(n => getNodeSignature(n)).join('|')
  }
  return typeof node + ':' + String(node)
}

function getActionsSignature(actions?: React.ReactNode | React.ReactNode[]): string {
  if (!actions) return 'none'
  if (Array.isArray(actions)) {
    return actions.map(a => getNodeSignature(a)).join('||')
  }
  return getNodeSignature(actions)
}

function getAddButtonSignature(addButton?: DataControllerActionsProps['addButton']): string {
  if (!addButton) return 'none'
  const id = addButton['data-testid'] || 'no-testid'
  return `${id}:${addButton.label}`
}

/**
 * Internal ColumnVisibilityDropdown component for DataController
 */
const ColumnVisibilityDropdown: React.FC<ColumnVisibilityConfig> = ({
  columns,
  onColumnVisibilityChange,
  'data-testid': dataTestId = 'column-visibility-dropdown'
}) => {
  const visibleCount = columns.filter(col => col.visible).length
  const totalCount = columns.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gba:flex gba:items-center gba:gap-2"
          data-testid={`${dataTestId}-trigger`}
        >
          <ColumnsIcon className="gba:h-4 gba:w-4" />
          <span className="gba:hidden sm:gba:inline">Columns</span>
          <span className="gba:text-xs gba:text-gray-500">
            ({visibleCount}/{totalCount})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="gba:w-56" data-testid={`${dataTestId}-content`}>
        <div className="gba:px-3 gba:py-2 gba:text-sm gba:font-medium gba:text-gray-700 gba:border-b">
          Toggle Columns
        </div>
        {columns.map(column => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.visible}
            disabled={column.disabled}
            onCheckedChange={checked => onColumnVisibilityChange(column.id, checked)}
            onSelect={event => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={event => {
              event.stopPropagation()
            }}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={`${dataTestId}-item-${column.id}`}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
              {column.visible ? (
                <EyeIcon className="gba:h-4 gba:w-4 gba:text-green-600" />
              ) : (
                <EyeClosedIcon className="gba:h-4 gba:w-4 gba:text-gray-400" />
              )}
              <span className={column.disabled ? 'gba:text-gray-400' : ''}>{column.label}</span>
              {column.disabled && <span className="gba:text-xs gba:text-gray-400 gba:ml-auto">(Required)</span>}
            </div>
          </DropdownMenuCheckboxItem>
        ))}
        <div className="gba:px-3 gba:py-2 gba:text-xs gba:text-gray-500 gba:border-t">
          {visibleCount} of {totalCount} columns visible
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const InnerDataControllerActions: React.FC<Readonly<DataControllerActionsProps>> = ({
  actions,
  addButton,
  columnVisibility
}) => {
  return (
    <div
      className="gba:flex gba:flex-row gba:items-center gba:gap-2 gba:w-full gba:justify-end"
      data-testid="data-controller-actions-section"
    >
      {addButton && (
        <button
          className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
          onClick={addButton.onClick}
          data-testid={addButton['data-testid'] || 'data-controller-add-button'}
          type="button"
        >
          <span className="gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:flex-none order-0 gba:grow-0">
            {addButton.icon}
          </span>
          <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-black gba:flex-none order-1 gba:grow-0">
            {addButton.label}
          </span>
        </button>
      )}
      {columnVisibility && (
        <div
          className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:h-8 gba:rounded gba:gap-1"
          data-testid="data-controller-column-visibility"
        >
          <ColumnVisibilityDropdown
            columns={columnVisibility.columns}
            onColumnVisibilityChange={columnVisibility.onColumnVisibilityChange}
            data-testid={columnVisibility['data-testid'] || 'data-controller-column-visibility-dropdown'}
          />
        </div>
      )}
      {actions &&
        (Array.isArray(actions) ? (
          actions.map((action, idx) => {
            let key: React.Key = idx
            if (React.isValidElement(action) && (action.props as any)?.['data-testid']) {
              key = (action.props as any)['data-testid']
            }
            return (
              <div
                key={key}
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:h-8 gba:rounded gba:gap-1"
                data-testid={`data-controller-action-${idx}`}
              >
                {action}
              </div>
            )
          })
        ) : (
          <div
            className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:h-8 gba:rounded gba:gap-1"
            data-testid="data-controller-single-action"
          >
            {actions}
          </div>
        ))}
    </div>
  )
}

function getColumnVisibilitySignature(columnVisibility?: ColumnVisibilityConfig): string {
  if (!columnVisibility) return 'none'
  const testId = columnVisibility['data-testid'] || 'no-testid'
  const columnsSignature = columnVisibility.columns
    .map(col => `${col.id}:${col.visible}:${col.disabled || false}`)
    .join(',')
  return `${testId}:${columnsSignature}`
}

export const DataControllerActions = React.memo(InnerDataControllerActions, (prev, next) => {
  const prevActionsSig = getActionsSignature(prev.actions)
  const nextActionsSig = getActionsSignature(next.actions)
  if (prevActionsSig !== nextActionsSig) return false

  const prevAddSig = getAddButtonSignature(prev.addButton)
  const nextAddSig = getAddButtonSignature(next.addButton)
  if (prevAddSig !== nextAddSig) return false

  const prevColumnVisSig = getColumnVisibilitySignature(prev.columnVisibility)
  const nextColumnVisSig = getColumnVisibilitySignature(next.columnVisibility)
  if (prevColumnVisSig !== nextColumnVisSig) return false

  return true
})

export default DataControllerActions
