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
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge
} from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import { type TopPerformer } from '../types'

interface NeedsAttentionEmployeesCardProps {
  employees: TopPerformer[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const DATA_TEST_ID_PREFIX = 'needs-attention-employees-card'

const getInitials = (name: string): string => {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

/**
 * Get the proper image source for employee pictures
 */
const getImageSrc = (picture?: string): string | undefined => {
  if (!picture) return undefined
  if (picture.startsWith('data:') || picture.startsWith('http')) {
    return picture
  }
  return `data:image/jpeg;base64,${picture}`
}

/**
 * Needs Attention Employees Card showing bottom 5 individual performers by revenue
 * These employees may need additional support or training
 */
export const NeedsAttentionEmployeesCard: React.FC<NeedsAttentionEmployeesCardProps> = ({
  employees,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const formatCurrency = (amount: number, currencyCode: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  if (isLoading) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <WarningIcon className="gba:text-warning" />
            Employees Needing Attention
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
            <WarningIcon className="gba:text-warning" />
            Employees Needing Attention
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

  if (employees.length === 0) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-empty`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <WarningIcon className="gba:text-warning" />
            Employees Needing Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[250px] gba:text-muted-foreground">
          No employees with low performance data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX} className="gba:h-full">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <WarningIcon className="gba:text-warning" />
          Employees Needing Attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-3">
          {employees.map((employee, index) => (
            <div
              key={employee.id}
              className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-lg gba:bg-warning-secondary/30 gba:hover:bg-warning-secondary/50 gba:transition-colors gba:min-h-[60px]"
              data-testid={`${DATA_TEST_ID_PREFIX}-item-${employee.id}`}
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <Badge
                  variant="outline"
                  className="gba:w-6 gba:h-6 gba:flex gba:items-center gba:justify-center gba:rounded-full gba:text-xs gba:font-bold gba:shrink-0 gba:border-warning gba:text-warning"
                >
                  {index + 1}
                </Badge>
                <Avatar className="gba:h-9 gba:w-9 gba:shrink-0">
                  {(employee.pictureThumbnail || employee.picture) && (
                    <AvatarImage
                      src={getImageSrc(employee.pictureThumbnail || employee.picture)}
                      alt={employee.displayName}
                    />
                  )}
                  <AvatarFallback className="gba:text-xs">{getInitials(employee.displayName)}</AvatarFallback>
                </Avatar>
                <div className="gba:min-w-0">
                  <p className="gba:font-medium gba:text-sm gba:truncate">{employee.displayName}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">{employee.dealsWon} deals won</p>
                </div>
              </div>
              <div className="gba:text-right gba:shrink-0 gba:ml-2">
                <p className="gba:font-semibold gba:text-warning">
                  {formatCurrency(employee.revenue, employee.currencyCode)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default NeedsAttentionEmployeesCard
