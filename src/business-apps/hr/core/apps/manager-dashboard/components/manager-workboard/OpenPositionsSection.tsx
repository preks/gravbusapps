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
  onNavigateToOpenPositions: () => void
}

export const OpenPositionsSection: React.FC<OpenPositionsSectionProps> = ({
  openPositions,
  loading,
  onNavigateToOpenPositions
}) => {
  if (loading) {
    return (
      <Card className="gba:rounded-xl gba:p-4">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base">Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-2">
            <div className="gba:h-6 gba:bg-muted gba:rounded" />
            <div className="gba:h-4 gba:bg-muted gba:rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="open-positions-section" className="gba:rounded-xl gba:p-4 gba:h-full">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">Open Positions</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">Recruiting pipeline</p>
      </CardHeader>
      <CardContent className="gba:space-y-2">
        {/* Main Metric */}
        <div className="gba:flex gba:items-center gba:gap-3">
          <p className="gba:text-2xl gba:font-bold">{openPositions.length}</p>
          <p className="gba:text-xs gba:text-muted-foreground">open positions</p>
        </div>

        {/* Action Button */}
        <Button
          onClick={onNavigateToOpenPositions}
          variant="outline"
          size="sm"
          className="gba:w-full gba:h-8"
          disabled={openPositions.length === 0}
        >
          <Briefcase size={14} className="gba:mr-1.5" />
          Manage positions
        </Button>
      </CardContent>
    </Card>
  )
}
