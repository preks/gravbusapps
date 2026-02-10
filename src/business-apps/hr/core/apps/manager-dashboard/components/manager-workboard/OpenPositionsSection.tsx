// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { Briefcase } from 'lucide-react'

interface JobPosition {
  id: string
  estimatedMonthlyCost?: number
}

interface OpenPositionsSectionProps {
  openPositions: JobPosition[]
  loading: boolean
  onNavigateToInsights: (tab: 'open-positions') => void
}

export const OpenPositionsSection: React.FC<OpenPositionsSectionProps> = ({
  openPositions,
  loading,
  onNavigateToInsights
}) => {
  if (loading) {
    return (
      <Card style={{ minHeight: '220px', borderRadius: '12px' }} className="gba:p-5">
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-3">
            <div className="gba:h-8 gba:bg-muted gba:rounded" />
            <div className="gba:h-4 gba:bg-muted gba:rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalEstimatedCost = openPositions.reduce((sum, pos) => sum + (pos.estimatedMonthlyCost || 0), 0)

  return (
    <Card data-testid="open-positions-section" style={{ minHeight: '220px', borderRadius: '12px' }} className="gba:p-5">
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-lg gba:font-semibold">Open Positions</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">Recruiting pipeline</p>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Main Metric */}
        <div>
          <div className="gba:flex gba:items-baseline gba:justify-between gba:mb-2">
            <div>
              <p className="gba:text-3xl gba:font-bold">{openPositions.length}</p>
              <p className="gba:text-sm gba:text-muted-foreground">open positions</p>
            </div>
          </div>
          {totalEstimatedCost > 0 && (
            <p className="gba:text-xs gba:text-muted-foreground">
              Estimated cost: €{totalEstimatedCost.toLocaleString()}/mo
            </p>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={() => onNavigateToInsights('open-positions')}
          variant="outline"
          className="gba:w-full"
          disabled={openPositions.length === 0}
        >
          <Briefcase size={16} className="gba:mr-2" />
          Manage positions
        </Button>

        {/* Status message */}
        {openPositions.length === 0 && (
          <div className="gba:p-3 gba:bg-success/10 gba:border gba:border-success/20 gba:rounded-lg">
            <p className="gba:text-sm gba:text-success gba:font-medium">No open positions</p>
          </div>
        )}
        {openPositions.length > 0 && (
          <div className="gba:p-3 gba:bg-warning/10 gba:border gba:border-warning/20 gba:rounded-lg">
            <p className="gba:text-sm gba:text-warning gba:font-medium">
              {openPositions.length} {openPositions.length === 1 ? 'position' : 'positions'} to fill
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
