import React from 'react'
import { PiInfo } from 'react-icons/pi'
import { Card, CardContent, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface SlaKpiValues {
  approvalBreachedRate: string
  approvalBreachedLabel: string
  payoutBreachedRate: string
  payoutBreachedLabel: string
  totalBreachedRate: string
  totalBreachedLabel: string
  withinTotalRate: string
  withinTotalLabel: string
}

interface ReportSlaKpiCardsProps {
  readonly kpiValues: SlaKpiValues
}

const TOOLTIPS = {
  approvalBreached:
    'Share of requests where Approval SLA Status is Breached. Formula: breached approval rows / evaluable approval rows. Rows with missing approval timeline are excluded.',
  payoutBreached:
    'Share of requests where Payout SLA Status is Breached. Payout SLA limit is dynamic per request: min(next or same Monday after approval, remaining total SLA window = total SLA - approval days).',
  totalBreached:
    'Share of requests where Total Cycle SLA Status is Breached. Formula: breached total-cycle rows / evaluable total-cycle rows. Total cycle compares pending-to-paid duration against total SLA limit.',
  totalWithin:
    'Share of requests where Total Cycle SLA Status is Within SLA. Formula: within-SLA total-cycle rows / evaluable total-cycle rows.'
} as const

const ReportSlaKpiCards: React.FC<ReportSlaKpiCardsProps> = ({ kpiValues }) => {
  const cards = [
    {
      cardTestId: 'backoffice-approval-sla-breached-kpi',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:approval_sla_breached_rate', 'Approval SLA Breached'),
      triggerTestId: 'backoffice-approval-sla-breached-tooltip-trigger',
      triggerLabel: 'Approval SLA Breached formula',
      tooltip: TOOLTIPS.approvalBreached,
      value: kpiValues.approvalBreachedRate,
      label: kpiValues.approvalBreachedLabel
    },
    {
      cardTestId: 'backoffice-payout-sla-breached-kpi',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:payout_sla_breached_rate', 'Payout SLA Breached'),
      triggerTestId: 'backoffice-payout-sla-breached-tooltip-trigger',
      triggerLabel: 'Payout SLA Breached formula',
      tooltip: TOOLTIPS.payoutBreached,
      value: kpiValues.payoutBreachedRate,
      label: kpiValues.payoutBreachedLabel
    },
    {
      cardTestId: 'backoffice-total-cycle-sla-breached-kpi',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:total_cycle_sla_breached_rate', 'Total Cycle SLA Breached'),
      triggerTestId: 'backoffice-total-cycle-sla-breached-tooltip-trigger',
      triggerLabel: 'Total Cycle SLA Breached formula',
      tooltip: TOOLTIPS.totalBreached,
      value: kpiValues.totalBreachedRate,
      label: kpiValues.totalBreachedLabel
    },
    {
      cardTestId: 'backoffice-total-cycle-within-sla-kpi',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:total_cycle_within_sla_rate', 'Total Cycle Within SLA'),
      triggerTestId: 'backoffice-total-cycle-within-sla-tooltip-trigger',
      triggerLabel: 'Total Cycle Within SLA formula',
      tooltip: TOOLTIPS.totalWithin,
      value: kpiValues.withinTotalRate,
      label: kpiValues.withinTotalLabel
    }
  ]

  return (
    <div className="gba:mb-4 gba:min-h-[140px]" data-testid="backoffice-expense-reports-kpi-row">
      <TooltipProvider>
        <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-4">
          {cards.map(card => (
            <Card key={card.cardTestId} className="gba:min-h-[124px]" data-testid={card.cardTestId}>
              <CardContent className="gba:p-4">
                <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                  {card.title}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="gba:inline-flex gba:items-center gba:text-muted-foreground"
                        aria-label={card.triggerLabel}
                        data-testid={card.triggerTestId}
                      >
                        <PiInfo />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="gba:max-w-[320px]">{card.tooltip}</TooltipContent>
                  </Tooltip>
                </p>
                <p className="gba:text-xl gba:font-semibold">{card.value}</p>
                <p className="gba:text-xs gba:text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}

export default ReportSlaKpiCards
