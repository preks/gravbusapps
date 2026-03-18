import React from 'react'
import { Card, CardContent, Button, Badge, Spinner } from '@newwork/nw-design-system'
import { Play, Square, Clock, History, ChevronRight, Eye, RefreshCw, FileSpreadsheet } from 'lucide-react'
import type { AutomationWithRuns, TranslateFn } from './automationSectionTypes'
import {
  getAutomationTypeIcon,
  getAutomationTypeLabel,
  formatRelativeTime,
  getStatusBadgeVariant,
  getStatusIcon
} from './automationSectionUtils'

export interface AutomationListItemProps {
  automation: AutomationWithRuns
  onView: () => void
  onRun: () => void
  onStopRun: (runId: string) => void
  isRunning: boolean
  isStoppingRun: boolean
  t: TranslateFn
}

export const AutomationListItem: React.FC<AutomationListItemProps> = ({
  automation,
  onView,
  onRun,
  onStopRun,
  isRunning,
  isStoppingRun,
  t
}) => {
  const Icon = getAutomationTypeIcon(automation.type)
  const latestRun = automation.recentRuns?.[0]
  const canStopLatestRun = latestRun && (latestRun.status === 'RUNNING' || latestRun.status === 'PENDING')

  return (
    <Card
      className="gba:hover:border-primary/50 gba:transition-colors gba:cursor-pointer"
      onClick={onView}
      data-testid={`automation-item-${automation.id}`}
    >
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex gba:items-start gba:gap-3 gba:flex-1 gba:min-w-0">
            <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
              <Icon className="gba:w-5 gba:h-5 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-2">
                <h3 className="gba:font-semibold gba:text-foreground gba:truncate">{automation.name}</h3>
                {!automation.isEnabled && (
                  <Badge variant="outline" className="gba:text-xs">
                    {t('automations-hub-disabled')}
                  </Badge>
                )}
              </div>
              <div className="gba:flex gba:items-center gba:gap-3 gba:mt-1 gba:text-sm gba:text-muted-foreground">
                <span>{getAutomationTypeLabel(automation.type, t)}</span>
                {automation.spreadsheetAppName && (
                  <>
                    <span className="gba:text-muted-foreground/50">&bull;</span>
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <FileSpreadsheet className="gba:w-3 gba:h-3" />
                      {automation.spreadsheetAppName}
                    </span>
                  </>
                )}
              </div>
              {automation.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:line-clamp-1">
                  {automation.description}
                </p>
              )}
              <div className="gba:flex gba:items-center gba:gap-4 gba:mt-2 gba:text-xs gba:text-muted-foreground">
                {latestRun && (
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <Clock className="gba:w-3 gba:h-3" />
                    {t('automations-hub-last-run')}: {formatRelativeTime(latestRun.startedAt, t)}
                  </span>
                )}
                <span className="gba:flex gba:items-center gba:gap-1">
                  <History className="gba:w-3 gba:h-3" />
                  {automation.runCount} {t('automations-hub-total').toLowerCase()}
                </span>
                {latestRun && (latestRun.status === 'RUNNING' || latestRun.status === 'PENDING') && (
                  <Badge variant="info" className="gba:text-xs">
                    <RefreshCw className="gba:w-3 gba:h-3 gba:mr-1 gba:animate-spin" />
                    {t('sa-in-progress')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            {automation.trigger === 'manual' && automation.type === 'excel_collection' && (
              <Button
                size="sm"
                variant="outline"
                onClick={e => {
                  e.stopPropagation()
                  onRun()
                }}
                disabled={!automation.isEnabled || isRunning}
              >
                {isRunning ? <Spinner size="sm" className="gba:mr-1" /> : <Play className="gba:w-4 gba:h-4 gba:mr-1" />}
                {t('automations-hub-run')}
              </Button>
            )}
            {canStopLatestRun && (
              <Button
                size="sm"
                variant="outline"
                onClick={e => {
                  e.stopPropagation()
                  onStopRun(latestRun.id)
                }}
                disabled={isStoppingRun}
              >
                {isStoppingRun ? (
                  <Spinner size="sm" className="gba:mr-1" />
                ) : (
                  <Square className="gba:w-4 gba:h-4 gba:mr-1" />
                )}
                {t('sa-stop')}
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={e => {
                e.stopPropagation()
                onView()
              }}
            >
              <Eye className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('sa-view')}
            </Button>

            <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          </div>
        </div>

        {automation.recentRuns && automation.recentRuns.length > 0 && (
          <div className="gba:mt-3 gba:pt-3 gba:border-t">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:mb-2">
              <History className="gba:w-3 gba:h-3" />
              {t('sa-recent-runs')}
            </div>
            <div className="gba:flex gba:gap-2">
              {automation.recentRuns.slice(0, 3).map(run => {
                const StatusIcon = getStatusIcon(run.status)
                return (
                  <Badge key={run.id} variant={getStatusBadgeVariant(run.status)} className="gba:text-xs">
                    <StatusIcon
                      className={`gba:w-3 gba:h-3 gba:mr-1 ${run.status === 'RUNNING' ? 'gba:animate-spin' : ''}`}
                    />
                    {run.completedCount}/{run.recipientCount}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
