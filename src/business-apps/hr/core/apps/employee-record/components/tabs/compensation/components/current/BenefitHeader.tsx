import React from 'react'
import { SheetHeader, SheetTitle, SheetDescription, Badge } from '@newwork/nw-design-system'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'

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
}

/**
 * Benefit Details Header Component
 * Displays the benefit title, status badge, and description
 */
const BenefitHeader: React.FC<BenefitHeaderProps> = ({ title, benefit, t }) => {
  return (
    <SheetHeader className="gba:px-6">
      <div className="gba:space-y-2">
        <SheetTitle className="gba:text-xl gba:font-semibold">{title}</SheetTitle>
        <Badge
          variant={benefit.isActive ? 'success' : 'default'}
          data-testid={`benefit-status-badge-${benefit.code}`}
          className="gba:w-fit"
        >
          {benefit.isActive ? t('benefit-status-active') : t('benefit-status-available')}
        </Badge>
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
