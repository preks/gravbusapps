'use client'

import React, { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  Alert,
  AlertDescription,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { getTranslatedBenefitType, getTranslatedProviderValue } from '../../utils/benefitTranslationUtils'
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

  // Provider selection for requestable benefits (used when requesting from modal)
  const [selectedProviderRef, setSelectedProviderRef] = useState<string>(benefit.providerRef ?? '')
  const providers = benefit.availableProviders ?? []
  const canRequest = benefit.canRequest && providers.length > 0

  useEffect(() => {
    if (benefit.providerRef) {
      setSelectedProviderRef(benefit.providerRef)
    } else if (providers.length === 1) {
      setSelectedProviderRef(providers[0].id)
    } else {
      setSelectedProviderRef('')
    }
  }, [benefit?.catalogId, benefit?.providerRef, providers.length])

  // Parse benefit details from catalog objectValue (guard against missing catalogEntry)
  const benefitDetails = parseBenefitObjectValue(benefit.catalogEntry?.objectValue)

  // Get catalog value for active and scheduled benefits (both have employee benefit data)
  const catalogValue =
    benefit.isActive || benefit.isScheduled ? getCatalogValueDisplay(benefit, benefitDetails, t) : null

  // Determine if we should show full benefit details (active or scheduled)
  const showFullDetails = benefit.isActive || benefit.isScheduled
  const showCancelledDetails = benefit.isCancelled

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
          {benefit.isPending && (
            <Alert variant="default" className="gba:mb-4" data-testid="benefit-pending-alert">
              <AlertDescription>{t('benefit-pending-request-notice')}</AlertDescription>
            </Alert>
          )}

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
            ) : showCancelledDetails ? (
              <>
                <AvailableBenefitContent
                  benefit={benefit}
                  t={t}
                  currencyCode={currencyCode}
                  locale={locale}
                  benefitDetails={benefitDetails}
                />
                {/* Notes and Comments for not approved benefits */}
                {(benefit.notes || benefit.comments) && (
                  <div className="gba:space-y-3 gba:pt-4 gba:border-t">
                    <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
                      {t('benefit-details-additional-info')}
                    </h3>
                    <div className="gba:space-y-2 gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">
                      {benefit.notes && (
                        <div data-testid="benefit-details-notes-value">
                          <span className="gba:text-muted-foreground">{t('benefit-details-justification')}: </span>
                          {benefit.notes}
                        </div>
                      )}
                      {benefit.comments && (
                        <div data-testid="benefit-details-comments-value">
                          <span className="gba:text-muted-foreground">{t('benefit-details-comments')}: </span>
                          {benefit.comments}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
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

          {/* Provider selection when benefit can be requested */}
          {canRequest && (
            <div className="gba:space-y-2 gba:pt-4 gba:border-t">
              <Label className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
                {t('benefit-details-available-providers')}
              </Label>
              <Select
                value={selectedProviderRef || undefined}
                onValueChange={setSelectedProviderRef}
                data-testid="benefit-details-provider-select"
              >
                <SelectTrigger className="gba:w-full">
                  <SelectValue placeholder={t('benefit-details-choose-provider')} />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(provider => (
                    <SelectItem
                      key={provider.id}
                      value={provider.id}
                      data-testid={`benefit-details-provider-option-${provider.code}`}
                    >
                      {getTranslatedProviderValue(provider, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <BenefitDetailsFooter
          benefit={benefit}
          selectedProviderRef={canRequest ? selectedProviderRef : undefined}
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
