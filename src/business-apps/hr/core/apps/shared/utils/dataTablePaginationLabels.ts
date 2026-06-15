import { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { DataTablePaginationLabels } from '@newwork/nw-design-system'
import translations from '../_i18n'

type Translate = (key: string, params?: Record<string, string>) => string

export function buildDataTablePaginationLabels(t: Translate): DataTablePaginationLabels {
  return {
    rowsPerPageAriaLabel: (pageSize, totalCount) =>
      t('table-pagination-rows-per-page-aria', {
        pageSize: String(pageSize),
        totalCount: String(totalCount)
      }),
    rowCount: totalCount => t('table-pagination-row-count', { totalCount: String(totalCount) }),
    pageButtonAriaLabel: page => t('table-pagination-page-button-aria', { page: String(page) }),
    firstPageAriaLabel: t('table-pagination-first-page-aria'),
    previousPageAriaLabel: t('table-pagination-previous-page-aria'),
    nextPageAriaLabel: t('table-pagination-next-page-aria'),
    lastPageAriaLabel: t('table-pagination-last-page-aria'),
    goToPage: t('table-pagination-go-to-page'),
    pagePlaceholder: t('table-pagination-page-placeholder'),
    goToPageInputAriaLabel: t('table-pagination-go-to-page-input-aria'),
    goToPageButtonAriaLabel: t('table-pagination-go-to-page-button-aria')
  }
}

export function useDataTablePaginationLabels(): DataTablePaginationLabels {
  const { t } = useTranslation(translations)

  return useMemo(() => buildDataTablePaginationLabels(t), [t])
}
