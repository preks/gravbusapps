import React from 'react'
import { SheetHeader, SheetTitle, SheetDescription, Badge } from '@newwork/nw-design-system'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { BenefitStatus } from '../../types/compensationEnums'

interface BenefitHeaderProps {
  /**
   * Benefit title to display
   */
  title: string
  /**
   * Benefit data
   */
  benefit: BenefitCatalogItem
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Locale for date formatting
   */
  locale: string
}

/**
 * Benefit Details Header Component
 * Displays the benefit title, status badge, and description
 */
const BenefitHeader: React.FC<BenefitHeaderProps> = ({ title, benefit, t, locale }) => {
  // Check if benefit is already deactivated but still showing as active due to date range
  // This happens when backend sets INACTIVE_BENEFIT with a future endDate
  // Show badge in this case (benefit is deactivated but still valid until endDate)
  const isAlreadyDeactivated =
    benefit.isActive && Boolean(benefit.endDate) && benefit.benefitStatus === BenefitStatus.INACTIVE

  return (
    <SheetHeader className="gba:px-6">
      <div className="gba:space-y-2">
        <SheetTitle className="gba:text-xl gba:font-semibold">{title}</SheetTitle>
        <div className="gba:flex gba:gap-2 gba:flex-wrap">
          <Badge
            variant={benefit.isActive ? 'success' : 'default'}
            data-testid={`benefit-status-badge-${benefit.code}`}
            className="gba:w-fit"
          >
            {benefit.isActive ? t('benefit-status-active') : t('benefit-status-available')}
          </Badge>
          {isAlreadyDeactivated && (
            <Badge
              variant="warning"
              data-testid={`benefit-scheduled-deactivation-badge-${benefit.code}`}
              className="gba:w-fit"
            >
              {t('benefit-ends')}{' '}
              {new Date(benefit.endDate!).toLocaleDateString(locale ?? 'en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </Badge>
          )}
        </div>
      </div>
      {benefit.description ? (
        <SheetDescription className="gba:mt-2">{benefit.description}</SheetDescription>
      ) : (
        <SheetDescription className="gba:sr-only">{t('benefit-details-description')}</SheetDescription>
      )}
    </SheetHeader>
  )
}

export default BenefitHeader
