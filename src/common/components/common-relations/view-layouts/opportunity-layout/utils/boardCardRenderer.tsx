import React from 'react'
import { Calendar, Building2, Clock } from 'lucide-react'
import { UserOutlined } from '@ant-design/icons'
import { formatNumberFunction } from '@/common/utils/windowUtils'

/**
 * Base interface for opportunities displayed in board cards
 */
export interface OpportunityCardData {
  id: string
  name?: string | null
  closeDate?: string | null
  createdAt?: string | null
  estimatedAmount?: number | null
  forecastedProfitAmount?: number | null
  account?: {
    name?: string | null
  } | null
  ownerEmployee?: {
    firstName?: string | null
    lastName?: string | null
    displayName?: string | null
  } | null
}

interface OpportunityBoardCardProps {
  opportunity: OpportunityCardData
  preferForecastedProfit?: boolean
}

export const OpportunityBoardCard: React.FC<OpportunityBoardCardProps> = ({
  opportunity: opp,
  preferForecastedProfit = false
}) => {
  let formattedCloseDate = ''
  if (opp.closeDate) {
    const closeDate = new Date(opp.closeDate)
    formattedCloseDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(closeDate)
  }

  let formattedCreatedAt = ''
  if (opp.createdAt) {
    const createdDate = new Date(opp.createdAt)
    formattedCreatedAt = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(createdDate)
  }

  const amount = preferForecastedProfit
    ? opp.forecastedProfitAmount || opp.estimatedAmount || 0
    : opp.estimatedAmount || 0
  const formattedAmount = formatNumberFunction(amount, '0.0a').toUpperCase()
  const companyName = opp.account?.name || ''
  const ownerName =
    opp.ownerEmployee?.firstName && opp.ownerEmployee?.lastName
      ? `${opp.ownerEmployee.firstName} ${opp.ownerEmployee.lastName}`
      : opp.ownerEmployee?.displayName || ''

  return (
    <div
      className="gba:bg-white gba:dark:bg-gray-800 gba:rounded-md gba:shadow-sm gba:border gba:border-gray-200 gba:dark:border-gray-700 gba:flex gba:flex-col"
      data-testid={`opportunity-card-${opp.id}`}
    >
      <div className="gba:p-3 gba:space-y-2">
        <div>
          <h4 className="gba:font-medium gba:text-sm gba:line-clamp-2">
            <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:dark:text-gray-100">
              {opp.name || 'Unnamed Opportunity'}
            </span>
          </h4>
          <p className="gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:line-clamp-1 gba:mt-1">
            {companyName}
          </p>
        </div>

        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-md gba:font-bold gba:text-gray-900 gba:dark:text-gray-100">{formattedAmount}</span>
          {formattedCloseDate && (
            <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
              <Calendar className="gba:h-3 gba:w-3 gba:mr-1" />
              {formattedCloseDate}
            </div>
          )}
        </div>
      </div>

      <div className="gba:p-3 gba:pt-0 gba:border-t gba:border-gray-100 gba:dark:border-gray-800">
        {companyName && (
          <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:mb-2">
            <Building2 className="gba:h-3 gba:w-3 gba:mr-1" />
            {companyName}
          </div>
        )}

        <div className="gba:flex gba:justify-between gba:items-center">
          {ownerName && (
            <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
              <UserOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
              {ownerName}
            </div>
          )}

          {formattedCreatedAt && (
            <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:ml-auto">
              <Clock className="gba:h-3 gba:w-3 gba:mr-1" />
              {formattedCreatedAt}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Factory function to create a board card renderer with specific configuration
 */
export const createBoardCardRenderer = (config?: { preferForecastedProfit?: boolean }) => {
  return (opportunity: OpportunityCardData) => (
    <OpportunityBoardCard opportunity={opportunity} preferForecastedProfit={config?.preferForecastedProfit} />
  )
}
