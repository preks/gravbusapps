'use client'

import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { parseBenefitObjectValue } from '../../utils/benefitDetailsUtils'
import AvailableBenefitLayout from './AvailableBenefitLayout'
import ActiveBenefitLayout from './ActiveBenefitLayout'
import ScheduledBenefitLayout from './ScheduledBenefitLayout'

interface BenefitCatalogCardProps extends BusinessAppContextProps {
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Benefit catalog item with merged employee data
   */
  benefit: BenefitCatalogItem
  /**
   * Employee ID for the profile being viewed (NOT the logged-in user)
   */
  employeeId: string
  /**
   * Currency code for formatting amounts
   */
  currencyCode?: string
  /**
   * Locale for formatting currency
   */
  locale: string
  /**
   * Callback when user wants to view benefit details
   */
  onViewDetails?: (benefit: BenefitCatalogItem) => void
}

/**
 * BenefitCatalogCard Component
 *
 * Displays a single benefit from the catalog with:
 * - Status badge (Active/Available/Inactive)
 * - Provider information (if active)
 * - Monetary value (if active)
 * - Action buttons (Request/Deactivate)
 */
const BenefitCatalogCard: React.FC<BenefitCatalogCardProps> = ({
  t,
  benefit,
  employeeId,
  currencyCode = 'EUR',
  locale,
  onViewDetails,
  accessToken
}) => {
  /**
   * Get benefit value display from catalog objectValue
   * Returns the catalog's defined value with proper period suffix
   */
  const getBenefitValueDisplay = (): { amount: number; periodKey: string } | null => {
    // For active/scheduled benefits, prefer catalog value over employee value
    const catalogDetails = parseBenefitObjectValue(benefit.catalogEntry?.objectValue)

    if (catalogDetails.value && catalogDetails.value !== 'none') {
      const amount = Number.parseFloat(catalogDetails.value)

      // Validate that the parsed amount is a valid number
      if (!Number.isFinite(amount)) {
        return null
      }

      const period = catalogDetails.period || 'yearly'
      const periodKey = period === 'monthly' ? 'benefit-per-month' : 'benefit-per-year'

      return { amount, periodKey }
    }

    // Fallback to employee benefit data if catalog value not available
    if (benefit.yearlyAmount) {
      return { amount: benefit.yearlyAmount, periodKey: 'benefit-per-year' }
    }

    if (benefit.monthlyAmount) {
      return { amount: benefit.monthlyAmount, periodKey: 'benefit-per-month' }
    }

    return null
  }

  /**
   * Handle view details action
   */
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(benefit)
    }
  }

  /**
   * Get card styling classes based on benefit status
   */
  const getCardClassName = (): string => {
    const baseClasses = 'gba:p-3 gba:transition-all gba:duration-200'

    if (benefit.isActive) {
      return `${baseClasses} gba:bg-decorative-secondary`
    }

    if (benefit.isScheduled) {
      return `${baseClasses} gba:bg-decorative-secondary`
    }

    return `${baseClasses} gba:border-border gba:hover:border-accent`
  }

  const valueDisplay = benefit.isActive || benefit.isScheduled ? getBenefitValueDisplay() : null

  const isScheduled = benefit.isScheduled
  const cardClassName = [
    getCardClassName(),
    'gba:w-full',
    isScheduled ? 'gba:flex gba:flex-col gba:h-full gba:min-h-0' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Card className={cardClassName} data-testid={`benefit-catalog-card-${benefit.code}`}>
      {/* Available Benefits Layout */}
      {!benefit.isActive && !benefit.isScheduled && (
        <AvailableBenefitLayout
          t={t}
          benefit={benefit}
          employeeId={employeeId}
          locale={locale}
          onViewDetails={handleViewDetails}
          accessToken={accessToken}
        />
      )}

      {/* Active Benefits Layout */}
      {benefit.isActive && (
        <ActiveBenefitLayout
          t={t}
          benefit={benefit}
          employeeId={employeeId}
          currencyCode={currencyCode}
          locale={locale}
          onViewDetails={handleViewDetails}
          accessToken={accessToken}
          valueDisplay={valueDisplay}
        />
      )}

      {/* Scheduled Benefits Layout - wrapper keeps "Scheduled" section fixed at bottom */}
      {benefit.isScheduled && (
        <div className="gba:flex gba:flex-col gba:min-h-0 gba:h-full">
          <ScheduledBenefitLayout
            t={t}
            benefit={benefit}
            currencyCode={currencyCode}
            locale={locale}
            onViewDetails={handleViewDetails}
            valueDisplay={valueDisplay}
          />
        </div>
      )}
    </Card>
  )
}

export default BenefitCatalogCard
