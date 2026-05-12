import { useMemo, useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon
} from '@phosphor-icons/react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  DataDisplay,
  EmptyState,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useTranslation
} from '@newwork/nw-design-system'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import type { SetupSectionItem, SetupSectionSortOption } from '../utils/absenceSetup'
import { absenceTypeSetupIconMap } from '../utils/absenceTypeSetupIcons'
import translations from '../_i18n'

const isSupportedColorValue = (value: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim())

const compareSortValues = (
  leftValue: string | number | undefined,
  rightValue: string | number | undefined,
  desc: boolean
) => {
  const resolvedLeft = leftValue ?? ''
  const resolvedRight = rightValue ?? ''
  const result =
    typeof resolvedLeft === 'number' && typeof resolvedRight === 'number'
      ? resolvedLeft - resolvedRight
      : String(resolvedLeft).localeCompare(String(resolvedRight), undefined, { numeric: true, sensitivity: 'base' })
  return desc ? -result : result
}

interface ExtraColumn {
  header: string
  fieldLabel: string
  sortKey?: string
  /** When set, the table cell shows this sortValues key instead of the fields value. */
  tableValueKey?: string
}

interface SortState {
  id: string
  desc: boolean
}

const SortIcon = ({ columnId, sortState }: { columnId: string; sortState: SortState }) => {
  if (sortState.id !== columnId) return <ArrowsDownUpIcon className="gba:h-3 gba:w-3 gba:opacity-40" />
  return sortState.desc ? <ArrowDownIcon className="gba:h-3 gba:w-3" /> : <ArrowUpIcon className="gba:h-3 gba:w-3" />
}

interface AbsenceSetupTableProps {
  icon: typeof PhosphorIcon
  title: string
  description?: string
  addLabel: string
  editLabel: string
  deleteLabel: string
  loadingLabel: string
  emptyLabel: string
  errorTitle: string
  errorMessage?: string
  items: SetupSectionItem[]
  isLoading?: boolean
  onAdd: () => void
  sortOptions?: SetupSectionSortOption[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  addButtonTestId: string
  tableTestId: string
  showAddAction?: boolean
  showDeleteAction?: boolean
  showPriorityColumn?: boolean
  extraColumns?: ExtraColumn[]
  /** When set, rows are sorted and visually grouped by this sortValues key by default. */
  groupByKey?: string
}

const AbsenceSetupTable: React.FC<AbsenceSetupTableProps> = ({
  title,
  addLabel,
  editLabel,
  deleteLabel,
  loadingLabel,
  emptyLabel,
  errorTitle,
  errorMessage,
  items,
  isLoading = false,
  onAdd,
  sortOptions = [],
  onEdit,
  onDelete,
  tableTestId,
  showAddAction = true,
  showDeleteAction = true,
  showPriorityColumn = false,
  extraColumns = [],
  groupByKey
}) => {
  const { t } = useTranslation(translations)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortState, setSortState] = useState<SortState>(() => {
    if (groupByKey) return { id: groupByKey, desc: false }
    const first = sortOptions[0]
    return first ? { id: first.id, desc: first.direction === 'desc' } : { id: 'name', desc: false }
  })
  const [selectedItem, setSelectedItem] = useState<SetupSectionItem | null>(null)

  const handleHeaderSort = (columnId: string) => {
    setSortState(prev => (prev.id === columnId ? { id: columnId, desc: !prev.desc } : { id: columnId, desc: false }))
  }

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return [...items]
      .filter(item => {
        if (!term) return true
        const haystack = [item.title, item.description, item.searchText, item.sortText]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(term)
      })
      .sort((a, b) => {
        const aVal = a.sortValues?.[sortState.id] ?? a.sortText ?? a.title
        const bVal = b.sortValues?.[sortState.id] ?? b.sortText ?? b.title
        const result = compareSortValues(aVal, bVal, sortState.desc)
        if (result !== 0) return result
        return String(a.title).localeCompare(String(b.title), undefined, { numeric: true, sensitivity: 'base' })
      })
  }, [sortState, items, searchTerm])

  const renderIconColorBadges = (item: SetupSectionItem) => {
    const highlights = item.highlights ?? []
    const icon = highlights.find(h => h.display === 'icon')
    const color = highlights.find(h => h.display === 'color')

    const iconEl = (() => {
      if (!icon) return null
      const Icon = absenceTypeSetupIconMap[icon.value as keyof typeof absenceTypeSetupIconMap]
      if (!Icon) return null
      return <Icon className="gba:h-4 gba:w-4 gba:text-muted-foreground" aria-hidden="true" />
    })()

    const colorEl = (() => {
      if (!color || !isSupportedColorValue(color.value)) return null
      return (
        <svg className="gba:h-4 gba:w-4 gba:text-border gba:shrink-0" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1.5" y="1.5" width="13" height="13" rx="4" fill={color.value} stroke="currentColor" />
        </svg>
      )
    })()

    if (!iconEl && !colorEl) return null
    return (
      <div className="gba:flex gba:items-center gba:gap-1">
        {iconEl}
        {colorEl}
      </div>
    )
  }

  const renderPriority = (item: SetupSectionItem) => {
    const priorityHighlight = (item.highlights ?? []).find(h => h.display !== 'icon' && h.display !== 'color')
    if (!priorityHighlight?.value || priorityHighlight.value === t('details-empty-value')) {
      return <span className="gba:text-xs gba:text-muted-foreground">—</span>
    }
    return <span className="gba:text-sm gba:tabular-nums">{priorityHighlight.value}</span>
  }

  const primaryAction = showAddAction
    ? {
        label: addLabel,
        onClick: onAdd,
        icon: PlusIcon
      }
    : undefined

  return (
    <>
      <DataDisplay
        data-testid={tableTestId}
        searchValue={searchTerm}
        searchPlaceholder={t('section-search-placeholder', { entity: title })}
        onSearchChange={setSearchTerm}
        primaryAction={
          primaryAction && {
            ...primaryAction,
            onClick: () => {
              primaryAction.onClick()
            }
          }
        }
        toolbarDensity="default"
      >
        {isLoading && (
          <div
            className="gba:flex gba:min-h-32 gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:rounded-xl gba:border gba:border-dashed gba:border-border gba:bg-muted/20"
            data-testid={`${tableTestId}-loading`}
          >
            <Spinner />
            <p className="gba:text-sm gba:text-muted-foreground">{loadingLabel}</p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <Alert variant="destructive" data-testid={`${tableTestId}-error`}>
            <AlertTitle>{errorTitle}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !errorMessage && items.length === 0 && (
          <EmptyState
            title={title}
            description={emptyLabel}
            className="gba:min-h-40 gba:rounded-xl gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:py-10"
            data-testid={`${tableTestId}-empty`}
          />
        )}

        {!isLoading && !errorMessage && items.length > 0 && filteredItems.length === 0 && (
          <EmptyState
            title={t('section-no-results-title')}
            description={t('section-no-results-description')}
            className="gba:min-h-40 gba:rounded-xl gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:py-10"
            data-testid={`${tableTestId}-no-results`}
          />
        )}

        {!isLoading && !errorMessage && filteredItems.length > 0 && (
          <div className="gba:rounded-xl gba:border gba:border-border gba:overflow-hidden">
            <Table data-testid={`${tableTestId}-table`}>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="gba:cursor-pointer gba:select-none gba:whitespace-nowrap"
                    onClick={() => handleHeaderSort('code')}
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {t('details-label-code')} <SortIcon columnId="code" sortState={sortState} />
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:cursor-pointer gba:select-none gba:whitespace-nowrap"
                    onClick={() => handleHeaderSort('name')}
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {t('details-label-name')} <SortIcon columnId="name" sortState={sortState} />
                    </div>
                  </TableHead>
                  {showPriorityColumn && (
                    <TableHead
                      className="gba:cursor-pointer gba:select-none gba:whitespace-nowrap"
                      onClick={() => handleHeaderSort('priority')}
                    >
                      <div className="gba:flex gba:items-center gba:gap-1">
                        {t('details-label-priority')} <SortIcon columnId="priority" sortState={sortState} />
                      </div>
                    </TableHead>
                  )}
                  {extraColumns.map(col => {
                    const { sortKey } = col
                    return (
                      <TableHead
                        key={col.fieldLabel}
                        className={sortKey ? 'gba:cursor-pointer gba:select-none gba:whitespace-nowrap' : undefined}
                        onClick={sortKey ? () => handleHeaderSort(sortKey) : undefined}
                      >
                        {sortKey ? (
                          <div className="gba:flex gba:items-center gba:gap-1">
                            {col.header} <SortIcon columnId={sortKey} sortState={sortState} />
                          </div>
                        ) : (
                          col.header
                        )}
                      </TableHead>
                    )
                  })}
                  <TableHead>{t('details-label-status')}</TableHead>
                  <TableHead className="gba:w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow
                    key={item.id}
                    className="gba:cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                    data-testid={`${tableTestId}-row-${item.id}`}
                  >
                    {renderItemCells(item)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DataDisplay>

      <Sheet
        open={Boolean(selectedItem)}
        onOpenChange={open => {
          if (!open) setSelectedItem(null)
        }}
      >
        <SheetContent
          side="right"
          className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col"
        >
          {selectedItem && (
            <>
              <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                  <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">{selectedItem.title}</SheetTitle>
                  {selectedItem.statusLabel && <Badge variant="outline">{selectedItem.statusLabel}</Badge>}
                </div>
                {selectedItem.description && (
                  <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{selectedItem.description}</p>
                )}
              </SheetHeader>

              <div className="gba:flex-1 gba:overflow-hidden">
                <ScrollArea className="gba:h-full">
                  <div className="gba:px-6 gba:py-6 gba:space-y-3">
                    {(selectedItem.fields || []).map(field => (
                      <div
                        key={`${selectedItem.id}-${field.label}`}
                        className="gba:flex gba:flex-col gba:gap-1 gba:rounded-lg gba:bg-muted/30 gba:p-3"
                      >
                        <span className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                          {field.label}
                        </span>
                        <span className="gba:text-sm gba:text-foreground">
                          {field.value || t('details-empty-value')}
                        </span>
                      </div>
                    ))}

                    <div className="gba:flex gba:gap-2 gba:pt-3">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          onEdit(selectedItem.id)
                          setSelectedItem(null)
                        }}
                        disabled={selectedItem.canEdit === false}
                        data-testid={`${tableTestId}-sheet-edit-${selectedItem.id}`}
                      >
                        <PencilSimpleIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                        {editLabel}
                      </Button>
                      {showDeleteAction && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            onDelete(selectedItem.id)
                            setSelectedItem(null)
                          }}
                          disabled={selectedItem.canDelete === false}
                          data-testid={`${tableTestId}-sheet-delete-${selectedItem.id}`}
                        >
                          <TrashIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                          {deleteLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )

  function renderItemCells(item: SetupSectionItem) {
    return (
      <>
        <TableCell className="gba:text-muted-foreground">
          {(item.sortValues?.['code'] as string | undefined) ||
            item.fields?.find(f => f.label === t('details-label-code'))?.value ||
            '—'}
        </TableCell>
        <TableCell className="gba:font-medium">
          <div className="gba:flex gba:items-center gba:gap-2">
            {renderIconColorBadges(item)}
            {item.title}
          </div>
        </TableCell>
        {showPriorityColumn && <TableCell className="gba:text-muted-foreground">{renderPriority(item)}</TableCell>}
        {extraColumns.map(col => (
          <TableCell key={col.fieldLabel} className="gba:text-muted-foreground gba:max-w-[180px] gba:truncate">
            {col.tableValueKey
              ? (item.sortValues?.[col.tableValueKey] as string | undefined) || '—'
              : item.fields?.find(f => f.label === col.fieldLabel)?.value || '—'}
          </TableCell>
        ))}
        <TableCell>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1">
            {item.statusLabel && <Badge variant="outline">{item.statusLabel}</Badge>}
            {item.tags?.map(tag => (
              <Badge key={tag.label} variant={tag.variant ?? 'secondary'}>
                {tag.label}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell>
          <div className="gba:flex gba:items-center gba:justify-end gba:gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={e => {
                e.stopPropagation()
                onEdit(item.id)
              }}
              disabled={item.canEdit === false}
              data-testid={`${tableTestId}-edit-${item.id}`}
              aria-label={editLabel}
            >
              <PencilSimpleIcon className="gba:h-4 gba:w-4" />
            </Button>
            {showDeleteAction && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={e => {
                  e.stopPropagation()
                  onDelete(item.id)
                }}
                disabled={item.canDelete === false}
                data-testid={`${tableTestId}-delete-${item.id}`}
                aria-label={deleteLabel}
                className="gba:text-destructive gba:hover:text-destructive"
              >
                <TrashIcon className="gba:h-4 gba:w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </>
    )
  }
}

export default AbsenceSetupTable
