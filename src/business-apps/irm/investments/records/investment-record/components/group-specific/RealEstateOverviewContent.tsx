import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GenerateOnePagerButton, InvestmentTileSection } from '../shared'
import RealEstateLiquidityForecast from './RealEstateLiquidityForecast'

/**
 * Props for overview content components
 * (Shared with EquityOverviewContent)
 */
export interface OverviewContentProps extends BusinessAppContextProps {
  investment: any
  typeSpecificData: any
  processedTiles: any[]
  onRefresh?: () => void
}

/**
 * Real Estate Investment Overview Content
 *
 * Displays real estate-specific content in the Overview tab:
 * - Generate One-Pager button
 * - Investment tile section (if tiles configured)
 * - Liquidity forecast table
 *
 * This component is used by recordGroupConfigurations.tsx for REAL_ESTATE groups.
 */
export const RealEstateOverviewContent: React.FC<OverviewContentProps> = ({
  investment,
  typeSpecificData,
  processedTiles,
  ...props
}) => {
  return (
    <div className="gba:col-span-12 gba:space-y-6" data-testid="real-estate-overview-content">
      {/* Generate One-Pager Action */}
      <div
        className="gba:flex gba:justify-end"
        style={{ marginBottom: 'var(--nw-spacing-lg)' }}
        data-testid="real-estate-generate-onepager-section"
      >
        <GenerateOnePagerButton
          investmentId={investment?.id}
          accessToken={props.accessToken}
          userInfo={props.userInfo}
          investmentData={investment}
        />
      </div>

      {/* Investment Tile Section - only show if tile fields are configured */}
      {processedTiles.length > 0 && (
        <InvestmentTileSection
          investment={investment}
          isLoading={false}
          accessToken={props.accessToken}
          userInfo={props.userInfo}
          additionalData={props.additionalData}
          data-testid="real-estate-record-tiles"
        />
      )}

      {/* Real Estate-specific: Liquidity Forecast */}
      <RealEstateLiquidityForecast
        realEstateData={typeSpecificData}
        isLoading={false}
        accessToken={props.accessToken || ''}
        data-testid="real-estate-liquidity-forecast-overview"
      />
    </div>
  )
}

export default RealEstateOverviewContent
