import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, IconAvatar } from '@newwork/nw-design-system'
import { UsersIcon, XIcon } from '@phosphor-icons/react'
import type { LeadFilterType } from '../../hooks/useLeadDrillDownState'

export interface LeadDrillDownPanelProps {
  label: string
  filterType: LeadFilterType
  onClose: () => void
  moduleColor?: string
  children: React.ReactNode
}

export const LeadDrillDownPanel: React.FC<LeadDrillDownPanelProps> = ({
  label,
  filterType,
  onClose,
  moduleColor = 'default',
  children
}) => {
  const title = filterType === 'source' ? `Leads from ${label}` : `Leads with status: ${label}`

  return (
    <Card data-testid="lead-drill-down-panel" className="gba:w-full">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={UsersIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
          <div>
            <CardTitle>{title}</CardTitle>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close lead drill-down panel"
          data-testid="lead-drill-down-panel-close"
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

export default LeadDrillDownPanel
