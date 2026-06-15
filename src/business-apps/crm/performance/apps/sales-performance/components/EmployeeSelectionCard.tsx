import React from 'react'
import { Button, cn } from '@newwork/nw-design-system'
import { XIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { type TeamComparisonData } from '../types'

interface EmployeeSelectionCardProps {
  employee: TeamComparisonData
  subtitle?: string
  isActive: boolean
  onToggleActive: (employeeId: string) => void
  onRemove: (employeeId: string) => void
}

const DATA_TEST_ID_PREFIX = 'employee-selection-card'

const formatCurrency = (value: number, currencyCode: string = 'EUR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    notation: 'compact',
    maximumFractionDigits: 0
  }).format(value)
}

export const EmployeeSelectionCard: React.FC<EmployeeSelectionCardProps> = ({
  employee,
  subtitle,
  isActive,
  onToggleActive,
  onRemove
}) => {
  const positionLabel = subtitle || employee.leadName

  const handleCardClick = () => {
    onToggleActive(employee.id)
  }

  const handleRemoveClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onRemove(employee.id)
  }

  return (
    <div
      className={cn(
        'gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:border gba:border-border gba:bg-card gba:px-2 gba:py-1.5',
        'gba:max-w-full',
        !isActive && 'gba:opacity-50'
      )}
    >
      <button
        type="button"
        className={cn(
          'gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:gap-2 gba:border-0 gba:bg-transparent gba:p-0 gba:text-left',
          'gba:cursor-pointer gba:transition-all gba:duration-150 gba:hover:bg-muted/40 gba:rounded-md'
        )}
        onClick={handleCardClick}
        title={`${employee.name} · ${positionLabel} · ${formatCurrency(employee.revenue, employee.currencyCode)} · ${employee.wonOpportunitiesCount} won · ${employee.winRate.toFixed(0)}% win rate`}
        data-testid={`${DATA_TEST_ID_PREFIX}-${employee.id}`}
      >
        <div
          className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:flex-shrink-0"
          style={{ backgroundColor: employee.color }}
        />

        <div className="gba:min-w-0 gba:flex-1">
          <p className="gba:text-xs gba:font-medium gba:text-foreground gba:truncate">{employee.name}</p>
          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{positionLabel}</p>
        </div>

        <div className="gba:hidden gba:sm:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:flex-shrink-0">
          <span className="gba:font-medium gba:text-foreground">
            {formatCurrency(employee.revenue, employee.currencyCode)}
          </span>
          <span>{employee.wonOpportunitiesCount} won</span>
          <span>{employee.winRate.toFixed(0)}%</span>
        </div>

        {isActive ? (
          <EyeIcon className="gba:h-3.5 gba:w-3.5 gba:flex-shrink-0 gba:text-success" aria-hidden />
        ) : (
          <EyeSlashIcon className="gba:h-3.5 gba:w-3.5 gba:flex-shrink-0 gba:text-muted-foreground" aria-hidden />
        )}
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="gba:h-5 gba:w-5 gba:flex-shrink-0 gba:opacity-60 gba:hover:opacity-100"
        onClick={handleRemoveClick}
        data-testid={`${DATA_TEST_ID_PREFIX}-remove-${employee.id}`}
        aria-label={`Remove ${employee.name}`}
      >
        <XIcon className="gba:h-3 gba:w-3" />
      </Button>
    </div>
  )
}

export default EmployeeSelectionCard
