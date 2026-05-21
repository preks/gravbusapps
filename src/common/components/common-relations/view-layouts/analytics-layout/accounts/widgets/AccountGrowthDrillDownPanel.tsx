import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, IconAvatar } from '@newwork/nw-design-system'
import { BankIcon, XIcon } from '@phosphor-icons/react'
import type { GrowthBarSelection } from '../../hooks/useAccountGrowthDrillDownState'
import { GROWTH_METRIC_LABELS } from '../../hooks/useAccountGrowthDrillDownState'

export interface AccountGrowthDrillDownPanelProps {
  selection: GrowthBarSelection
  onClose: () => void
  moduleColor?: string
  children: React.ReactNode
  titleOverride?: string
}

export const AccountGrowthDrillDownPanel: React.FC<AccountGrowthDrillDownPanelProps> = ({
  selection,
  onClose,
  moduleColor = 'default',
  children,
  titleOverride
}) => {
  const metricLabel = GROWTH_METRIC_LABELS[selection.metric as keyof typeof GROWTH_METRIC_LABELS] ?? selection.metric
  const title = titleOverride ?? `${metricLabel} in ${selection.month}`

  return (
    <Card data-testid="account-growth-drilldown-panel" className="gba:w-full">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={BankIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative />
          <div>
            <CardTitle>{title}</CardTitle>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close account growth drill-down panel"
          data-testid="account-growth-drilldown-close"
          onClick={onClose}
          className="gba:flex gba:items-center gba:justify-center gba:rounded-md gba:p-1 gba:text-muted-foreground gba:transition-colors hover:gba:bg-accent hover:gba:text-accent-foreground"
        >
          <XIcon size={20} />
        </button>
      </CardHeader>
      <CardContent className="gba:px-6 gba:pb-6 gba:pt-0">{children}</CardContent>
    </Card>
  )
}

export default AccountGrowthDrillDownPanel
