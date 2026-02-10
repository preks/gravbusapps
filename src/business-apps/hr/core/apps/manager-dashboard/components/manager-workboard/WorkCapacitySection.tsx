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
      <Card style={{ minHeight: '220px', borderRadius: '12px' }} className="gba:p-5">
        <CardHeader>
          <CardTitle>Work & Capacity</CardTitle>
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

  return (
    <Card data-testid="work-capacity-section" style={{ minHeight: '220px', borderRadius: '12px' }} className="gba:p-5">
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-lg gba:font-semibold">Work & Capacity</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">Team utilization overview</p>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Capacity Utilization */}
        <div>
          <div className="gba:flex gba:items-baseline gba:justify-between gba:mb-2">
            <div>
              <p className="gba:text-3xl gba:font-bold">{utilizationPercent}%</p>
              <p className="gba:text-sm gba:text-muted-foreground">capacity utilized</p>
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
          className="gba:w-full"
          disabled={idleCount === 0}
        >
          <Briefcase size={16} className="gba:mr-2" />
          Assign project
        </Button>
      </CardContent>
    </Card>
  )
}
