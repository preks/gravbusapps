import React, { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { AlertTriangle, Bot, GitBranch, UserRound } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { OrgDirectoryClient } from '@/common/network/org-directory/OrgDirectoryClient'
import { formatDisplayText } from '@/common/utils/displayText'
import translations from '../../_i18n'
import { DecisionTimeframe, useDecisionLogs } from '../../hooks/useDecisionData'
import { SuccessEmptyState, SuccessErrorState, SuccessKpiGrid, SuccessTabPage, SuccessTimeframeSelect } from '../shared'
import { formatDateTime, formatMillisecondsDuration, formatStatusLabel } from '../../utils/formatters'
import { getSuccessTimeframeOptions } from '../../utils/timeframe'

interface DecisionTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const DecisionTab: React.FC<DecisionTabProps> = ({ prefixDataTestId = 'decision-tab', accessToken }) => {
  const { t } = useTranslation(translations)
  const [timeframe, setTimeframe] = useState<DecisionTimeframe>('mtd')
  const [selectedFlowName, setSelectedFlowName] = useState<string>('ALL')
  const [actorNames, setActorNames] = useState<Record<string, string>>({})

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
  const actorIds = useMemo(
    () => [
      ...new Set((decisionData?.decisions || []).map(entry => String(entry.decidedBy || '').trim()).filter(Boolean))
    ],
    [decisionData?.decisions]
  )
  const unresolvedActorIds = useMemo(() => actorIds.filter(actorId => !actorNames[actorId]), [actorIds, actorNames])

  useEffect(() => {
    if (selectedFlowName === 'ALL') return
    if (flowOptions.some(option => option.flowName === selectedFlowName)) return
    setSelectedFlowName('ALL')
  }, [flowOptions, selectedFlowName])

  useEffect(() => {
    if (!accessToken || unresolvedActorIds.length === 0) return

    let cancelled = false
    const orgClient = new OrgDirectoryClient(accessToken)

    Promise.all(
      unresolvedActorIds.map(async actorId => {
        if (actorId.toLowerCase() === 'system') {
          return { actorId, name: t('audit-scope-system') }
        }

        const user = await orgClient.getUserById(actorId).catch(() => null)
        return { actorId, name: user?.name || actorId }
      })
    ).then(results => {
      if (cancelled) return

      setActorNames(prev => {
        const next = { ...prev }
        results.forEach(({ actorId, name }) => {
          next[actorId] = name
        })
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [accessToken, unresolvedActorIds, t])

  const timeframeOptions: Array<{ value: DecisionTimeframe; label: string }> = useMemo(
    () => getSuccessTimeframeOptions(t, { includeLast24h: true }) as Array<{ value: DecisionTimeframe; label: string }>,
    [t]
  )
  const selectedFlowOption = flowOptions.find(option => option.flowName === selectedFlowName)
  const selectedFlowLabel =
    selectedFlowName === 'ALL'
      ? t('filter-all-flows')
      : selectedFlowOption
        ? `${formatDisplayText(selectedFlowOption.flowName, selectedFlowOption.flowName)} (${selectedFlowOption.decisionCount})`
        : formatDisplayText(selectedFlowName, selectedFlowName)
  const summaryItems = [
    {
      id: 'user-decisions',
      label: t('decisions-user'),
      value: String(decisionData?.summary?.userCount || 0),
      description: t('decisions-user-description'),
      icon: <UserRound className="gba:h-5 gba:w-5" />
    },
    {
      id: 'ai-decisions',
      label: t('decisions-ai'),
      value: String(decisionData?.summary?.aiCount || 0),
      description: t('decisions-ai-description'),
      icon: <Bot className="gba:h-5 gba:w-5" />
    },
    {
      id: 'logic-decisions',
      label: t('decisions-logic'),
      value: String(decisionData?.summary?.logicCount || 0),
      description: t('decisions-logic-description'),
      icon: <GitBranch className="gba:h-5 gba:w-5" />
    },
    {
      id: 'escalated-decisions',
      label: t('decisions-escalated'),
      value: String(decisionData?.summary?.escalatedCount || 0),
      description: t('decisions-escalated-description'),
      icon: <AlertTriangle className="gba:h-5 gba:w-5" />
    }
  ]

  const getActorName = (actorId?: string) => {
    if (!actorId) return 'n/a'
    return actorNames[actorId] || actorId
  }

  return (
    <SuccessTabPage
      title={t('decisions-title')}
      description={t('decisions-description')}
      actions={
        <>
          <SuccessTimeframeSelect
            value={timeframe}
            onChange={value => setTimeframe(value as DecisionTimeframe)}
            options={timeframeOptions}
            data-testid={`${prefixDataTestId}-timeframe-select`}
          />
          <Select value={selectedFlowName} onValueChange={setSelectedFlowName}>
            <SelectTrigger className="gba:w-full gba:min-w-72" data-testid={`${prefixDataTestId}-flow-select`}>
              <SelectValue>{selectedFlowLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('filter-all-flows')}</SelectItem>
              {flowOptions.map(option => (
                <SelectItem key={option.flowName} value={option.flowName}>
                  {formatDisplayText(option.flowName, option.flowName)} ({option.decisionCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
      data-testid={prefixDataTestId}
    >
      {decisionsError && !decisionData ? (
        <SuccessErrorState
          title={t('state-error-title')}
          message={decisionsError.message || t('state-error-title')}
          onRetry={refetchDecisions}
          retryLabel={t('action-retry')}
          data-testid={`${prefixDataTestId}-error`}
        />
      ) : (
        <SuccessKpiGrid
          items={summaryItems}
          isLoading={decisionsLoading && !decisionData}
          emptyTitle={t('state-empty')}
          emptyDescription={t('decisions-description')}
          data-testid={`${prefixDataTestId}-summary`}
        />
      )}

      <Card className="gba:border-border gba:bg-card" data-testid={`${prefixDataTestId}-table-card`}>
        <CardHeader className="gba:border-b gba:border-border">
          <CardTitle>{t('decisions-entries')}</CardTitle>
          <CardDescription>{selectedFlowLabel}</CardDescription>
        </CardHeader>
        <CardContent className="gba:p-5">
          {decisionsLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
              <Spinner />
            </div>
          ) : decisionData?.decisions?.length ? (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:border-collapse">
                <thead>
                  <tr className="gba:border-b gba:border-border">
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('decisions-time')}</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('label-flow')}</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('decisions-step')}</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('decisions-decided-by')}</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">
                      {t('decisions-selected-branch')}
                    </th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('decisions-escalation')}</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">
                      {t('decisions-flow-status')}
                    </th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('decisions-duration')}</th>
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
                          <span className="gba:font-medium">{formatDisplayText(entry.flowName, entry.flowId)}</span>
                          <span className="gba:text-xs gba:text-muted-foreground">
                            {entry.flowUpdatedAt
                              ? `${t('overview-last-activity')}: ${formatDateTime(entry.flowUpdatedAt)}`
                              : entry.flowId}
                          </span>
                        </div>
                      </td>
                      <td className="gba:p-3 gba:text-sm">
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          <span className="gba:font-medium">{entry.stepReference || 'n/a'}</span>
                          <span className="gba:text-xs gba:text-muted-foreground">
                            {formatStatusLabel(entry.decisionMode)}
                          </span>
                        </div>
                      </td>
                      <td className="gba:p-3 gba:text-sm">
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          <span className="gba:font-medium">{getActorName(entry.decidedBy)}</span>
                          {entry.decidedBy && getActorName(entry.decidedBy) !== entry.decidedBy ? (
                            <span className="gba:text-xs gba:text-muted-foreground">{entry.decidedBy}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="gba:p-3 gba:text-sm">{entry.selectedBranch || 'n/a'}</td>
                      <td className="gba:p-3 gba:text-sm">
                        {entry.escalated ? (
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            <span className="gba:text-sm gba:font-medium gba:text-destructive">
                              {t('decisions-escalated')}
                            </span>
                            {entry.escalationReason ? (
                              <span className="gba:text-xs gba:text-muted-foreground">{entry.escalationReason}</span>
                            ) : null}
                          </div>
                        ) : (
                          t('decisions-direct')
                        )}
                      </td>
                      <td className="gba:p-3 gba:text-sm">{formatStatusLabel(entry.flowStatus)}</td>
                      <td className="gba:p-3 gba:text-sm">{formatMillisecondsDuration(entry.durationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <SuccessEmptyState
              title={t('state-empty')}
              description={t('decisions-no-entries')}
              icon={<GitBranch className="gba:h-8 gba:w-8" />}
            />
          )}
        </CardContent>
      </Card>
    </SuccessTabPage>
  )
}
