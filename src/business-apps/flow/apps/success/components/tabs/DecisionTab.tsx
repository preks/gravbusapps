import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import { AlertTriangle, GitBranch, RefreshCw } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DecisionTimeframe, useDecisionLogs } from '../../hooks/useDecisionData'

interface DecisionTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const formatDateTime = (value?: string): string => {
  if (!value) return 'n/a'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatMode = (value?: string): string =>
  String(value || '')
    .trim()
    .toUpperCase() || 'UNKNOWN'

const formatDuration = (durationMs?: number): string => {
  if (!Number.isFinite(durationMs)) return 'n/a'
  const ms = Number(durationMs || 0)
  if (ms < 1000) return `${ms} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  return `${(seconds / 60).toFixed(1)} min`
}

export const DecisionTab: React.FC<DecisionTabProps> = ({ prefixDataTestId = 'decision-tab', accessToken }) => {
  const [timeframe, setTimeframe] = useState<DecisionTimeframe>('mtd')
  const [selectedFlowName, setSelectedFlowName] = useState<string>('ALL')

  const {
    data: decisionData,
    isLoading: decisionsLoading,
    error: decisionsError,
    refetch: refetchDecisions
  } = useDecisionLogs({
    accessToken,
    timeframe,
    flowName: selectedFlowName === 'ALL' ? undefined : selectedFlowName,
    limit: 100,
    offset: 0
  })

  const flowOptions = decisionData?.flowOptions || []

  useEffect(() => {
    if (selectedFlowName === 'ALL') return
    if (flowOptions.some(option => option.flowName === selectedFlowName)) return
    setSelectedFlowName('ALL')
  }, [flowOptions, selectedFlowName])

  const summaryWidgets: WidgetItem[] = [
    {
      key: 'total-decisions',
      title: 'Total decisions',
      value: decisionData?.summary?.totalDecisions || 0,
      prefix: <GitBranch className="gba:h-4 gba:w-4" />,
      description: 'Logged decisions in the selected period'
    },
    {
      key: 'escalated-decisions',
      title: 'Escalated',
      value: decisionData?.summary?.escalatedCount || 0,
      prefix: <AlertTriangle className="gba:h-4 gba:w-4" />,
      description: 'Decisions escalated for human handling'
    },
    {
      key: 'ai-decisions',
      title: 'AI decisions',
      value: decisionData?.summary?.aiCount || 0,
      prefix: <GitBranch className="gba:h-4 gba:w-4" />,
      description: 'AI-mode decision entries'
    },
    {
      key: 'flow-instances',
      title: 'Flow instances',
      value: decisionData?.summary?.uniqueFlowInstances || 0,
      prefix: <GitBranch className="gba:h-4 gba:w-4" />,
      description: 'Distinct workflow instances with decisions'
    }
  ]

  const selectedFlowLabel = selectedFlowName === 'ALL' ? 'All flows' : selectedFlowName

  const timeframeOptions: Array<{ value: DecisionTimeframe; label: string }> = useMemo(
    () => [
      { value: 'last24h', label: 'Last 24 hours' },
      { value: 'wtd', label: 'Week to Date' },
      { value: 'mtd', label: 'Month to Date' },
      { value: 'qtd', label: 'Quarter to Date' },
      { value: 'ytd', label: 'Year to Date' }
    ],
    []
  )

  if (decisionsLoading && !decisionData) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner />
      </div>
    )
  }

  if (decisionsError && !decisionData) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <AlertTriangle className="gba:h-4 gba:w-4" />
        <div>
          <h3>Error Loading Decision Logs</h3>
          <p>{decisionsError.message || 'Failed to load decision logs'}</p>
        </div>
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      <div className="gba:flex gba:flex-col gba:gap-4 gba:md:flex-row gba:md:items-end gba:md:justify-between">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Decision Logs</h2>
          <p className="gba:text-gray-600">Inspect branching decisions recorded for completed workflow steps.</p>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-3 gba:lg:flex-row gba:lg:items-end">
          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <span className="gba:text-sm gba:font-medium gba:text-foreground">Timeframe</span>
            <Select value={timeframe} onValueChange={value => setTimeframe(value as DecisionTimeframe)}>
              <SelectTrigger
                className="gba:w-full gba:lg:w-[220px]"
                data-testid={`${prefixDataTestId}-timeframe-select`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <span className="gba:text-sm gba:font-medium gba:text-foreground">Flow</span>
            <Select value={selectedFlowName} onValueChange={setSelectedFlowName}>
              <SelectTrigger className="gba:w-full gba:lg:w-[320px]" data-testid={`${prefixDataTestId}-flow-select`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All flows</SelectItem>
                {flowOptions.map(option => (
                  <SelectItem key={option.flowName} value={option.flowName}>
                    {option.flowName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              refetchDecisions()
            }}
            disabled={decisionsLoading}
            data-testid={`${prefixDataTestId}-refresh`}
          >
            <RefreshCw className="gba:mr-2 gba:h-4 gba:w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card data-testid={`${prefixDataTestId}-scope-card`}>
        <CardContent className="gba:flex gba:flex-col gba:gap-2 gba:p-4 gba:md:flex-row gba:md:items-center gba:md:justify-between">
          <div className="gba:text-sm gba:text-foreground">
            Showing <span className="gba:font-semibold">{selectedFlowLabel}</span> for{' '}
            <span className="gba:font-semibold">
              {timeframeOptions.find(option => option.value === timeframe)?.label || timeframe}
            </span>
          </div>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Badge variant="outline">{decisionData?.pagination?.total || 0} entries</Badge>
            <Badge variant="outline">{flowOptions.length} flow names</Badge>
          </div>
        </CardContent>
      </Card>

      <WidgetGroup
        widgets={summaryWidgets}
        isLoading={decisionsLoading}
        error={decisionsError}
        onRetry={refetchDecisions}
        skeletonCount={4}
        emptyText="No decision logs available"
        data-testid={`${prefixDataTestId}-summary`}
      />

      {decisionsError ? (
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-decision-error`}>
          <AlertTriangle className="gba:h-4 gba:w-4" />
          <div>
            <h3>Error Loading Decision Logs</h3>
            <p>{decisionsError.message || 'Failed to load decision logs'}</p>
          </div>
        </Alert>
      ) : null}

      <Card data-testid={`${prefixDataTestId}-table-card`}>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {decisionsLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
              <Spinner />
            </div>
          ) : decisionData?.decisions?.length ? (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:border-collapse">
                <thead>
                  <tr className="gba:border-b gba:border-border">
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">Time</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">Flow</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">Step</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">Mode</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">Selected Branch</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">Decided By</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">Escalation</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {decisionData.decisions.map((entry, index) => (
                    <tr
                      key={entry.id || `${entry.stepReference}-${entry.createdAt || index}`}
                      className="gba:border-b gba:border-border"
                      data-testid={`${prefixDataTestId}-row-${index}`}
                    >
                      <td className="gba:p-3 gba:text-sm">{formatDateTime(entry.createdAt)}</td>
                      <td className="gba:p-3 gba:text-sm">
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          <span className="gba:font-medium">{entry.flowName || entry.flowId}</span>
                          <span className="gba:text-xs gba:text-muted-foreground">{entry.flowId}</span>
                        </div>
                      </td>
                      <td className="gba:p-3 gba:text-sm gba:font-medium">{entry.stepReference || 'n/a'}</td>
                      <td className="gba:p-3 gba:text-sm">
                        <Badge variant="outline">{formatMode(entry.decisionMode)}</Badge>
                      </td>
                      <td className="gba:p-3 gba:text-sm">{entry.selectedBranch || 'n/a'}</td>
                      <td className="gba:p-3 gba:text-sm">{entry.decidedBy || 'n/a'}</td>
                      <td className="gba:p-3 gba:text-sm">
                        {entry.escalated ? (
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            <Badge variant="secondary">Escalated</Badge>
                            {entry.escalationReason ? (
                              <span className="gba:text-xs gba:text-muted-foreground">{entry.escalationReason}</span>
                            ) : null}
                          </div>
                        ) : (
                          <Badge variant="outline">Direct</Badge>
                        )}
                      </td>
                      <td className="gba:p-3 gba:text-sm">{formatDuration(entry.durationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted gba:p-6 gba:text-sm gba:text-muted-foreground">
              No decision log entries found for the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
