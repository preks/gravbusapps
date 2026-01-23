'use client'

import React from 'react'
import BenefitCatalogCard from './BenefitCatalogCard'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface BenefitsSectionGridProps extends BusinessAppContextProps {
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Benefits to display in the grid
   */
  benefits: BenefitCatalogItem[]
  /**
   * Employee ID to fetch benefits for
   */
  employeeId: string
  /**
   * Default currency code for formatting
   */
  currencyCode?: string
  /**
   * Locale for formatting currency
   */
  locale: string
  /**
   * Callback when user wants to view benefit details
   */
  onViewDetails: (benefit: BenefitCatalogItem) => void
  /**
   * Section title (e.g., "Active Benefits (3)")
   */
  sectionTitle: string
  /**
   * Test ID for the section container
   */
  testId: string
}

/**
 * Benefits Section Grid Component
 *
 * Reusable component for displaying a grid of benefit cards with a section title.
 * Used for Active, Scheduled, and Available benefits sections.
 */
const BenefitsSectionGrid: React.FC<BenefitsSectionGridProps> = ({
  t,
  benefits,
  employeeId,
  currencyCode,
  locale,
  onViewDetails,
  sectionTitle,
  testId,
  accessToken,
  userInfo,
  additionalData
}) => {
  if (benefits.length === 0) {
    return null
  }

  return (
    <div className="gba:mb-8" data-testid={testId}>
      <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">{sectionTitle}</h3>
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-3 gba:gap-4"
        data-testid={`${testId}-grid`}
      >
        {benefits.map(benefit => (
          <BenefitCatalogCard
            key={benefit.catalogId}
            t={t}
            benefit={benefit}
            employeeId={employeeId}
            currencyCode={currencyCode}
            locale={locale}
            onViewDetails={onViewDetails}
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={additionalData}
          />
        ))}
      </div>
    </div>
  )
}

export default BenefitsSectionGrid
