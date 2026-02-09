// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@newwork/nw-design-system'
import { Briefcase, Users } from 'lucide-react'

interface JobPosition {
  id: string
}

interface WorkCapacitySectionProps {
  utilizationPercent: number
  idleCount: number
  openPositions: JobPosition[]
  loading: boolean
  onNavigateToUnallocatedTeammates: () => void
  onNavigateToInsights: (tab: 'open-positions') => void
}

export const WorkCapacitySection: React.FC<WorkCapacitySectionProps> = ({
  utilizationPercent,
  idleCount,
  openPositions,
  loading,
  onNavigateToUnallocatedTeammates,
  onNavigateToInsights
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
      <CardHeader>
        <CardTitle className="gba:text-lg gba:font-semibold">Work & Capacity</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">Team utilization overview</p>
      </CardHeader>
      <CardContent className="gba:space-y-4">
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

        {/* Action Buttons */}
        <div className="gba:space-y-2">
          <Button
            onClick={onNavigateToUnallocatedTeammates}
            variant="default"
            className="gba:w-full"
            disabled={idleCount === 0}
          >
            <Briefcase size={16} className="gba:mr-2" />
            Assign project
          </Button>
          <Button onClick={onNavigateToUnallocatedTeammates} variant="outline" className="gba:w-full">
            Request work
          </Button>
        </div>

        {/* Open Positions */}
        {openPositions.length > 0 && (
          <div className="gba:pt-4 gba:border-t">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Users size={16} className="gba:text-muted-foreground" />
                <p className="gba:text-sm gba:font-medium">{openPositions.length} open positions</p>
              </div>
              <button
                onClick={() => onNavigateToInsights('open-positions')}
                className="gba:text-xs gba:text-primary gba:hover:underline"
              >
                Manage →
              </button>
            </div>
          </div>
        )}

        {/* Status message */}
        {idleCount === 0 && utilizationPercent > 80 && (
          <div className="gba:p-3 gba:bg-success/10 gba:border gba:border-success/20 gba:rounded-lg">
            <p className="gba:text-sm gba:text-success gba:font-medium">Team fully utilized</p>
          </div>
        )}
        {idleCount > 0 && (
          <div className="gba:p-3 gba:bg-warning/10 gba:border gba:border-warning/20 gba:rounded-lg">
            <p className="gba:text-sm gba:text-warning gba:font-medium">
              {idleCount} {idleCount === 1 ? 'person' : 'people'} available for work
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
