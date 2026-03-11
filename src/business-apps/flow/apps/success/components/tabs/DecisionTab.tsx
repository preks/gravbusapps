import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardTitle, Spinner, useTranslation } from '@newwork/nw-design-system'
import { AlertTriangle, Bot, GitBranch, UserRound } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { OrgDirectoryClient } from '@/common/network/org-directory/OrgDirectoryClient'
import { formatDisplayText } from '@/common/utils/displayText'
import translations from '../../_i18n'
import {
  DecisionLogEntry,
  DecisionTimeframe,
  useDecisionLogs,
  useDecisionOptimizationAnalytics
} from '../../hooks/useDecisionData'
import {
  SuccessEmptyState,
  SuccessErrorState,
  SuccessKpiGrid,
  SuccessSectionCardHeader,
  SuccessTabPage,
  SuccessTimeframeSelect
} from '../shared'
import { formatDateTime, formatStatusLabel } from '../../utils/formatters'
import { getDecisionStepDisplayLabel } from '../../utils/decisionLabels'
import { getSuccessTimeframeOptions } from '../../utils/timeframe'
import { DecisionDetailsDialog } from './DecisionDetailsDialog'
import { DecisionOptimizationPanel } from './DecisionOptimizationPanel'
import type { FlowSuccessDecisionFilter } from '../../shellState'

interface DecisionTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeframe?: DecisionTimeframe
  onTimeframeChange?: (timeframe: DecisionTimeframe) => void
  templateId?: string
  selectedFlowLabel?: string
  showControls?: boolean
  section?: string
  decisionFilter?: FlowSuccessDecisionFilter
  headerActions?: React.ReactNode
}

export const DecisionTab: React.FC<DecisionTabProps> = ({
  prefixDataTestId = 'decision-tab',
  accessToken,
  timeframe,
  onTimeframeChange,
  templateId,
  selectedFlowLabel,
  showControls = true,
  section,
  decisionFilter = 'all',
  headerActions
}) => {
  const { t } = useTranslation(translations)
  const [internalTimeframe, setInternalTimeframe] = useState<DecisionTimeframe>('mtd')
  const [actorNames, setActorNames] = useState<Record<string, string>>({})
  const [selectedEntry, setSelectedEntry] = useState<DecisionLogEntry | null>(null)
  const activeTimeframe = timeframe ?? internalTimeframe
  const handleTimeframeChange = onTimeframeChange ?? setInternalTimeframe
  const scopedTemplateId = templateId && templateId !== 'ALL' ? templateId : undefined

  const {
    data: decisionData,
    isLoading: decisionsLoading,
    error: decisionsError,
    refetch: refetchDecisions
  } = useDecisionLogs({
    accessToken,
    timeframe: activeTimeframe,
    templateId: scopedTemplateId,
    limit: 100,
    offset: 0
  })
  const { data: optimizationData, isLoading: optimizationLoading } = useDecisionOptimizationAnalytics({
    accessToken,
    timeframe: activeTimeframe,
    templateId: scopedTemplateId
  })
  const actorIds = useMemo(
    () => [
      ...new Set((decisionData?.decisions || []).map(entry => String(entry.decidedBy || '').trim()).filter(Boolean))
    ],
    [decisionData?.decisions]
  )
  const unresolvedActorIds = useMemo(() => actorIds.filter(actorId => !actorNames[actorId]), [actorIds, actorNames])

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

  useEffect(() => {
    if (!section) return
    const element = document.getElementById(section)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

  const timeframeOptions = getSuccessTimeframeOptions(t, { includeLast24h: true }) as Array<{
    value: DecisionTimeframe
    label: string
  }>
  const resolvedFlowLabel = selectedFlowLabel || t('filter-all-templates')
  const visibleDecisions = (decisionData?.decisions || []).filter(entry => {
    switch (decisionFilter) {
      case 'ai-direct':
        return entry.decisionMode === 'AI' && !entry.escalated
      case 'ai-escalated':
        return entry.decisionMode === 'AI' && entry.escalated
      case 'human-overrides':
        return entry.branchAgreement === false
      case 'branch-agreement':
        return entry.branchAgreement === true
      default:
        return true
    }
  })
  const summary = decisionData?.summary
  const summaryItems = [
    {
      id: 'total-decisions',
      label: t('decisions-total'),
      value: String(summary?.totalDecisions || 0),
      description: t('decisions-total-description'),
      icon: <Bot className="gba:h-5 gba:w-5" />
    },
    {
      id: 'user-decisions',
      label: t('decisions-user'),
      value: String(summary?.userCount || 0),
      description: t('decisions-user-description'),
      icon: <UserRound className="gba:h-5 gba:w-5" />
    },
    {
      id: 'ai-decisions',
      label: t('decisions-ai'),
      value: String(summary?.aiCount || 0),
      description: t('decisions-ai-description'),
      icon: <GitBranch className="gba:h-5 gba:w-5" />
    },
    {
      id: 'escalated-decisions',
      label: t('decisions-escalated'),
      value: String(summary?.escalatedCount || 0),
      description: t('decisions-escalated-description'),
      icon: <AlertTriangle className="gba:h-5 gba:w-5" />
    }
  ]

  const getActorName = (actorId?: string) => {
    if (!actorId) return 'n/a'
    return actorNames[actorId] || actorId
  }

  const getDecisionPathLabel = (entry: DecisionLogEntry) => {
    if (entry.decisionMode === 'AI' && entry.escalated) return t('decisions-ai-escalated-to-user')
    if (entry.decisionMode === 'AI') return t('decisions-ai-direct')
    if (entry.decisionMode === 'USER') return t('decisions-user-direct')
    if (entry.decisionMode === 'LOGIC') return t('decisions-logic-direct')
    return formatStatusLabel(entry.decisionMode)
  }

  const getEscalationLabel = (entry: DecisionLogEntry) => {
    if (!entry.escalated) return '-'
    return t('decisions-ai-escalated-to-user')
  }

  const getDecisionPreview = (entry: DecisionLogEntry) => {
    return (
      entry.decisionInstructions ||
      entry.humanReviewInstructions ||
      entry.decisionReasoning ||
      getDecisionPathLabel(entry)
    )
  }

  return (
    <SuccessTabPage
      title={t('governance-subview-decisions')}
      description={t('decisions-description')}
      actions={
        <>
          {headerActions}
          {showControls ? (
            <SuccessTimeframeSelect
              value={activeTimeframe}
              onChange={value => handleTimeframeChange(value as DecisionTimeframe)}
              options={timeframeOptions}
              data-testid={`${prefixDataTestId}-timeframe-select`}
            />
          ) : null}
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

      <div id="decision-optimization">
        <DecisionOptimizationPanel
          data={optimizationData}
          variant="governance"
          isLoading={optimizationLoading}
          data-testid={`${prefixDataTestId}-optimization`}
        />
      </div>

      <Card
        className="gba:border-border gba:bg-card"
        data-testid={`${prefixDataTestId}-table-card`}
        id="decision-entries"
      >
        <SuccessSectionCardHeader>
          <CardTitle>{t('decisions-entries')}</CardTitle>
          <CardDescription>{resolvedFlowLabel}</CardDescription>
        </SuccessSectionCardHeader>
        <CardContent className="gba:p-5">
          {decisionsLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
              <Spinner />
            </div>
          ) : visibleDecisions.length ? (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:border-collapse">
                <thead>
                  <tr className="gba:border-b gba:border-border">
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('decisions-time')}</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('label-flow')}</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('decisions-decision')}</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('decisions-decided-by')}</th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">
                      {t('decisions-selected-branch')}
                    </th>
                    <th className="gba:p-3 gba:text-left gba:text-xs gba:font-semibold">{t('decisions-escalation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDecisions.map((entry, index) => (
                    <tr
                      key={entry.id || `${entry.stepReference}-${entry.createdAt || index}`}
                      className="gba:cursor-pointer gba:border-b gba:border-border gba:hover:bg-muted/40"
                      data-testid={`${prefixDataTestId}-row-${index}`}
                      onClick={() => setSelectedEntry(entry)}
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
                          <span className="gba:font-medium">
                            {getDecisionStepDisplayLabel(entry, t('value-not-available'))}
                          </span>
                          <span className="gba:text-xs gba:text-muted-foreground">
                            <span className="gba:line-clamp-2">{getDecisionPreview(entry)}</span>
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
                      <td className="gba:p-3 gba:text-sm">
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          <span className="gba:font-medium">
                            {entry.selectedBranchLabel || entry.selectedBranch || t('value-not-available')}
                          </span>
                          {entry.selectedBranch &&
                          entry.selectedBranchLabel &&
                          entry.selectedBranch !== entry.selectedBranchLabel ? (
                            <span className="gba:text-xs gba:text-muted-foreground">{entry.selectedBranch}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="gba:p-3 gba:text-sm">
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          <span
                            className={`gba:text-sm gba:font-medium ${entry.escalated ? 'gba:text-destructive' : 'gba:text-foreground'}`}
                          >
                            {getEscalationLabel(entry)}
                          </span>
                          {entry.escalationReason ? (
                            <span className="gba:text-xs gba:text-muted-foreground">{entry.escalationReason}</span>
                          ) : null}
                        </div>
                      </td>
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

      <DecisionDetailsDialog
        entry={selectedEntry}
        actorName={selectedEntry?.decidedBy ? getActorName(selectedEntry.decidedBy) : undefined}
        open={Boolean(selectedEntry)}
        onOpenChange={open => {
          if (!open) setSelectedEntry(null)
        }}
        data-testid={`${prefixDataTestId}-details`}
      />
    </SuccessTabPage>
  )
}
