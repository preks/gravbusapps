import React, { useCallback, useRef } from 'react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface PaginationChangeParams {
  current: number
  pageSize: number
}

const scrollIntoView = (target: HTMLElement, behavior: ScrollBehavior) => {
  target.scrollIntoView({ block: 'start', inline: 'nearest', behavior })
}

const escapeForCssAttributeValue = (value: string): string => {
  const cssEscape = globalThis.CSS?.escape
  if (typeof cssEscape === 'function') {
    return cssEscape(value)
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch.codePointAt(0)?.toString(16)} `)
}

const buildDataTestIdSelector = (testId: string): string => `[data-testid=${escapeForCssAttributeValue(testId)}]`

const findElementByTestId = (testId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(buildDataTestIdSelector(testId))

const findElementByPrefix = (prefix: string): HTMLElement | null =>
  findElementByTestId(`${prefix}-container`) ?? findElementByTestId(`${prefix}-table`)

const findNearestTableAbove = (rootEl: HTMLElement): HTMLTableElement | null => {
  // Try previous siblings first (most common structure: table wrapper right before pagination).
  let sibling = rootEl.previousElementSibling as HTMLElement | null
  while (sibling) {
    const table = sibling.querySelector<HTMLTableElement>('table')
    if (table) return table
    sibling = sibling.previousElementSibling as HTMLElement | null
  }

  // Then walk up the DOM: first ancestor that contains a table.
  let parent = rootEl.parentElement as HTMLElement | null
  while (parent && parent !== document.body) {
    const table = parent.querySelector<HTMLTableElement>('table')
    if (table) return table
    parent = parent.parentElement as HTMLElement | null
  }

  return null
}

export interface TablePaginationProps {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (pagination: PaginationChangeParams) => void
  entityName?: string
  entityNamePlural?: string
  dataTestIdPrefix?: string
  className?: string
  showBorder?: boolean
  /**
   * Best-practice way to scroll: pass an explicit element ref that marks the top of the table.
   * If provided, this is used instead of DOM heuristics.
   */
  scrollTargetRef?: React.RefObject<HTMLElement | null>
  /**
   * Alternative to `scrollTargetRef`: provide the exact `data-testid` of the element to scroll to.
   * Useful when a ref isn't convenient.
   */
  scrollTargetTestId?: string
  /**
   * When changing pages, scroll the table back into view (top of table).
   * This avoids "random" scroll position after pagination.
   */
  scrollToTableTopOnChange?: boolean
  /** Scroll behavior used when snapping to the table. */
  scrollBehavior?: ScrollBehavior
}

const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  entityName,
  entityNamePlural,
  dataTestIdPrefix = 'table-pagination',
  className = '',
  showBorder = true,
  scrollTargetRef,
  scrollTargetTestId,
  scrollToTableTopOnChange = true,
  scrollBehavior = 'auto'
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null)

  const scrollTableIntoView = useCallback(() => {
    if (typeof document === 'undefined') return

    const explicitTarget = scrollTargetRef?.current ?? null
    const byExplicitTestId = scrollTargetTestId ? findElementByTestId(scrollTargetTestId) : null
    // Conventional scroll anchor used by tables: `${DATA_TEST_ID_PREFIX}-scroll-anchor`
    const byScrollAnchorTestId = dataTestIdPrefix ? findElementByTestId(`${dataTestIdPrefix}-scroll-anchor`) : null
    const byPrefix = dataTestIdPrefix ? findElementByPrefix(dataTestIdPrefix) : null
    const byDomHeuristics = rootRef.current ? findNearestTableAbove(rootRef.current) : null

    const target = explicitTarget ?? byExplicitTestId ?? byScrollAnchorTestId ?? byPrefix ?? byDomHeuristics
    if (!target) return

    scrollIntoView(target, scrollBehavior)
  }, [dataTestIdPrefix, scrollBehavior, scrollTargetRef, scrollTargetTestId])

  const handlePageChange = useCallback(
    (pagination: PaginationChangeParams) => {
      onPageChange(pagination)
      if (!scrollToTableTopOnChange) return

      // Defer to ensure the scroll happens after state updates/render.
      if (typeof globalThis.requestAnimationFrame === 'function') {
        globalThis.requestAnimationFrame(scrollTableIntoView)
      } else {
        scrollTableIntoView()
      }
    },
    [onPageChange, scrollToTableTopOnChange, scrollTableIntoView]
  )

  if (totalItems <= 0) {
    return null
  }

  const totalPages = Math.ceil(totalItems / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  // Determine entity label for display
  const getEntityLabel = () => {
    if (entityNamePlural) {
      return entityNamePlural
    }
    if (entityName) {
      return entityName
    }
    return getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_requests', 'Expense Requests')
  }

  const entityLabel = getEntityLabel()

  // Multi-page pagination (when totalItems > pageSize)
  if (totalItems > pageSize) {
    return (
      <div
        className={`gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 ${showBorder ? 'gba:border-t' : ''} ${className}`}
        data-testid={`${dataTestIdPrefix}-pagination`}
        ref={rootRef}
      >
        <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${dataTestIdPrefix}-pagination-info`}>
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.showing', 'Showing')}{' '}
          {`${startItem}-${endItem}`} {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')}{' '}
          {totalItems} {entityLabel}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <p className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page', 'Rows per page')}
            </p>
            <select
              value={pageSize}
              onChange={e => handlePageChange({ current: 1, pageSize: Number(e.target.value) })}
              className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              data-testid={`${dataTestIdPrefix}-page-size-select`}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div
            className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
            data-testid={`${dataTestIdPrefix}-page-info`}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} {currentPage}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalPages}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => handlePageChange({ current: 1, pageSize })}
              disabled={currentPage === 1}
              data-testid={`${dataTestIdPrefix}-first-page-button`}
            >
              <span className="gba:sr-only">Go to first page</span>⟪
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => handlePageChange({ current: currentPage - 1, pageSize })}
              disabled={currentPage === 1}
              data-testid={`${dataTestIdPrefix}-previous-page-button`}
            >
              <span className="gba:sr-only">Go to previous page</span>⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => handlePageChange({ current: currentPage + 1, pageSize })}
              disabled={currentPage >= totalPages}
              data-testid={`${dataTestIdPrefix}-next-page-button`}
            >
              <span className="gba:sr-only">Go to next page</span>⟩
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => handlePageChange({ current: totalPages, pageSize })}
              disabled={currentPage >= totalPages}
              data-testid={`${dataTestIdPrefix}-last-page-button`}
            >
              <span className="gba:sr-only">Go to last page</span>⟫
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Single page pagination (when totalItems <= pageSize but > 0)
  return (
    <div
      className={`gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 ${showBorder ? 'gba:border-t' : ''} ${className}`}
      data-testid={`${dataTestIdPrefix}-pagination-info-single-page`}
      ref={rootRef}
    >
      <div className="gba:text-sm gba:text-muted-foreground">{`${totalItems} ${entityLabel}`}</div>
      <div className="gba:flex gba:items-center gba:space-x-2">
        <p className="gba:text-sm gba:font-medium">
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page', 'Rows per page')}
        </p>
        <select
          value={pageSize}
          onChange={e => handlePageChange({ current: 1, pageSize: Number(e.target.value) })}
          className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
          data-testid={`${dataTestIdPrefix}-page-size-select-single`}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  )
}

export default TablePagination
