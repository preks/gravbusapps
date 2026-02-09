// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React, { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Cake, Trophy, Briefcase } from 'lucide-react'

interface Birthday {
  id: string
}

interface Anniversary {
  id: string
}

interface JobPosition {
  id: string
}

interface PeopleMomentsSectionProps {
  birthdays: Birthday[]
  anniversaries: Anniversary[]
  openPositions: JobPosition[]
  loading: boolean
  onNavigateToInsights: (tab: 'birthdays' | 'anniversaries' | 'open-positions') => void
}

export const PeopleMomentsSection: React.FC<PeopleMomentsSectionProps> = ({
  birthdays,
  anniversaries,
  openPositions,
  loading,
  onNavigateToInsights
}) => {
  const [isOpen, setIsOpen] = useState(false)

  if (loading) {
    return (
      <Card style={{ minHeight: '200px', borderRadius: '12px' }} className="gba:p-5">
        <CardHeader>
          <CardTitle>People & Moments</CardTitle>
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
    <Card data-testid="people-moments-section" style={{ minHeight: '200px', borderRadius: '12px' }} className="gba:p-5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="gba:pb-3">
          <CollapsibleTrigger className="gba:w-full gba:text-left">
            <div className="gba:flex gba:items-center gba:justify-between gba:group">
              <div>
                <CardTitle className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
                  People & Moments
                  {isOpen ? (
                    <ChevronDown size={18} className="gba:text-muted-foreground" />
                  ) : (
                    <ChevronRight size={18} className="gba:text-muted-foreground" />
                  )}
                </CardTitle>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {totalMoments} {totalMoments === 1 ? 'moment' : 'moments'} this month
                </p>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="gba:space-y-2 gba:pt-0">
            {/* Birthdays */}
            <button
              onClick={() => onNavigateToInsights('birthdays')}
              className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:hover:bg-muted gba:transition-colors gba:text-left"
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <Cake size={20} className="gba:text-muted-foreground" />
                <div>
                  <p className="gba:font-medium gba:text-sm">Birthdays</p>
                  <p className="gba:text-xs gba:text-muted-foreground">This month</p>
                </div>
              </div>
              <div className="gba:text-right">
                <p className="gba:text-lg gba:font-bold">{birthdays.length}</p>
              </div>
            </button>

            {/* Anniversaries */}
            <button
              onClick={() => onNavigateToInsights('anniversaries')}
              className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:hover:bg-muted gba:transition-colors gba:text-left"
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <Trophy size={20} className="gba:text-muted-foreground" />
                <div>
                  <p className="gba:font-medium gba:text-sm">Anniversaries</p>
                  <p className="gba:text-xs gba:text-muted-foreground">This month</p>
                </div>
              </div>
              <div className="gba:text-right">
                <p className="gba:text-lg gba:font-bold">{anniversaries.length}</p>
              </div>
            </button>

            {/* Open Positions */}
            <button
              onClick={() => onNavigateToInsights('open-positions')}
              className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:hover:bg-muted gba:transition-colors gba:text-left"
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <Briefcase size={20} className="gba:text-muted-foreground" />
                <div>
                  <p className="gba:font-medium gba:text-sm">Open Positions</p>
                  <p className="gba:text-xs gba:text-muted-foreground">Recruiting</p>
                </div>
              </div>
              <div className="gba:text-right">
                <p className="gba:text-lg gba:font-bold">{openPositions.length}</p>
              </div>
            </button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
