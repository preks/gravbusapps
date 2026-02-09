// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { AlertCircle, Users, Target, Clock } from 'lucide-react'

interface PriorityItem {
  id: number
  text: string
  type: 'warning' | 'success' | 'info'
}

interface TodaysPrioritiesSectionProps {
  items: PriorityItem[]
  loading: boolean
  counts: {
    onLeave: number
    sickLeaves: number
    unallocated: number
    withoutGoals: number
    goalsBehind: number
    notClockedIn: number
    remote: number
    upcomingAnniversaries: number
  }
  unallocatedDailyCost?: number
  onNavigateToUnallocatedTeammates: () => void
  onNavigateToTeamPerformance: () => void
  onNavigateToNotClockedIn: () => void
}

export const TodaysPrioritiesSection: React.FC<TodaysPrioritiesSectionProps> = ({
  items,
  loading,
  counts,
  unallocatedDailyCost = 0,
  onNavigateToUnallocatedTeammates,
  onNavigateToTeamPerformance,
  onNavigateToNotClockedIn
}) => {
  if (loading) {
    return (
      <Card style={{ minHeight: '280px', borderRadius: '12px' }} className="gba:p-5">
        <CardHeader>
          <CardTitle>Today's Priorities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-3">
            <div className="gba:h-12 gba:bg-muted gba:rounded" />
            <div className="gba:h-12 gba:bg-muted gba:rounded" />
            <div className="gba:h-12 gba:bg-muted gba:rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      data-testid="todays-priorities-section"
      style={{
        minHeight: '280px',
        maxHeight: '420px',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
      className="gba:p-5 gba:flex gba:flex-col"
    >
      <CardHeader className="gba:flex-none">
        <CardTitle className="gba:text-lg gba:font-semibold">Today's Priorities</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">AI-driven insights ranked by urgency</p>
      </CardHeader>
      <CardContent className="gba:space-y-3 gba:overflow-y-auto gba:flex-1">
        {/* Priority 1: Unallocated team members */}
        {counts.unallocated > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg">
            <div className="gba:flex gba:items-start gba:gap-3">
              <AlertCircle className="gba:text-muted-foreground gba:mt-1" size={20} />
              <div>
                <p className="gba:font-medium">{counts.unallocated} team members unallocated</p>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {unallocatedDailyCost > 0
                    ? `Daily cost: €${unallocatedDailyCost.toLocaleString()}`
                    : 'Impact: delivery & engagement risk'}
                </p>
              </div>
            </div>
            <div className="gba:flex gba:gap-2">
              <Button size="sm" onClick={onNavigateToUnallocatedTeammates}>
                Assign project
              </Button>
            </div>
          </div>
        )}

        {/* Priority 2: Missing goals */}
        {counts.withoutGoals > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg">
            <div className="gba:flex gba:items-start gba:gap-3">
              <Target className="gba:text-muted-foreground gba:mt-1" size={20} />
              <div>
                <p className="gba:font-medium">{counts.withoutGoals} team members have no goals</p>
                <p className="gba:text-sm gba:text-muted-foreground">Deadline: end of week</p>
              </div>
            </div>
            <div className="gba:flex gba:gap-2">
              <Button size="sm" onClick={onNavigateToTeamPerformance}>
                Set goals
              </Button>
            </div>
          </div>
        )}

        {/* Priority 3: Goals behind */}
        {counts.goalsBehind > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg">
            <div className="gba:flex gba:items-start gba:gap-3">
              <AlertCircle className="gba:text-muted-foreground gba:mt-1" size={20} />
              <div>
                <p className="gba:font-medium">{counts.goalsBehind} goals behind target</p>
                <p className="gba:text-sm gba:text-muted-foreground">Requires immediate attention</p>
              </div>
            </div>
            <div className="gba:flex gba:gap-2">
              <Button size="sm" variant="destructive" onClick={onNavigateToTeamPerformance}>
                Review blockers
              </Button>
            </div>
          </div>
        )}

        {/* Priority 4: Not clocked in */}
        {counts.notClockedIn > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg">
            <div className="gba:flex gba:items-start gba:gap-3">
              <Clock className="gba:text-muted-foreground gba:mt-1" size={20} />
              <div>
                <p className="gba:font-medium">{counts.notClockedIn} people not clocked in</p>
                <p className="gba:text-sm gba:text-muted-foreground">Pre-10:30 AM</p>
              </div>
            </div>
            <div className="gba:flex gba:gap-2">
              <Button size="sm" variant="outline" onClick={onNavigateToNotClockedIn}>
                View timesheets
              </Button>
            </div>
          </div>
        )}

        {/* AI Insights if available */}
        {items.length > 0 && (
          <div className="gba:mt-4 gba:pt-4 gba:border-t">
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">AI Insights:</p>
            {items.slice(0, 3).map(item => (
              <p key={item.id} className="gba:text-sm gba:mb-1">
                • {item.text}
              </p>
            ))}
          </div>
        )}

        {/* Empty state */}
        {counts.unallocated === 0 &&
          counts.withoutGoals === 0 &&
          counts.goalsBehind === 0 &&
          counts.notClockedIn === 0 && (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              <Users size={48} className="gba:mx-auto gba:mb-2 gba:opacity-50" />
              <p className="gba:font-medium">All clear!</p>
              <p className="gba:text-sm">No urgent priorities at the moment</p>
            </div>
          )}
      </CardContent>
    </Card>
  )
}
