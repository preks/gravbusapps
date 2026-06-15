import { useMemo, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DataTable,
  Spinner,
  TooltipProvider,
  useTranslation
} from '@newwork/nw-design-system'
import { CaretDownIcon } from '@phosphor-icons/react'
import { useDataTablePaginationLabels } from '@/business-apps/hr/core/apps/shared/utils/dataTablePaginationLabels'

import translations from '../../../../_i18n'
import type { CompensationAnalysisRun } from '../../../../types/compensationAnalysisRun.types'
import { buildCompensationAnalysisRunsTableColumns } from './compensationAnalysisRunsTableColumns'

interface CompensationAnalysisRunsCardProps {
  runs: CompensationAnalysisRun[]
  loading: boolean
  error: string | null
  onRetry: () => void
  prefixDataTestId?: string
}

export function CompensationAnalysisRunsCard({
  runs,
  loading,
  error,
  onRetry,
  prefixDataTestId = 'Compensation'
}: Readonly<CompensationAnalysisRunsCardProps>) {
  const { t } = useTranslation(translations)
  const paginationLabels = useDataTablePaginationLabels()
  const [open, setOpen] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'requestedAt', desc: true }])

  const columns = useMemo(() => buildCompensationAnalysisRunsTableColumns(t), [t])

  return (
    <Card data-testid={`${prefixDataTestId}-analysis-runs-card`} className="gba:shadow-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="gba:pb-0">
          <CollapsibleTrigger
            className="gba:flex gba:w-full gba:items-center gba:justify-between gba:rounded-md gba:p-1 gba:text-left hover:gba:bg-muted/50"
            data-testid={`${prefixDataTestId}-analysis-runs-toggle`}
          >
            <div>
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
                {t('compensation-analysis-runs-title')}
              </h3>
              <p className="gba:text-sm gba:text-muted-foreground">{t('compensation-analysis-runs-description')}</p>
            </div>
            <CaretDownIcon
              className={`gba:h-4 gba:w-4 gba:shrink-0 gba:transition-transform ${open ? 'gba:rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="gba:pt-4">
            {loading && (
              <div
                className="gba:flex gba:min-h-32 gba:items-center gba:justify-center"
                data-testid={`${prefixDataTestId}-analysis-runs-loading`}
              >
                <Spinner />
              </div>
            )}
            {!loading && error && (
              <div
                className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:min-h-32"
                data-testid={`${prefixDataTestId}-analysis-runs-error`}
              >
                <p className="gba:text-sm gba:text-destructive">{t('compensation-analysis-runs-error')}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  data-testid={`${prefixDataTestId}-analysis-runs-retry`}
                >
                  {t('common-retry')}
                </Button>
              </div>
            )}
            {!loading && !error && (
              <TooltipProvider>
                <DataTable<CompensationAnalysisRun>
                  data={runs}
                  columns={columns}
                  loading={loading}
                  sorting={sorting}
                  onSortingChange={setSorting}
                  enableSorting
                  enablePagination
                  enableSelection={false}
                  enableResizing={false}
                  tableLayout="auto"
                  rowsPerPageOptions={[10, 20, 50]}
                  showPageNumbers
                  maxVisiblePages={5}
                  paginationLabels={paginationLabels}
                  emptyMessage={t('compensation-analysis-runs-empty')}
                  data-testid={`${prefixDataTestId}-analysis-runs-table`}
                />
              </TooltipProvider>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default CompensationAnalysisRunsCard
