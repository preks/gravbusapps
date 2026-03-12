import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { SuccessSectionCardHeader } from './SuccessSectionCardHeader'
import { SuccessEmptyState, SuccessErrorState } from './SuccessStates'

type TableMode = 'card' | 'dialog'

export interface SuccessPaginatedTableColumn<T> {
  id: string
  label: string
  align?: 'left' | 'right'
  render: (item: T, mode: TableMode) => React.ReactNode
  hideInCard?: boolean
  hideInDialog?: boolean
}

export interface SuccessPaginatedTableAction<T> {
  id: string
  label: string
  onClick: (item: T) => void
  disabled?: (item: T) => boolean
}

interface SuccessPaginatedTableCardProps<T> {
  cardId?: string
  title: string
  description: string
  emptyDescription: string
  emptyIcon: React.ReactNode
  items: T[]
  rowKey: (item: T) => string
  columns: SuccessPaginatedTableColumn<T>[]
  actions?: SuccessPaginatedTableAction<T>[]
  isLoading?: boolean
  error?: Error | null
  pageSize?: number
  dialogPageSize?: number
  footerNote?: React.ReactNode
  detailTitle?: string
  detailDescription?: string
  detailButtonLabel?: string
  dialogWidthClassName?: string
  'data-testid'?: string
}

const getVisibleColumns = <T,>(columns: SuccessPaginatedTableColumn<T>[], mode: TableMode) =>
  columns.filter(column => (mode === 'card' ? !column.hideInCard : !column.hideInDialog))

const getPagedRows = <T,>(items: T[], page: number, pageSize: number) => {
  const start = page * pageSize
  return items.slice(start, start + pageSize)
}

export function SuccessPaginatedTableCard<T>({
  cardId,
  title,
  description,
  emptyDescription,
  emptyIcon,
  items,
  rowKey,
  columns,
  actions = [],
  isLoading = false,
  error,
  pageSize = 5,
  dialogPageSize = 10,
  footerNote,
  detailTitle,
  detailDescription,
  detailButtonLabel,
  dialogWidthClassName = 'gba:max-w-6xl',
  'data-testid': testId = 'success-paginated-table-card'
}: SuccessPaginatedTableCardProps<T>) {
  const { t } = useTranslation(translations)
  const [page, setPage] = useState(0)
  const [dialogPage, setDialogPage] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const totalDialogPages = Math.max(1, Math.ceil(items.length / dialogPageSize))
  const visibleCardColumns = useMemo(() => getVisibleColumns(columns, 'card'), [columns])
  const visibleDialogColumns = useMemo(() => getVisibleColumns(columns, 'dialog'), [columns])
  const pagedItems = useMemo(() => getPagedRows(items, page, pageSize), [items, page, pageSize])
  const pagedDialogItems = useMemo(
    () => getPagedRows(items, dialogPage, dialogPageSize),
    [items, dialogPage, dialogPageSize]
  )
  const resolvedDetailTitle = detailTitle || title
  const resolvedDetailDescription = detailDescription || description
  const resolvedDetailButtonLabel = detailButtonLabel || t('action-view-details')

  useEffect(() => {
    setPage(currentPage => Math.min(currentPage, Math.max(0, totalPages - 1)))
  }, [totalPages])

  useEffect(() => {
    setDialogPage(currentPage => Math.min(currentPage, Math.max(0, totalDialogPages - 1)))
  }, [totalDialogPages])

  const renderTable = (rows: T[], tableColumns: SuccessPaginatedTableColumn<T>[], mode: TableMode) => (
    <div className="gba:overflow-x-auto">
      <table className="gba:w-full gba:border-collapse">
        <thead>
          <tr className="gba:border-b gba:border-border">
            {tableColumns.map(column => (
              <th
                key={`${mode}-${column.id}`}
                className={`gba:p-3 gba:text-sm gba:font-medium ${
                  column.align === 'right' ? 'gba:text-right' : 'gba:text-left'
                }`}
              >
                {column.label}
              </th>
            ))}
            {actions.length ? (
              <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('action-view-details')}</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map(item => (
            <tr key={rowKey(item)} className="gba:border-b gba:border-border/60">
              {tableColumns.map(column => (
                <td
                  key={`${mode}-${rowKey(item)}-${column.id}`}
                  className={`gba:p-3 gba:text-sm ${
                    column.align === 'right' ? 'gba:text-right' : 'gba:text-left'
                  } gba:text-foreground`}
                >
                  {column.render(item, mode)}
                </td>
              ))}
              {actions.length ? (
                <td className="gba:p-3">
                  <div className="gba:flex gba:justify-end gba:gap-2">
                    {actions.map(action => (
                      <Button
                        key={`${rowKey(item)}-${action.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => action.onClick(item)}
                        disabled={action.disabled?.(item)}
                        data-testid={`${testId}-${mode}-action-${action.id}-${rowKey(item)}`}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderPager = (
    currentPage: number,
    totalPageCount: number,
    currentPageSize: number,
    onPrevious: () => void,
    onNext: () => void,
    showDetailButton: boolean
  ) => {
    const start = items.length ? currentPage * currentPageSize + 1 : 0
    const end = Math.min(items.length, (currentPage + 1) * currentPageSize)

    return (
      <div className="gba:flex gba:flex-col gba:gap-3 gba:border-t gba:border-border gba:pt-4 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between">
        <div className="gba:flex gba:flex-col gba:gap-1">
          <span className="gba:text-sm gba:text-muted-foreground">{`${start}-${end} / ${items.length}`}</span>
          <span className="gba:text-xs gba:text-muted-foreground">
            {t('overview-page')} {currentPage + 1} {t('overview-of')} {totalPageCount}
          </span>
        </div>
        <div className="gba:flex gba:flex-wrap gba:justify-end gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={currentPage === 0}
            data-testid={`${testId}-pager-previous`}
          >
            {t('action-previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={currentPage >= totalPageCount - 1}
            data-testid={`${testId}-pager-next`}
          >
            {t('action-next')}
          </Button>
          {showDetailButton ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailsOpen(true)}
              data-testid={`${testId}-details-open`}
            >
              {resolvedDetailButtonLabel}
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <>
      <Card className="gba:border-border gba:bg-card gba:h-full" id={cardId} data-testid={testId}>
        <SuccessSectionCardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </SuccessSectionCardHeader>
        <CardContent className="gba:flex gba:h-full gba:flex-col gba:gap-4 gba:p-5">
          {isLoading ? (
            <div className="gba:flex gba:min-h-40 gba:items-center gba:justify-center gba:text-sm gba:text-muted-foreground">
              {t('state-loading')}
            </div>
          ) : error ? (
            <SuccessErrorState title={t('state-error-title')} message={error.message} data-testid={`${testId}-error`} />
          ) : !items.length ? (
            <SuccessEmptyState
              title={t('state-empty')}
              description={emptyDescription}
              icon={emptyIcon}
              data-testid={`${testId}-empty`}
            />
          ) : (
            <>
              {renderTable(pagedItems, visibleCardColumns, 'card')}
              {footerNote}
              {renderPager(
                page,
                totalPages,
                pageSize,
                () => setPage(currentPage => Math.max(0, currentPage - 1)),
                () => setPage(currentPage => Math.min(totalPages - 1, currentPage + 1)),
                items.length > 0
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className={dialogWidthClassName} data-testid={`${testId}-details-dialog`}>
          <DialogHeader>
            <DialogTitle>{resolvedDetailTitle}</DialogTitle>
            <DialogDescription>{resolvedDetailDescription}</DialogDescription>
          </DialogHeader>

          {!items.length ? (
            <SuccessEmptyState title={t('state-empty')} description={emptyDescription} icon={emptyIcon} />
          ) : (
            <div className="gba:flex gba:flex-col gba:gap-4">
              {renderTable(pagedDialogItems, visibleDialogColumns, 'dialog')}
              {footerNote}
              {renderPager(
                dialogPage,
                totalDialogPages,
                dialogPageSize,
                () => setDialogPage(currentPage => Math.max(0, currentPage - 1)),
                () => setDialogPage(currentPage => Math.min(totalDialogPages - 1, currentPage + 1)),
                false
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)} data-testid={`${testId}-details-close`}>
              {t('action-back')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
