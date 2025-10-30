'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Alert, Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../common/utils/windowUtils'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { useBenefitsCatalog } from '../../../hooks/useBenefitsCatalog'
import BenefitCatalogCard from './BenefitCatalogCard'
import { BenefitCatalogItem } from '../../../types/benefitCatalogTypes'
import { DebouncedInput } from '@/components/debounced-input'
import RequestBenefitModal from './modals/RequestBenefitModal'
import DeactivateBenefitModal from './modals/DeactivateBenefitModal'

interface BenefitsPerksProps extends BusinessAppContextProps {
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
  employeeId,
  accessToken,
  userInfo,
  additionalData,
  currencyCode = 'EUR',
  loading: externalLoading = false
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitCatalogItem | null>(null)

  // Fetch benefits catalog
  const { catalogData, loading: catalogLoading, error, refetch } = useBenefitsCatalog(employeeId, accessToken)

  // Use external loading or internal loading
  const loading = externalLoading || catalogLoading

  /**
   * Filter and split benefits based on search query
   */
  const { activeBenefits, availableBenefits } = React.useMemo(() => {
    if (!catalogData) return { activeBenefits: [], availableBenefits: [] }

    let benefits = catalogData.catalogBenefits

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      benefits = benefits.filter(
        benefit =>
          benefit.benefitType.toLowerCase().includes(query) ||
          benefit.code.toLowerCase().includes(query) ||
          benefit.description?.toLowerCase().includes(query) ||
          benefit.provider?.value.toLowerCase().includes(query)
      )
    }

    // Split into active and available
    const active = benefits.filter(b => b.isActive)
    const available = benefits.filter(b => !b.isActive)

    return { activeBenefits: active, availableBenefits: available }
  }, [catalogData, searchQuery])

  /**
   * Handle benefit request action
   */
  const handleRequestBenefit = (benefitCatalogId: string) => {
    const benefit = catalogData?.catalogBenefits.find(b => b.catalogId === benefitCatalogId)
    if (benefit) {
      setSelectedBenefit(benefit)
      setRequestModalOpen(true)
    }
  }

  /**
   * Handle benefit deactivation action
   */
  const handleDeactivateBenefit = (employeeBenefitId: string) => {
    const benefit = catalogData?.catalogBenefits.find(b => b.employeeBenefitId === employeeBenefitId)
    if (benefit) {
      setSelectedBenefit(benefit)
      setDeactivateModalOpen(true)
    }
  }

  /**
   * Handle view benefit details action (Phase 4)
   */
  const handleViewDetails = () => {
    // TODO: Implement in Phase 4 - Open details modal
  }

  /**
   * Handle modal success - refresh data
   */
  const handleSuccess = () => {
    refetch()
  }

  return (
    <>
      <Card data-testid="benefits-perks-section">
        <CardHeader>
          <div className="gba:flex gba:flex-col gba:md:flex-row gba:justify-between gba:items-start gba:md:items-center gba:gap-4">
            <div className="gba:flex-1">
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.benefits_catalog', 'Benefits Catalog')}
              </CardTitle>
              {catalogData && (
                <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  {catalogData.activeBenefitsCount} active · {catalogData.availableBenefitsCount} available ·{' '}
                  {catalogData.totalBenefitsCount} total
                </div>
              )}
            </div>

            {/* Search Control */}
            <div className="gba:w-full gba:md:w-auto">
              <DebouncedInput
                placeholder="Search benefits..."
                value={searchQuery}
                onChange={setSearchQuery}
                debounceDelay={300}
                className="gba:w-full gba:md:w-64"
                data-testid="benefits-catalog-search-input"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Loading State */}
          {loading && (
            <div className="gba:text-center gba:text-muted-foreground gba:py-12" data-testid="benefits-catalog-loading">
              <div className="gba:animate-pulse">Loading benefits catalog...</div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <Alert variant="destructive" className="gba:mb-4" data-testid="benefits-catalog-error">
              <div className="gba:flex gba:justify-between gba:items-center">
                <div>
                  <h4 className="gba:font-semibold gba:mb-1">Error Loading Benefits</h4>
                  <p className="gba:text-sm">{error}</p>
                </div>
                <Button size="sm" onClick={refetch} variant="outline">
                  Retry
                </Button>
              </div>
            </Alert>
          )}

          {/* Empty State - No Benefits in Catalog */}
          {!loading && !error && catalogData && catalogData.totalBenefitsCount === 0 && (
            <div
              className="gba:text-center gba:text-muted-foreground gba:py-12"
              data-testid="benefits-catalog-empty-catalog"
            >
              <div className="gba:text-lg gba:font-medium gba:mb-2">No Benefits Available</div>
              <p className="gba:text-sm">No benefits are currently available in the catalog.</p>
            </div>
          )}

          {/* Empty State - No Search Results */}
          {!loading &&
            !error &&
            catalogData &&
            catalogData.totalBenefitsCount > 0 &&
            activeBenefits.length === 0 &&
            availableBenefits.length === 0 && (
              <div
                className="gba:text-center gba:text-muted-foreground gba:py-12"
                data-testid="benefits-catalog-empty-search"
              >
                <div className="gba:text-lg gba:font-medium gba:mb-2">No Benefits Found</div>
                <p className="gba:text-sm">No benefits match your search criteria.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                  }}
                  className="gba:mt-4"
                >
                  Clear Search
                </Button>
              </div>
            )}

          {/* Active Benefits Section */}
          {!loading && !error && activeBenefits.length > 0 && (
            <div className="gba:mb-8" data-testid="active-benefits-section">
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">
                Active Benefits ({activeBenefits.length})
              </h3>
              <div
                className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4"
                data-testid="active-benefits-grid"
              >
                {activeBenefits.map(benefit => (
                  <BenefitCatalogCard
                    key={benefit.catalogId}
                    benefit={benefit}
                    currencyCode={currencyCode}
                    onRequest={handleRequestBenefit}
                    onDeactivate={handleDeactivateBenefit}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Available Benefits Section */}
          {!loading && !error && availableBenefits.length > 0 && (
            <div data-testid="available-benefits-section">
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">
                Available Benefits ({availableBenefits.length})
              </h3>
              <div
                className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4"
                data-testid="available-benefits-grid"
              >
                {availableBenefits.map(benefit => (
                  <BenefitCatalogCard
                    key={benefit.catalogId}
                    benefit={benefit}
                    currencyCode={currencyCode}
                    onRequest={handleRequestBenefit}
                    onDeactivate={handleDeactivateBenefit}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedBenefit && (
        <>
          <RequestBenefitModal
            isOpen={requestModalOpen}
            onClose={() => setRequestModalOpen(false)}
            benefit={selectedBenefit}
            employeeId={employeeId}
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={additionalData}
            onSuccess={handleSuccess}
          />

          <DeactivateBenefitModal
            isOpen={deactivateModalOpen}
            onClose={() => setDeactivateModalOpen(false)}
            benefit={selectedBenefit}
            employeeId={employeeId}
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={additionalData}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </>
  )
}

export default BenefitsPerksSection
