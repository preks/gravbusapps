import React from 'react'
import { Card, CardContent, CardDescription, CardTitle, Spinner, useTranslation } from '@newwork/nw-design-system'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import translations from '../../_i18n'
import type { DecisionOptimizationData } from '../../hooks/useDecisionData'
import { SuccessEmptyState, SuccessSectionCardHeader } from '../shared'
import { getDecisionStepDisplayLabel, getDecisionStepTypeLabel } from '../../utils/decisionLabels'
import { formatPercent } from '../../utils/formatters'

interface DecisionOptimizationPanelProps {
  data: DecisionOptimizationData | null
  variant?: 'insights' | 'governance'
  secondaryPanel?: React.ReactNode
  isLoading?: boolean
  'data-testid'?: string
}

export const DecisionOptimizationPanel: React.FC<DecisionOptimizationPanelProps> = ({
  data,
  variant = 'governance',
  secondaryPanel,
  isLoading = false,
  'data-testid': testId = 'decision-optimization-panel'
}) => {
  const { t } = useTranslation(translations)
  const allSteps = data?.stepPerformance || []
  const topSteps = allSteps.filter(step => step.escalatedCount > 0 || step.humanOverrideCount > 0).slice(0, 6)
  const topReasons = data?.escalationReasons.slice(0, 5) || []

  if (isLoading && !data) {
    return (
      <div className="gba:flex gba:min-h-56 gba:items-center gba:justify-center" data-testid={testId}>
        <Spinner />
      </div>
    )
  }

  const reasonsCard = (
    <Card className="gba:border-border gba:bg-card" data-testid={`${testId}-reasons`}>
      <SuccessSectionCardHeader>
        <CardTitle>{t('decisions-escalation-reasons-title')}</CardTitle>
        <CardDescription>{t('decisions-escalation-reasons-description')}</CardDescription>
      </SuccessSectionCardHeader>
      <CardContent className="gba:p-5">
        {!topReasons.length ? (
          <SuccessEmptyState
            title={t('state-empty')}
            description={t('decisions-escalation-reasons-description')}
            icon={<AlertTriangle className="gba:h-8 gba:w-8" />}
          />
        ) : (
          <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2">
            {topReasons.map(reason => (
              <div
                key={reason.reason}
                className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4"
              >
                <span className="gba:text-sm gba:text-foreground">{reason.reason}</span>
                <span className="gba:text-sm gba:font-medium gba:text-foreground">{reason.totalOccurrences}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-6" data-testid={testId}>
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-2" data-testid={`${testId}-cards`}>
        <Card className="gba:border-border gba:bg-card">
          <SuccessSectionCardHeader>
            <CardTitle>{t('decisions-ai-hotspots-title')}</CardTitle>
            <CardDescription>{t('decisions-ai-hotspots-description')}</CardDescription>
          </SuccessSectionCardHeader>
          <CardContent className="gba:p-5">
            {!topSteps.length ? (
              <SuccessEmptyState
                title={t('state-empty')}
                description={t('decisions-ai-hotspots-description')}
                icon={<ShieldCheck className="gba:h-8 gba:w-8" />}
              />
            ) : (
              <div className="gba:overflow-x-auto">
                <table className="gba:w-full gba:border-collapse">
                  <thead>
                    <tr className="gba:border-b gba:border-border">
                      <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('decisions-step')}</th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('decisions-escalated')}</th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('decisions-human-override-rate')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('decisions-branch-agreement-rate')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSteps.map(step => (
                      <tr
                        key={`${step.stepReference}-${step.promptVersion ?? 'na'}`}
                        className="gba:border-b gba:border-border/60"
                      >
                        <td className="gba:p-3 gba:text-sm">
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            <span className="gba:font-medium gba:text-foreground">
                              {getDecisionStepDisplayLabel(step, t('value-not-available'))}
                            </span>
                            {getDecisionStepTypeLabel(step.decisionMode) ? (
                              <span className="gba:text-xs gba:text-muted-foreground">
                                {getDecisionStepTypeLabel(step.decisionMode)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatPercent(step.escalationRate)}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatPercent(step.humanOverrideRate)}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatPercent(step.branchAgreementRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        {variant === 'governance' ? reasonsCard : secondaryPanel}
      </div>
      {variant === 'insights' ? reasonsCard : null}
    </div>
  )
}
