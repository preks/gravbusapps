import React from 'react'

interface ChartEmptyOverlayProps {
  icon: React.ElementType
  title: string
  description: string
  testId?: string
}

export const ChartEmptyOverlay: React.FC<ChartEmptyOverlayProps> = ({
  icon: Icon,
  title,
  description,
  testId = 'team-chart-empty-overlay'
}) => (
  <div
    className="gba:pointer-events-none gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:px-6 gba:text-center"
    data-testid={testId}
  >
    <Icon size={40} className="gba:text-muted-foreground" />
    <h3 className="gba:text-sm gba:font-medium gba:text-foreground">{title}</h3>
    <p className="gba:text-sm gba:text-muted-foreground">{description}</p>
  </div>
)
