'use client'

import React from 'react'
import { Card, Badge, Button } from '@newwork/nw-design-system'
import { BenefitCatalogItem } from '../../../types/benefitCatalogTypes'

interface BenefitCatalogCardProps {
  /**
   * Benefit catalog item with merged employee data
   */
  benefit: BenefitCatalogItem
  /**
   * Currency code for formatting amounts
   */
  currencyCode?: string
  /**
   * Callback when user requests to activate benefit
   */
  onRequest?: (benefitCatalogId: string) => void
  /**
   * Callback when user requests to deactivate benefit
   */
  onDeactivate?: (employeeBenefitId: string) => void
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
  benefit,
  currencyCode = 'EUR',
  onRequest,
  onDeactivate,
  onViewDetails
}) => {
  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number, currency: string = currencyCode): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Get status badge variant based on benefit state
   */
  const getStatusVariant = (): 'success' | 'secondary' => {
    if (benefit.isActive) return 'success'
    return 'secondary' // Light gray for available benefits
  }

  /**
   * Get status label for badge
   */
  const getStatusLabel = (): string => {
    if (benefit.isActive) return 'Active'
    if (benefit.isPending) return 'Pending'
    return 'Available'
  }

  /**
   * Handle request benefit action
   */
  const handleRequest = () => {
    if (onRequest && benefit.canRequest) {
      onRequest(benefit.catalogId)
    }
  }

  /**
   * Handle deactivate benefit action
   */
  const handleDeactivate = () => {
    if (onDeactivate && benefit.canDeactivate && benefit.employeeBenefitId) {
      onDeactivate(benefit.employeeBenefitId)
    }
  }

  /**
   * Handle view details action
   */
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(benefit)
    }
  }

  return (
    <Card
      className={`gba:p-4 gba:transition-all gba:duration-200 gba:flex gba:flex-col gba:gap-3 ${
        benefit.isActive
          ? 'gba:border-success gba:bg-success-secondary/10'
          : 'gba:border-border gba:hover:border-accent'
      }`}
      data-testid={`benefit-catalog-card-${benefit.code}`}
    >
      {/* Header: Benefit Type and Status/Action */}
      <div className="gba:flex gba:justify-between gba:items-start gba:gap-2">
        <div className="gba:flex-1 gba:space-y-1">
          <h3
            className="gba:text-base gba:font-semibold gba:text-foreground gba:leading-tight"
            data-testid={`benefit-catalog-title-${benefit.code}`}
          >
            {benefit.benefitType}
          </h3>
          {/* Description under title */}
          {benefit.description && (
            <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">{benefit.description}</p>
          )}
        </div>

        {/* For active benefits: show badge; for available: show request button */}
        {benefit.isActive ? (
          <Badge variant={getStatusVariant()} data-testid={`benefit-catalog-status-badge-${benefit.code}`}>
            {getStatusLabel()}
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequest}
            disabled={!benefit.canRequest || benefit.isPending}
            data-testid={`benefit-catalog-request-button-${benefit.code}`}
          >
            {benefit.isPending ? 'Pending' : 'Request'}
          </Button>
        )}
      </div>

      {/* Active Benefit Details (Compact) */}
      {benefit.isActive && (
        <div className="gba:flex gba:justify-between gba:items-start gba:space-y-1">
          {/* Provider and Value on same line */}
          {(benefit.provider?.value || benefit.yearlyAmount) && (
            <div className="gba:text-xs gba:text-muted-foreground">
              {benefit.provider?.value && <span>{benefit.provider.value}</span>}
              {benefit.provider?.value && benefit.yearlyAmount && <span> • </span>}
              {benefit.yearlyAmount && (
                <span className="gba:font-medium gba:text-foreground">
                  {formatCurrency(benefit.yearlyAmount, benefit.currency?.code || currencyCode)}/yr
                </span>
              )}
            </div>
          )}

          {/* Start Date */}
          {benefit.startDate && (
            <div className="gba:text-xs gba:text-muted-foreground">
              Since {new Date(benefit.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons - Only for active benefits */}
      {benefit.isActive && (
        <div className="gba:flex gba:gap-2 gba:mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeactivate}
            disabled={!benefit.canDeactivate || benefit.isPending}
            className="gba:flex-1"
            data-testid={`benefit-catalog-deactivate-button-${benefit.code}`}
          >
            Deactivate
          </Button>
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDetails}
              className="gba:flex-1"
              data-testid={`benefit-catalog-details-button-${benefit.code}`}
            >
              Details
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

export default BenefitCatalogCard
