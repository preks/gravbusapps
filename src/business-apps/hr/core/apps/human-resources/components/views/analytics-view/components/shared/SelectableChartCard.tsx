import React from 'react'
import { Card, CardContent, CardHeader, Badge } from '@newwork/nw-design-system'
import { DEFAULT_CHART_SURFACE_CLASS } from './analyticsChartSurfaceStyles'

export interface SelectableChartCardProps {
  testId: string
  isSelected: boolean
  onSelect: () => void
  title: string
  tag: string
  description: string
  selectedHint?: string
  children: React.ReactNode
}

/**
 * Shared selectable chart card for analytics tabs (HeadcountTrends, TurnoverRetention).
 * Renders a Card with header (title, badge, description, selected hint) and content.
 */
const SelectableChartCard: React.FC<SelectableChartCardProps> = ({
  testId,
  isSelected,
  onSelect,
  title,
  tag,
  description,
  selectedHint,
  children
}) => (
  <Card
    data-testid={`${testId}-card`}
    className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:shadow-sm ${
      isSelected ? 'gba:ring-2 gba:ring-info gba:shadow-lg' : 'gba:hover:shadow-lg'
    }`}
    onClick={onSelect}
  >
    <CardHeader className="gba:border-b">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h4 className="gba:m-0 gba:text-lg gba:font-semibold gba:text-foreground">
            {title}
          </h4>
        </div>
        <Badge variant="outline" className="gba:text-xs">
          {tag}
        </Badge>
      </div>
      <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">{description}</p>
      {isSelected && selectedHint && <p className="gba:text-xs gba:text-info gba:mt-1">{selectedHint}</p>}
    </CardHeader>
    <CardContent>
      <div className={`gba:h-64 ${DEFAULT_CHART_SURFACE_CLASS}`}>{children}</div>
    </CardContent>
  </Card>
)

export default SelectableChartCard
