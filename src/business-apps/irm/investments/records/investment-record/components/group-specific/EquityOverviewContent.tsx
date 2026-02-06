import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GenerateOnePagerButton, InvestmentTileSection } from '../shared'
import EquityInvestmentRounds from './EquityInvestmentRounds'

/**
 * Props for overview content components
 */
export interface OverviewContentProps extends BusinessAppContextProps {
  investment: any
  typeSpecificData: any
  processedTiles: any[]
  onRefresh?: () => void
}

/**
 * Equity Investment Overview Content
 *
 * Displays equity-specific content in the Overview tab:
 * - Generate One-Pager button
 * - Investment tile section (if tiles configured)
 * - Investment rounds table with shareholder details
 *
 * This component is used by recordGroupConfigurations.tsx for EQUITY groups.
 */
export const EquityOverviewContent: React.FC<OverviewContentProps> = ({
  investment,
  typeSpecificData,
  processedTiles,
  onRefresh,
  ...props
}) => {
  return (
    <div className="gba:col-span-12 gba:space-y-6" data-testid="equity-overview-content">
      {/* Generate One-Pager Action */}
      <div
        className="gba:flex gba:justify-end"
        style={{ marginBottom: 'var(--nw-spacing-lg)' }}
        data-testid="equity-generate-onepager-section"
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
          data-testid="equity-record-tiles"
        />
      )}

      {/* Equity-specific: Investment Rounds */}
      <EquityInvestmentRounds
        equityData={typeSpecificData}
        isLoading={false}
        onRefresh={onRefresh}
        accessToken={props.accessToken || ''}
        userInfo={props.userInfo}
        additionalData={props.additionalData}
        data-testid="equity-investment-rounds-overview"
      />
    </div>
  )
}

export default EquityOverviewContent
