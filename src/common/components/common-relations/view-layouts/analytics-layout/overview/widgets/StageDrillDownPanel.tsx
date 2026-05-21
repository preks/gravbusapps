import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, IconAvatar } from '@newwork/nw-design-system'
import { ChartBarIcon, XIcon } from '@phosphor-icons/react'

export interface StageDrillDownPanelProps {
  stage: string
  onClose: () => void
  moduleColor?: string
  children: React.ReactNode
  titleOverride?: string
}

export const StageDrillDownPanel: React.FC<StageDrillDownPanelProps> = ({
  stage,
  onClose,
  moduleColor = 'default',
  children,
  titleOverride
}) => {
  return (
    <Card data-testid="stage-drill-down-panel" className="gba:w-full">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar
            icon={ChartBarIcon}
            variant={moduleColor as any}
            size="md"
            iconWeight="regular"
            decorative={true}
          />
          <div>
            <CardTitle>{titleOverride ?? `Opportunities in ${stage}`}</CardTitle>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close stage drill-down panel"
          data-testid="stage-drill-down-panel-close"
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

export default StageDrillDownPanel
