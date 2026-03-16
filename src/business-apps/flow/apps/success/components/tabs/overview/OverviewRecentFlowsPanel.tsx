import React from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { Clock3, Workflow } from 'lucide-react'
import translations from '../../../_i18n'
import { SuccessEmptyState, SuccessErrorState, SuccessSectionCardHeader } from '../../shared'
import { formatDateTime, formatDetailedHoursDuration, formatEnumLabel } from '../../../utils/formatters'
import type { FlowSuccessFlowListItem } from '../../../hooks/useFlowAnalytics.types'

interface OverviewRecentFlowsPanelProps {
  flows: FlowSuccessFlowListItem[]
  isLoading?: boolean
  error?: Error | null
  search?: string
  status: string
  currentPage: number
  totalPages: number
  hasMore: boolean
  onSearchChange?: (value: string) => void
  onStatusChange: (value: string) => void
  onPreviousPage: () => void
  onNextPage: () => void
  onSelectFlow: (flow: FlowSuccessFlowListItem) => void
  title?: string
  description?: string
  showSearch?: boolean
  statusFilterPlacement?: 'inline' | 'header'
  'data-testid'?: string
}

const STATUS_OPTIONS = ['RUNNING', 'COMPLETED', 'TIMED_OUT', 'FAILED'] as const

export const OverviewRecentFlowsPanel: React.FC<OverviewRecentFlowsPanelProps> = ({
  flows,
  isLoading = false,
  error,
  search,
  status,
  currentPage,
  totalPages,
  hasMore,
  onSearchChange,
  onStatusChange,
  onPreviousPage,
  onNextPage,
  onSelectFlow,
  title,
  description,
  showSearch = true,
  statusFilterPlacement = 'inline',
  'data-testid': testId = 'flow-success-overview-recent-flows'
}) => {
  const { t } = useTranslation(translations)
  const resolvedTitle = title || t('overview-recent-flows')
  const resolvedDescription = description || t('overview-recent-flows-description')
  const showInlineFilters = showSearch || statusFilterPlacement === 'inline'
  const renderStatusFilter = (className?: string) => (
    <Select value={status} onValueChange={onStatusChange}>
      <SelectTrigger className={className || 'gba:w-full gba:md:w-52'} data-testid={`${testId}-status`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">{t('filter-all-statuses')}</SelectItem>
        {STATUS_OPTIONS.map(option => (
          <SelectItem key={option} value={option}>
            {formatEnumLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <Card className="gba:border-border gba:bg-card" id="recent-flows" data-testid={testId}>
      <SuccessSectionCardHeader>
        <div className="gba:flex gba:flex-col gba:gap-4 gba:md:flex-row gba:md:items-start gba:md:justify-between">
          <div className="gba:flex gba:flex-col gba:gap-1">
            <CardTitle>{resolvedTitle}</CardTitle>
            <CardDescription>{resolvedDescription}</CardDescription>
          </div>
          {statusFilterPlacement === 'header' ? renderStatusFilter('gba:w-full gba:md:w-52') : null}
        </div>
        {showInlineFilters ? (
          <div className="gba:flex gba:flex-col gba:gap-3 gba:pt-2 gba:md:flex-row">
            {showSearch ? (
              <Input
                value={search || ''}
                onChange={event => onSearchChange?.(event.target.value)}
                placeholder={t('placeholder-search-flows')}
                data-testid={`${testId}-search`}
              />
            ) : null}
            {statusFilterPlacement === 'inline' ? renderStatusFilter() : null}
          </div>
        ) : null}
      </SuccessSectionCardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-4 gba:p-5">
        {isLoading ? (
          <div className="gba:flex gba:min-h-56 gba:items-center gba:justify-center gba:text-sm gba:text-muted-foreground">
            {t('state-loading')}
          </div>
        ) : error ? (
          <SuccessErrorState title={t('state-error-title')} message={error.message} data-testid={`${testId}-error`} />
        ) : !flows.length ? (
          <SuccessEmptyState
            title={t('overview-no-flows')}
            description={resolvedDescription}
            icon={<Workflow className="gba:h-8 gba:w-8" />}
            data-testid={`${testId}-empty`}
          />
        ) : (
          <>
            <div className="gba:flex gba:flex-col gba:gap-3">
              {flows.map((flow, index) => {
                const activityTimestamp = flow.lastActivityTime || flow.updateTime || flow.startTime
                const formattedDuration =
                  flow.durationHours != null ? formatDetailedHoursDuration(flow.durationHours) : null
                return (
                  <button
                    key={flow.flowId}
                    type="button"
                    className="gba:flex gba:w-full gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4 gba:text-left gba:transition-colors gba:hover:bg-muted/50"
                    onClick={() => onSelectFlow(flow)}
                    data-testid={`${testId}-row-${index}`}
                  >
                    <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
                      <Workflow className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    </div>
                    <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-1">
                      <span className="gba:text-sm gba:font-medium gba:text-foreground">
                        {flow.flowName || `Flow ${flow.flowId.slice(-8)}`}
                      </span>
                      <span className="gba:text-sm gba:text-muted-foreground">
                        {formatEnumLabel(flow.status)}
                        {' · '}
                        {(flow.lastActivityTime ? t('overview-last-activity') : t('overview-started')) +
                          ': ' +
                          formatDateTime(activityTimestamp)}
                      </span>
                      {formattedDuration && formattedDuration !== 'n/a' ? (
                        <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                          <Clock3 className="gba:h-4 gba:w-4" />
                          {formattedDuration}
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
            {totalPages > 1 ? (
              <div className="gba:flex gba:flex-col gba:gap-3 gba:border-t gba:border-border gba:pt-4 gba:md:flex-row gba:md:items-center gba:md:justify-between">
                <span className="gba:text-sm gba:text-muted-foreground">
                  {t('overview-page')} {currentPage} {t('overview-of')} {totalPages}
                </span>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Button variant="outline" size="sm" onClick={onPreviousPage} disabled={currentPage === 1}>
                    {t('action-back')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={onNextPage} disabled={!hasMore}>
                    {t('action-next')}
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
