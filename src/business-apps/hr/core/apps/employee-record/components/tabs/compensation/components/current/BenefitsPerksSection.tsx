'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Alert, Button } from '@newwork/nw-design-system'
import { Search } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBenefitsCatalog } from '../../hooks/useBenefitsCatalog'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { DebouncedInput } from '@/components/debounced-input'
import BenefitDetailsModal from './BenefitDetailsModal'
import BenefitsSectionGrid from './BenefitsSectionGrid'
import BenefitsEmptyStates from './BenefitsEmptyStates'

interface BenefitsPerksProps extends BusinessAppContextProps {
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Employee ID to fetch benefits for
   */
  employeeId: string
  /**
   * Default currency code for formatting
   */
  currencyCode?: string
  /**
   * Loading state indicator (optional, uses internal loading if not provided)
   */
  loading?: boolean
  /**
   * Locale for formatting currency
   */
  locale: string
  /**
   * Whether user has HR backoffice permission; when false exclude HR_BACKOFFICE benefits
   */
  hrBackofficeHasPermission?: boolean
}

/**
 * Benefits & Perks Section Component (Catalog View)
 *
 * Displays ALL available benefits from the BenefitType catalog with:
 * - Visual indicators for active vs available benefits
 * - Interactive cards with request/deactivate actions
 * - Search and filter capabilities
 * - Statistics showing active vs available benefits
 *
 * Replaces the previous display-only benefits list with an interactive catalog.
 */
const BenefitsPerksSection: React.FC<BenefitsPerksProps> = ({
  t,
  employeeId,
  accessToken,
  userInfo,
  additionalData,
  currencyCode = 'EUR',
  loading: externalLoading = false,
  locale,
  hrBackofficeHasPermission
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitCatalogItem | null>(null)

  // Fetch benefits catalog
  const {
    catalogData,
    loading: catalogLoading,
    error,
    refetch
  } = useBenefitsCatalog(employeeId, accessToken, {
    excludeHrBackoffice: hrBackofficeHasPermission === false
  })

  // Use external loading or internal loading
  const loading = externalLoading || catalogLoading

  /**
   * Filter and split benefits based on search query
   */
  const { activeBenefits, scheduledBenefits, availableBenefits } = React.useMemo(() => {
    if (!catalogData) return { activeBenefits: [], scheduledBenefits: [], availableBenefits: [] }

    let benefits = catalogData.catalogBenefits

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      benefits = benefits.filter(
        benefit =>
          benefit.benefitType.toLowerCase().includes(query) ||
          benefit.code.toLowerCase().includes(query) ||
          benefit.description?.toLowerCase().includes(query) ||
          benefit.provider?.value?.toLowerCase().includes(query)
      )
    }

    // Eligibility filter based on catalogEntry.objectValue.groups
    const hasHrBackoffice = hrBackofficeHasPermission === true
    const isEligibleByGroups = (b: BenefitCatalogItem): boolean => {
      const raw = b.catalogEntry?.objectValue as any
      let obj: any = raw
      if (raw && typeof raw === 'string') {
        try {
          obj = JSON.parse(raw)
        } catch {
          obj = null
        }
      }
      const groups: string[] = Array.isArray(obj?.groups) ? obj.groups.filter((g: any) => typeof g === 'string') : []
      if (groups.length === 0) return true

      // Require that ALL groups are satisfied (AND logic)
      const satisfies = (g: string): boolean => {
        if (g === 'all-employees') return true
        if (g === 'all-hr-backoffice') return hasHrBackoffice
        // Unknown or unsupported groups are not satisfied
        return false
      }

      return groups.every(satisfies)
    }

    benefits = benefits.filter(isEligibleByGroups)

    // Split into active, scheduled, and available
    const active = benefits.filter(b => b.isActive)
    const scheduled = benefits.filter(b => !b.isActive && b.isScheduled)
    const available = benefits.filter(b => !b.isActive && !b.isScheduled)

    return { activeBenefits: active, scheduledBenefits: scheduled, availableBenefits: available }
  }, [catalogData, searchQuery, hrBackofficeHasPermission])

  /**
   * Handle view benefit details action
   */
  const handleViewDetails = (benefit: BenefitCatalogItem) => {
    setSelectedBenefit(benefit)
    setDetailsModalOpen(true)
  }

  return (
    <>
      <Card data-testid="benefits-perks-section">
        <CardHeader>
          <div className="gba:flex gba:flex-col gba:md:flex-row gba:justify-between gba:items-start gba:md:items-center gba:gap-4">
            <div className="gba:flex-1">
              <CardTitle>{t('benefits-catalog-title')}</CardTitle>
              {catalogData && (
                <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  {activeBenefits.length > 0 && (
                    <span>
                      {activeBenefits.length} {t('benefit-status-active').toLowerCase()}
                    </span>
                  )}
                  {scheduledBenefits.length > 0 && (
                    <>
                      {activeBenefits.length > 0 && <span> • </span>}
                      <span>
                        {scheduledBenefits.length} {t('benefit-status-scheduled').toLowerCase()}
                      </span>
                    </>
                  )}
                  {availableBenefits.length > 0 && (
                    <>
                      {(activeBenefits.length > 0 || scheduledBenefits.length > 0) && <span> • </span>}
                      <span>
                        {availableBenefits.length} {t('benefit-status-available').toLowerCase()}
                      </span>
                    </>
                  )}
                  {activeBenefits.length === 0 && scheduledBenefits.length === 0 && availableBenefits.length === 0 && (
                    <span>{t('benefits-catalog-no-results')}</span>
                  )}
                </div>
              )}
            </div>

            {/* Search Control */}
            <div className="gba:w-full gba:md:w-[260px]">
              <DebouncedInput
                placeholder={t('benefits-search-placeholder')}
                value={searchQuery}
                onChange={setSearchQuery}
                debounceDelay={300}
                className="gba:w-full"
                icon={<Search className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
                data-testid="benefits-catalog-search-input"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Loading State */}
          {loading && (
            <div className="gba:text-center gba:text-muted-foreground gba:py-12" data-testid="benefits-catalog-loading">
              <div className="gba:animate-pulse">{t('benefits-loading')}</div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <Alert variant="destructive" className="gba:mb-4" data-testid="benefits-catalog-error">
              <div className="gba:flex gba:justify-between gba:items-center">
                <div>
                  <h4 className="gba:font-semibold gba:mb-1">{t('benefits-error-title')}</h4>
                  <p className="gba:text-sm">{error}</p>
                </div>
                <Button size="sm" onClick={refetch} variant="outline" data-testid="benefits-catalog-retry-button">
                  {t('benefits-error-retry')}
                </Button>
              </div>
            </Alert>
          )}

          {/* Empty States */}
          {!loading && !error && (
            <BenefitsEmptyStates
              t={t}
              totalBenefitsCount={catalogData?.totalBenefitsCount || 0}
              hasVisibleBenefits={
                activeBenefits.length > 0 || scheduledBenefits.length > 0 || availableBenefits.length > 0
              }
              onClearSearch={() => setSearchQuery('')}
            />
          )}

          {/* Active Benefits Section */}
          {!loading && !error && (
            <BenefitsSectionGrid
              t={t}
              benefits={activeBenefits}
              employeeId={employeeId}
              currencyCode={currencyCode}
              locale={locale}
              onViewDetails={handleViewDetails}
              sectionTitle={t('benefits-active-section-title', { count: activeBenefits.length })}
              testId="active-benefits-section"
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={additionalData}
            />
          )}

          {/* Scheduled Benefits Section */}
          {!loading && !error && (
            <BenefitsSectionGrid
              t={t}
              benefits={scheduledBenefits}
              employeeId={employeeId}
              currencyCode={currencyCode}
              locale={locale}
              onViewDetails={handleViewDetails}
              sectionTitle={t('benefits-scheduled-section-title', { count: scheduledBenefits.length })}
              testId="scheduled-benefits-section"
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={additionalData}
            />
          )}

          {/* Available Benefits Section */}
          {!loading && !error && (
            <BenefitsSectionGrid
              t={t}
              benefits={availableBenefits}
              employeeId={employeeId}
              currencyCode={currencyCode}
              locale={locale}
              onViewDetails={handleViewDetails}
              sectionTitle={t('benefits-available-section-title', { count: availableBenefits.length })}
              testId="available-benefits-section"
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={additionalData}
            />
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedBenefit && (
        <>
          {/* Benefit Details Modal (Read-only) */}
          <BenefitDetailsModal
            t={t}
            isOpen={detailsModalOpen}
            onClose={() => setDetailsModalOpen(false)}
            benefit={selectedBenefit}
            currencyCode={currencyCode}
            locale={locale}
            accessToken={accessToken}
            userInfo={userInfo}
          />
        </>
      )}
    </>
  )
}

export default BenefitsPerksSection
