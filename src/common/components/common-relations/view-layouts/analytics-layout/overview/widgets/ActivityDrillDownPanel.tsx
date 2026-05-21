import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, IconAvatar } from '@newwork/nw-design-system'
import { TrendUpIcon, XIcon } from '@phosphor-icons/react'

export interface ActivityDrillDownPanelProps {
  date: string
  onClose: () => void
  moduleColor?: string
  children: React.ReactNode
}

export const ActivityDrillDownPanel: React.FC<ActivityDrillDownPanelProps> = ({
  date,
  onClose,
  moduleColor = 'default',
  children
}) => {
  return (
    <Card data-testid="activity-drill-down-panel" className="gba:w-full">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar
            icon={TrendUpIcon}
            variant={moduleColor as any}
            size="md"
            iconWeight="regular"
            decorative={true}
          />
          <div>
            <CardTitle>Activities on {date}</CardTitle>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close activity drill-down panel"
          data-testid="activity-drill-down-panel-close"
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

export default ActivityDrillDownPanel
