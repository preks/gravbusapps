/**
 * AssetAllocationHistory Component
 * Displays allocation/deallocation timeline for an asset
 */

import React from 'react'
import { AssetAllocation } from '../types'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system'
import { UserIcon, CalendarIcon, CheckCircleIcon } from '@phosphor-icons/react'

interface AssetAllocationHistoryProps {
  allocations: AssetAllocation[]
  isLoading?: boolean
}

// Format date
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Calculate duration
const calculateDuration = (startDate: string, endDate?: string): string => {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 30) {
    return `${diffDays} days`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  } else {
    const years = Math.floor(diffDays / 365)
    const remainingMonths = Math.floor((diffDays % 365) / 30)
    return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`
  }
}

export const AssetAllocationHistory: React.FC<AssetAllocationHistoryProps> = ({ allocations, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card data-testid="asset-allocation-history-loading">
        <CardContent className="gba:py-8 gba:text-center">Loading allocation history...</CardContent>
      </Card>
    )
  }

  if (allocations.length === 0) {
    return (
      <Card data-testid="asset-allocation-history-empty">
        <CardContent className="gba:py-8 gba:text-center gba:text-muted-foreground">
          No allocation history available for this asset.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="asset-allocation-history">
      <CardHeader>
        <CardTitle>Allocation History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          {allocations.map(allocation => (
            <div
              key={allocation.id}
              className="gba:border-l-2 gba:border-primary gba:pl-4 gba:pb-4"
              data-testid={`allocation-item-${allocation.id}`}
            >
              {/* Allocation Header */}
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <UserIcon size={20} className="gba:text-primary" />
                <span className="gba:font-medium">{allocation.employeeName}</span>
                {!allocation.endDate && (
                  <Badge variant="success" data-testid={`allocation-active-${allocation.id}`}>
                    Current
                  </Badge>
                )}
              </div>

              {/* Date Range */}
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-2">
                <CalendarIcon size={16} />
                <span>
                  {formatDate(allocation.startDate)}
                  {allocation.endDate ? (
                    <>
                      {' → '}
                      {formatDate(allocation.endDate)}
                    </>
                  ) : (
                    ' → Present'
                  )}
                </span>
                <span className="gba:text-xs">({calculateDuration(allocation.startDate, allocation.endDate)})</span>
              </div>

              {/* Condition Information */}
              {allocation.conditionStart && (
                <div className="gba:text-sm gba:mb-1">
                  <span className="gba:font-medium">Start Condition: </span>
                  <span className="gba:text-muted-foreground">{allocation.conditionStart}</span>
                </div>
              )}

              {allocation.conditionEnd && (
                <div className="gba:text-sm gba:mb-1">
                  <span className="gba:font-medium">Return Condition: </span>
                  <span className="gba:text-muted-foreground">{allocation.conditionEnd}</span>
                </div>
              )}

              {/* Expected End Date */}
              {!allocation.endDate && (
                <div className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <CheckCircleIcon size={16} />
                  <span>Expected return: {formatDate(allocation.expectedEndDate)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
