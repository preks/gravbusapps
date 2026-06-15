import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  Badge,
  Avatar,
  AvatarFallback
} from '@newwork/nw-design-system'
import { UsersThreeIcon } from '@phosphor-icons/react'
import { type TopTeam } from '../types'

interface TopTeamsCardProps {
  topTeams: TopTeam[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const DATA_TEST_ID_PREFIX = 'top-teams-card'

const getRankBadgeVariant = (index: number): 'default' | 'secondary' | 'outline' => {
  switch (index) {
    case 0:
      return 'default'
    case 1:
      return 'secondary'
    default:
      return 'outline'
  }
}

const getTeamInitials = (name: string): string => {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

/**
 * Top Teams Card showing top 5 teams (business units) by revenue
 */
export const TopTeamsCard: React.FC<TopTeamsCardProps> = ({ topTeams, isLoading = false, error = null, onRetry }) => {
  const formatCurrency = (amount: number, currencyCode: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  if (isLoading) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <UsersThreeIcon className="gba:text-info" />
            Top Teams by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[250px]">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <UsersThreeIcon className="gba:text-info" />
            Top Teams by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[250px]">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
            {onRetry && (
              <Button size="sm" onClick={onRetry} className="gba:mt-2">
                Retry
              </Button>
            )}
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (topTeams.length === 0) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-empty`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <UsersThreeIcon className="gba:text-info" />
            Top Teams by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[250px] gba:text-muted-foreground">
          No team performance data available yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX} className="gba:h-full">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <UsersThreeIcon className="gba:text-info" />
          Top Teams by Revenue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-3">
          {topTeams.map((team, index) => (
            <div
              key={team.id}
              className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-lg gba:bg-muted/50 gba:hover:bg-muted/80 gba:transition-colors gba:min-h-[60px]"
              data-testid={`${DATA_TEST_ID_PREFIX}-item-${team.id}`}
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <Badge
                  variant={getRankBadgeVariant(index)}
                  className="gba:w-6 gba:h-6 gba:flex gba:items-center gba:justify-center gba:rounded-full gba:text-xs gba:font-bold gba:shrink-0"
                >
                  {index + 1}
                </Badge>
                <Avatar className="gba:h-9 gba:w-9 gba:shrink-0">
                  <AvatarFallback className="gba:text-xs gba:bg-info/20 gba:text-info-foreground">
                    {getTeamInitials(team.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="gba:min-w-0">
                  <p className="gba:font-medium gba:text-sm gba:truncate">{team.name}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {team.memberCount} members · {team.opportunitiesWon} opportunities
                  </p>
                </div>
              </div>
              <div className="gba:text-right gba:shrink-0 gba:ml-2">
                <p className="gba:font-semibold gba:text-success">{formatCurrency(team.revenue, team.currencyCode)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default TopTeamsCard
