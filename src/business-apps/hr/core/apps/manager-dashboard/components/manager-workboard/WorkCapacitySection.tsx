// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@newwork/nw-design-system'
import { Briefcase } from 'lucide-react'

interface WorkCapacitySectionProps {
  utilizationPercent: number
  idleCount: number
  loading: boolean
  onNavigateToUnallocatedTeammates: () => void
}

export const WorkCapacitySection: React.FC<WorkCapacitySectionProps> = ({
  utilizationPercent,
  idleCount,
  loading,
  onNavigateToUnallocatedTeammates
}) => {
  if (loading) {
    return (
      <Card style={{ borderRadius: '12px' }} className="gba:p-4">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base">Work & Capacity</CardTitle>
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
    <Card data-testid="work-capacity-section" style={{ borderRadius: '12px' }} className="gba:p-4 gba:h-full">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:font-semibold">Work & Capacity</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">Team utilization overview</p>
      </CardHeader>
      <CardContent className="gba:space-y-2.5">
        {/* Capacity Utilization */}
        <div>
          <div className="gba:flex gba:items-baseline gba:justify-between gba:mb-1.5">
            <div>
              <p className="gba:text-2xl gba:font-bold">{utilizationPercent}%</p>
              <p className="gba:text-xs gba:text-muted-foreground">capacity utilized</p>
            </div>
            <div className="gba:text-right">
              <p className="gba:text-lg gba:font-semibold">{idleCount}</p>
              <p className="gba:text-xs gba:text-muted-foreground">people idle</p>
            </div>
          </div>
          <Progress value={utilizationPercent} className="gba:h-2" />
        </div>

        {/* Action Button */}
        <Button
          onClick={onNavigateToUnallocatedTeammates}
          variant="outline"
          size="sm"
          className="gba:w-full gba:h-8"
          disabled={idleCount === 0}
        >
          <Briefcase size={14} className="gba:mr-1.5" />
          Assign project
        </Button>
      </CardContent>
    </Card>
  )
}
