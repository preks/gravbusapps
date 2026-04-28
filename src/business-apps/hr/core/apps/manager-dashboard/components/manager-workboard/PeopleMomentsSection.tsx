// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { Cake, Trophy } from '@phosphor-icons/react'

interface Birthday {
  id: string
}

interface Anniversary {
  id: string
}

interface PeopleMomentsSectionProps {
  birthdays: Birthday[]
  anniversaries: Anniversary[]
  loading: boolean
  onNavigateToInsights: (tab: 'birthdays' | 'anniversaries') => void
}

export const PeopleMomentsSection: React.FC<PeopleMomentsSectionProps> = ({
  birthdays,
  anniversaries,
  loading,
  onNavigateToInsights
}) => {
  if (loading) {
    return (
      <Card className="gba:rounded-xl gba:p-4">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base">People & Moments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-2">
            <div className="gba:h-6 gba:bg-muted gba:rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalMoments = birthdays.length + anniversaries.length

  return (
    <Card data-testid="people-moments-section" className="gba:rounded-xl gba:p-4 gba:h-full">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">People & Moments</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">
          {totalMoments} {totalMoments === 1 ? 'moment' : 'moments'} this month
        </p>
      </CardHeader>

      <CardContent className="gba:space-y-2">
        {/* Birthdays */}
        <button
          onClick={() => onNavigateToInsights('birthdays')}
          className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-2.5 gba:border gba:rounded-lg gba:hover:bg-muted gba:transition-colors gba:text-left"
        >
          <div className="gba:flex gba:items-center gba:gap-2.5">
            <Cake size={18} className="gba:text-muted-foreground" />
            <div>
              <p className="gba:font-medium gba:text-xs">Birthdays</p>
              <p className="gba:text-xs gba:text-muted-foreground">This month</p>
            </div>
          </div>
          <div className="gba:text-right">
            <p className="gba:text-base gba:font-bold">{birthdays.length}</p>
          </div>
        </button>

        {/* Anniversaries */}
        <button
          onClick={() => onNavigateToInsights('anniversaries')}
          className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-2.5 gba:border gba:rounded-lg gba:hover:bg-muted gba:transition-colors gba:text-left"
        >
          <div className="gba:flex gba:items-center gba:gap-2.5">
            <Trophy size={18} className="gba:text-muted-foreground" />
            <div>
              <p className="gba:font-medium gba:text-xs">Anniversaries</p>
              <p className="gba:text-xs gba:text-muted-foreground">This month</p>
            </div>
          </div>
          <div className="gba:text-right">
            <p className="gba:text-base gba:font-bold">{anniversaries.length}</p>
          </div>
        </button>
      </CardContent>
    </Card>
  )
}
