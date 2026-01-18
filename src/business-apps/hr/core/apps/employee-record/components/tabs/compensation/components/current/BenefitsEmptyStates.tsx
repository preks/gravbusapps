'use client'

import React from 'react'
import { Button } from '@newwork/nw-design-system'

interface BenefitsEmptyStatesProps {
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Total benefits count in catalog
   */
  totalBenefitsCount: number
  /**
   * Whether there are any visible benefits after filtering
   */
  hasVisibleBenefits: boolean
  /**
   * Callback to clear search query
   */
  onClearSearch: () => void
}

/**
 * Benefits Empty States Component
 *
 * Handles two empty state scenarios:
 * 1. Empty catalog - no benefits exist in the system
 * 2. No search results - benefits exist but none match the search
 */
const BenefitsEmptyStates: React.FC<BenefitsEmptyStatesProps> = ({
  t,
  totalBenefitsCount,
  hasVisibleBenefits,
  onClearSearch
}) => {
  // Empty Catalog State
  if (totalBenefitsCount === 0) {
    return (
      <div className="gba:text-center gba:text-muted-foreground gba:py-12" data-testid="benefits-catalog-empty-catalog">
        <div className="gba:text-lg gba:font-medium gba:mb-2">{t('benefits-catalog-empty-title')}</div>
        <p className="gba:text-sm">{t('benefits-catalog-empty-description')}</p>
      </div>
    )
  }

  // No Search Results State
  if (!hasVisibleBenefits) {
    return (
      <div className="gba:text-center gba:text-muted-foreground gba:py-12" data-testid="benefits-catalog-empty-search">
        <div className="gba:text-lg gba:font-medium gba:mb-2">{t('benefits-catalog-no-results-title')}</div>
        <p className="gba:text-sm">{t('benefits-catalog-no-results-description')}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={onClearSearch}
          className="gba:mt-4"
          data-testid="benefits-catalog-clear-search-button"
        >
          {t('benefits-catalog-clear-search')}
        </Button>
      </div>
    )
  }

  return null
}

export default BenefitsEmptyStates
