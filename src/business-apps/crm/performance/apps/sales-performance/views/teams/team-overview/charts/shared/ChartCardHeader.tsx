import React from 'react'
import { CardTitle, IconAvatar } from '@newwork/nw-design-system'

interface ChartCardHeaderProps {
  icon: React.ElementType
  title: string
  controls?: React.ReactNode
}

export const ChartCardHeader: React.FC<ChartCardHeaderProps> = ({ icon: Icon, title, controls }) => (
  <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
    <CardTitle className="gba:flex gba:shrink-0 gba:items-center gba:gap-2 gba:whitespace-nowrap">
      <IconAvatar icon={Icon} variant="default" size="md" decorative />
      {title}
    </CardTitle>
    {controls ? <div className="gba:ml-auto gba:shrink-0">{controls}</div> : null}
  </div>
)
