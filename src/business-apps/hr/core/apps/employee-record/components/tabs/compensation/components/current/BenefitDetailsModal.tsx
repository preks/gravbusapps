'use client'

import React from 'react'
import { Sheet, SheetContent } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { getTranslatedBenefitType } from '../../utils/benefitTranslationUtils'
import { parseBenefitObjectValue, getCatalogValueDisplay } from '../../utils/benefitDetailsUtils'
import BenefitHeader from './BenefitHeader'
import ActiveBenefitContent from './ActiveBenefitContent'
import AvailableBenefitContent from './AvailableBenefitContent'
import BenefitDetailsFooter from './BenefitDetailsFooter'

interface BenefitDetailsModalProps extends BusinessAppContextProps {
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Sheet open state
   */
  isOpen: boolean
  /**
   * Close handler
   */
  onClose: () => void
  /**
   * Benefit data to display
   */
  benefit: BenefitCatalogItem | null
  /**
   * Currency code for formatting
   */
  currencyCode?: string
  /**
   * Locale for formatting
   */
  locale: string
}

/**
 * Benefit Details Sheet Component
 * Read-only sidebar modal displaying comprehensive benefit information
 *
 * Shows:
 * - Benefit type and description
 * - Provider information
 * - Value details (yearly/monthly amounts)
 * - Active period (start/end dates)
 * - Status and notes
 * - Available providers for the benefit type
 */
const BenefitDetailsModal: React.FC<BenefitDetailsModalProps> = ({
  t,
  isOpen,
  onClose,
  benefit,
  currencyCode = 'EUR',
  locale,
  accessToken,
  userInfo
}) => {
  // Don't render Sheet if benefit is not available
  if (!benefit) return null

  const employeeId = userInfo?.employeeDetails?.employeeId
  const title = getTranslatedBenefitType(benefit, locale)

  // Parse benefit details from catalog objectValue (guard against missing catalogEntry)
  const benefitDetails = parseBenefitObjectValue(benefit.catalogEntry?.objectValue)

  // Get catalog value for active and scheduled benefits (both have employee benefit data)
  const catalogValue =
    benefit.isActive || benefit.isScheduled ? getCatalogValueDisplay(benefit, benefitDetails, t) : null

  // Determine if we should show full benefit details (active or scheduled)
  const showFullDetails = benefit.isActive || benefit.isScheduled

  return (
    <Sheet
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none [&>button[data-slot='sheet-close']]:gba:hidden"
        data-testid="benefit-details-modal"
      >
        <BenefitHeader title={title} benefit={benefit} t={t} locale={locale} />

        <div className="gba:mt-6 gba:px-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
          <div className="gba:space-y-6">
            {showFullDetails ? (
              <ActiveBenefitContent
                benefit={benefit}
                t={t}
                currencyCode={currencyCode}
                locale={locale}
                catalogValue={catalogValue}
                title={title}
              />
            ) : (
              <AvailableBenefitContent
                benefit={benefit}
                t={t}
                currencyCode={currencyCode}
                locale={locale}
                benefitDetails={benefitDetails}
              />
            )}
          </div>
        </div>

        <BenefitDetailsFooter
          benefit={benefit}
          t={t}
          accessToken={accessToken}
          employeeId={employeeId}
          onClose={onClose}
        />
      </SheetContent>
    </Sheet>
  )
}

export default BenefitDetailsModal
