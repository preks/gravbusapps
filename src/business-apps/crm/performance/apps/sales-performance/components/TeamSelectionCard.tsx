import React from 'react'
import { Card, Button, cn } from '@newwork/nw-design-system'
import { UsersIcon, TargetIcon, TrophyIcon, DollarSignIcon, XIcon, EyeIcon, EyeOffIcon } from 'lucide-react'
import { type TeamComparisonData } from '../types'

interface TeamSelectionCardProps {
  team: TeamComparisonData
  isActive: boolean
  onToggleActive: (teamId: string) => void
  onRemove: (teamId: string) => void
}

const DATA_TEST_ID_PREFIX = 'team-selection-card'

/**
 * Formats currency value in compact notation (e.g., $890k)
 */
const formatCurrency = (value: number, currencyCode: string = 'EUR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    notation: 'compact',
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Team Selection Card Component
 * Displays team performance metrics stacked vertically
 * Click to toggle visibility in chart (active/inactive state)
 * Shows color indicator matching chart line color
 */
export const TeamSelectionCard: React.FC<TeamSelectionCardProps> = ({ team, isActive, onToggleActive, onRemove }) => {
  const handleCardClick = () => {
    onToggleActive(team.id)
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(team.id)
  }

  return (
    <Card
      className={cn(
        'gba:cursor-pointer gba:transition-all gba:duration-200 gba:p-4 gba:relative',
        'gba:hover:shadow-lg',
        !isActive && 'gba:opacity-40 gba:grayscale'
      )}
      onClick={handleCardClick}
      data-testid={`${DATA_TEST_ID_PREFIX}-${team.id}`}
    >
      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        className="gba:absolute gba:top-2 gba:right-2 gba:h-6 gba:w-6 gba:opacity-60 gba:hover:opacity-100"
        onClick={handleRemoveClick}
        data-testid={`${DATA_TEST_ID_PREFIX}-remove-${team.id}`}
      >
        <XIcon className="gba:h-4 gba:w-4" />
      </Button>

      {/* Header: Team Name */}
      <div className="gba:flex gba:items-start gba:justify-between gba:mb-4 gba:pr-6">
        <div className="gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2">
            {/* Color indicator */}
            <div
              className="gba:w-3 gba:h-3 gba:rounded-full gba:flex-shrink-0"
              style={{ backgroundColor: team.color }}
            />
            <h3 className="gba:font-semibold gba:text-foreground gba:text-base">{team.name}</h3>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:ml-5">{team.leadName}</p>
        </div>
      </div>

      {/* Active/Inactive Indicator */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3 gba:text-xs">
        {isActive ? (
          <EyeIcon className="gba:h-3.5 gba:w-3.5 gba:text-success" />
        ) : (
          <EyeOffIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
        )}
        <span className={isActive ? 'gba:text-success' : 'gba:text-muted-foreground'}>
          {isActive ? 'Visible in chart' : 'Hidden from chart'}
        </span>
      </div>

      {/* KPIs Stacked Vertically */}
      <div className="gba:space-y-3">
        {/* Revenue */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <DollarSignIcon className="gba:h-3.5 gba:w-3.5" />
            <span>Revenue</span>
          </div>
          <span className="gba:font-semibold gba:text-foreground">
            {formatCurrency(team.revenue, team.currencyCode)}
          </span>
        </div>

        {/* Members */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <UsersIcon className="gba:h-3.5 gba:w-3.5" />
            <span>Members</span>
          </div>
          <span className="gba:font-semibold gba:text-foreground">{team.memberCount}</span>
        </div>

        {/* Deals (Total Opportunities) */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <TargetIcon className="gba:h-3.5 gba:w-3.5" />
            <span>Deals</span>
          </div>
          <span className="gba:font-semibold gba:text-foreground">{team.dealsCount}</span>
        </div>

        {/* Won Deals */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <TrophyIcon className="gba:h-3.5 gba:w-3.5 gba:text-success" />
            <span>Won Deals</span>
          </div>
          <span className="gba:font-semibold gba:text-success">{team.wonDealsCount}</span>
        </div>

        {/* Win Rate */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <TrophyIcon className="gba:h-3.5 gba:w-3.5" />
            <span>Win Rate</span>
          </div>
          <span className="gba:font-semibold gba:text-foreground">{team.winRate.toFixed(0)}%</span>
        </div>
      </div>
    </Card>
  )
}

export default TeamSelectionCard
