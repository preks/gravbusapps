import React from 'react'
import { InfoIcon } from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'

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

const ReportSlaKpiCards: React.FC<ReportSlaKpiCardsProps> = ({ kpiValues }) => {
  const { t } = useTranslation(translations)

  const cards = [
    {
      cardTestId: 'backoffice-approval-sla-breached-kpi',
      title: t('sla-approval-breached-rate'),
      triggerTestId: 'backoffice-approval-sla-breached-tooltip-trigger',
      triggerLabel: 'Approval SLA Breached formula',
      tooltip: t('sla-tooltip-approval'),
      value: kpiValues.approvalBreachedRate,
      label: kpiValues.approvalBreachedLabel
    },
    {
      cardTestId: 'backoffice-payout-sla-breached-kpi',
      title: t('sla-payout-breached-rate'),
      triggerTestId: 'backoffice-payout-sla-breached-tooltip-trigger',
      triggerLabel: 'Payout SLA Breached formula',
      tooltip: t('sla-tooltip-payout'),
      value: kpiValues.payoutBreachedRate,
      label: kpiValues.payoutBreachedLabel
    },
    {
      cardTestId: 'backoffice-total-cycle-sla-breached-kpi',
      title: t('sla-total-cycle-breached-rate'),
      triggerTestId: 'backoffice-total-cycle-sla-breached-tooltip-trigger',
      triggerLabel: 'Total Cycle SLA Breached formula',
      tooltip: t('sla-tooltip-total-breached'),
      value: kpiValues.totalBreachedRate,
      label: kpiValues.totalBreachedLabel
    },
    {
      cardTestId: 'backoffice-total-cycle-within-sla-kpi',
      title: t('sla-total-cycle-within-rate'),
      triggerTestId: 'backoffice-total-cycle-within-sla-tooltip-trigger',
      triggerLabel: 'Total Cycle Within SLA formula',
      tooltip: t('sla-tooltip-total-within'),
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
                        <InfoIcon />
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
