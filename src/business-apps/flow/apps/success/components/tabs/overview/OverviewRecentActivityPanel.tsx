import React from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { Activity } from 'lucide-react'
import { formatDisplayText } from '@/common/utils/displayText'
import translations from '../../../_i18n'
import { SuccessEmptyState, SuccessErrorState, SuccessSectionCardHeader } from '../../shared'
import { formatDateTime, formatEnumLabel } from '../../../utils/formatters'

interface OverviewAuditEntry {
  id: string
  flowId?: string
  flowName?: string
  action: string
  taskName?: string
  timestamp: string
}

interface OverviewRecentActivityPanelProps {
  entries: OverviewAuditEntry[]
  isLoading?: boolean
  error?: Error | null
  action?: string
  actionOptions?: string[]
  onActionChange?: (value: string) => void
  currentPage: number
  totalPages: number
  hasMore: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  'data-testid'?: string
}

export const OverviewRecentActivityPanel: React.FC<OverviewRecentActivityPanelProps> = ({
  entries,
  isLoading = false,
  error,
  action = 'ALL',
  actionOptions = [],
  onActionChange,
  currentPage,
  totalPages,
  hasMore,
  onPreviousPage,
  onNextPage,
  'data-testid': testId = 'flow-success-overview-recent-activity'
}) => {
  const { t } = useTranslation(translations)

  return (
    <Card className="gba:border-border gba:bg-card" id="recent-activity" data-testid={testId}>
      <SuccessSectionCardHeader>
        <div className="gba:flex gba:flex-col gba:gap-4 gba:md:flex-row gba:md:items-start gba:md:justify-between">
          <div className="gba:flex gba:flex-col gba:gap-1">
            <CardTitle>{t('overview-recent-activity')}</CardTitle>
            <CardDescription>{t('overview-recent-activity-description')}</CardDescription>
          </div>
          {onActionChange ? (
            <Select value={action} onValueChange={onActionChange}>
              <SelectTrigger className="gba:w-full gba:md:w-56" data-testid={`${testId}-action`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('filter-all-actions')}</SelectItem>
                {actionOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {formatEnumLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </SuccessSectionCardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-4 gba:p-5" aria-busy={isLoading}>
        {isLoading && !entries.length ? (
          <div className="gba:flex gba:min-h-56 gba:items-center gba:justify-center gba:text-sm gba:text-muted-foreground">
            {t('state-loading')}
          </div>
        ) : error && !entries.length ? (
          <SuccessErrorState title={t('state-error-title')} message={error.message} data-testid={`${testId}-error`} />
        ) : !entries.length ? (
          <SuccessEmptyState
            title={t('state-no-activity')}
            description={t('overview-recent-activity-description')}
            icon={<Activity className="gba:h-8 gba:w-8" />}
            data-testid={`${testId}-empty`}
          />
        ) : (
          <>
            {entries.map(entry => (
              <div
                key={entry.id}
                className="gba:flex gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4"
              >
                <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
                  <Activity className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                </div>
                <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-1">
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">
                    {formatDisplayText(entry.flowName, entry.flowId)}
                  </span>
                  <span className="gba:text-sm gba:text-muted-foreground">
                    {formatEnumLabel(entry.action)}
                    {entry.taskName ? ` · ${formatDisplayText(entry.taskName, entry.action)}` : ''}
                  </span>
                  <span className="gba:text-xs gba:text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
                </div>
              </div>
            ))}
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
