import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, Button, Alert } from '@newwork/nw-design-system'
import { FileText, TrendingUp, Table, PieChart } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { TileData, TILE_TYPES } from '../../types/tileTypes'
import { TextTileCard } from './TextTileCard'
import { KpiTileCard } from './KpiTileCard'
import { TableTileCard } from './TableTileCard'
import { ChartTileCard } from './ChartTileCard'
import { deleteTile, loadTilesFromInvestment, parseAdditionalProperties } from '../../utils/tileUtils'
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface InvestmentTilesTabProps extends BusinessAppContextProps {
  investmentId: string
  investment: any
  onRefresh?: () => void
}

export const InvestmentTilesTab: React.FC<InvestmentTilesTabProps> = ({
  investmentId,
  investment,
  onRefresh,
  ...props
}) => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken)

  // Parse tiles from additionalProperties
  const tiles = useMemo(() => {
    const tilesData = loadTilesFromInvestment(investment)
    return tilesData.sort((a, b) => a.order - b.order)
  }, [investment])

  // Handle delete - directly update additionalProperties
  const handleDelete = useCallback(
    async (tileId: string) => {
      const tileToDelete = tiles.find(t => t.id === tileId)
      const confirmMessage = getTranslationFromI18nKeyAndLabel(
        'investment.tiles.confirmDelete',
        'Are you sure you want to delete this tile?'
      )

      if (!confirm(`${confirmMessage}\n\n"${tileToDelete?.title}"`)) {
        return
      }

      setIsDeleting(tileId)
      setDeleteError(null)

      try {
        // Get current tiles
        const currentTiles = loadTilesFromInvestment(investment)

        // Remove the tile
        const updatedTiles = deleteTile(currentTiles, tileId)

        // Update additionalProperties
        const additionalProps = parseAdditionalProperties(investment.additionalProperties)

        const updatedAdditionalProps = {
          ...additionalProps,
          tilesData: updatedTiles
        }

        // Determine investment group type
        const groupRef = investment.investmentGroup?.id || ''
        const groupType = groupRef.split(':').pop()

        // Create investment form data with ALL existing fields
        const investmentFormData: any = {
          investment: {
            id: investmentId,
            version: investment.version,
            name: investment.name || '',
            initialInvestmentAmount: investment.initialInvestmentAmount || 0,
            investmentGroup: investment.investmentGroup,
            ownerEmployee: investment.ownerEmployee,

            // Include ALL existing investment fields to preserve them
            code: investment.code,
            isin: investment.isin,
            investmentType: investment.investmentType,
            investmentStakeType: investment.investmentStakeType,
            investmentPhase: investment.investmentPhase,
            investmentStatus: investment.investmentStatus,
            investmentRiskLevel: investment.investmentRiskLevel,
            acquisitionDate: investment.acquisitionDate,
            planedExit: investment.planedExit,
            plannedExitDate: investment.plannedExitDate,
            exitDate: investment.exitDate,
            totalInvestmentAmount: investment.totalInvestmentAmount,
            investmentMarketValue: investment.investmentMarketValue,
            debtFinancingAmount: investment.debtFinancingAmount,
            requiredCapitalAmount: investment.requiredCapitalAmount,
            forecastedRevenueAmount: investment.forecastedRevenueAmount,
            forecastedProfitAmount: investment.forecastedProfitAmount,
            stakePercentage: investment.stakePercentage,
            loanRecipientName: investment.loanRecipientName,
            loanAmount: investment.loanAmount,
            loanOpenCommitmentAmount: investment.loanOpenCommitmentAmount,
            loanInterestRate: investment.loanInterestRate,
            loanStartDate: investment.loanStartDate,
            loanEndDate: investment.loanEndDate,
            loanInterestClaim: investment.loanInterestClaim,
            totalCommitmentAmount: investment.totalCommitmentAmount,
            totalDistributionAmount: investment.totalDistributionAmount,
            currency: investment.currency,
            fundManagerName: investment.fundManagerName,
            identification: investment.identification,
            investmentAccount: investment.investmentAccount,
            investmentOpportunity: investment.investmentOpportunity?.id,
            loanRecipientInvestmentAccount: investment.loanRecipientInvestmentAccount?.id,
            additionalProperties: updatedAdditionalProps
          }
        }

        // Add the appropriate subtype based on investment group
        if (groupType === 'EQUITY') {
          const existingEquity = Array.isArray(investment.equityInvestment)
            ? investment.equityInvestment[0]
            : investment.equityInvestment
          investmentFormData.equityInvestment = existingEquity || {}
        } else if (groupType === 'REAL_ESTATE') {
          const existingRealEstate = Array.isArray(investment.realEstateInvestment)
            ? investment.realEstateInvestment[0]
            : investment.realEstateInvestment
          investmentFormData.realEstateInvestment = existingRealEstate || {}
        } else if (groupType === 'LIQUID_FUND') {
          const existingLiquidFund = Array.isArray(investment.liquidFundInvestment)
            ? investment.liquidFundInvestment[0]
            : investment.liquidFundInvestment
          investmentFormData.liquidFundInvestment = existingLiquidFund || {}
        }

        // Build payload
        const businessAppContext = {
          accessToken: props.accessToken,
          userInfo: props.userInfo,
          additionalData: props.additionalData
        }

        const payload = buildInvestmentPayload(investmentFormData, businessAppContext, {
          isUpdate: true,
          rawInvestmentData: investment
        })

        ;(payload as any).changeMode = 'UPDATE'
        ;(payload as any).businessKey = `investment-tile-delete-${tileId}`

        // Make API call using GraphQL client
        const mutation = `
          mutation UpdateInvestment($input: InvestmentInput!) {
            updateInvestment(input: $input) {
              id
              version
            }
          }
        `

        await graphqlClient.request(mutation, { input: payload })

        // Refresh data
        if (onRefresh) {
          onRefresh()
        }
      } catch (error) {
        console.error('Error deleting tile:', error)
        setDeleteError(
          getTranslationFromI18nKeyAndLabel('investment.tiles.deleteError', 'Failed to delete tile. Please try again.')
        )
      } finally {
        setIsDeleting(null)
      }
    },
    [tiles, investment, investmentId, props, graphqlClient, onRefresh]
  )

  // Render tile based on type
  const renderTile = (tile: TileData) => {
    switch (tile.type) {
      case TILE_TYPES.TEXT:
        return <TextTileCard key={tile.id} tile={tile} investmentId={investmentId} onDelete={handleDelete} {...props} />
      case TILE_TYPES.KPI:
        return <KpiTileCard key={tile.id} tile={tile} investmentId={investmentId} onDelete={handleDelete} {...props} />
      case TILE_TYPES.TABLE:
        return (
          <TableTileCard key={tile.id} tile={tile} investmentId={investmentId} onDelete={handleDelete} {...props} />
        )
      case TILE_TYPES.CHART:
        return (
          <ChartTileCard key={tile.id} tile={tile} investmentId={investmentId} onDelete={handleDelete} {...props} />
        )
      default:
        return null
    }
  }

  return (
    <div data-testid="investment-tiles-tab" className="gba:space-y-6">
      {/* Header with Add Buttons */}
      <div className="gba:flex gba:justify-between gba:items-start gba:flex-wrap gba:gap-4">
        <div>
          <h2 className="gba:text-2xl gba:font-semibold gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('investment.tiles.title', 'Custom Tiles')}
          </h2>
          <p className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'investment.tiles.description',
              'Create custom information cards to track additional data'
            )}
          </p>
        </div>

        {/* Add Tile Buttons */}
        <div className="gba:flex gba:gap-2">
          {/* Add Text Tile */}
          <AppAction
            contextsArray={[FlowContextName.investmentKpiTilesUpdate]}
            externalContextData={{
              investmentId,
              scope: 'text'
            }}
            accessToken={props.accessToken}
            emptyStateBehavior="enable"
            data-testid="add-text-tile-action"
          >
            <Button variant="default" size="sm" data-testid="add-text-tile-button">
              <FileText className="gba:mr-2 gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('investment.tiles.addText', 'Add Text Tile')}
            </Button>
          </AppAction>

          {/* Add KPI Tile */}
          <AppAction
            contextsArray={[FlowContextName.investmentKpiTilesUpdate]}
            externalContextData={{
              investmentId,
              scope: 'kpi'
            }}
            accessToken={props.accessToken}
            emptyStateBehavior="enable"
            data-testid="add-kpi-tile-action"
          >
            <Button variant="default" size="sm" data-testid="add-kpi-tile-button">
              <TrendingUp className="gba:mr-2 gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('investment.tiles.addKpi', 'Add KPI Tile')}
            </Button>
          </AppAction>

          {/* Add Table Tile */}
          <AppAction
            contextsArray={[FlowContextName.investmentKpiTilesUpdate]}
            externalContextData={{
              investmentId,
              scope: 'table'
            }}
            accessToken={props.accessToken}
            emptyStateBehavior="enable"
            data-testid="add-table-tile-action"
          >
            <Button variant="default" size="sm" data-testid="add-table-tile-button">
              <Table className="gba:mr-2 gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('investment.tiles.addTable', 'Add Table Tile')}
            </Button>
          </AppAction>

          {/* Add Chart Tile */}
          <AppAction
            contextsArray={[FlowContextName.investmentKpiTilesUpdate]}
            externalContextData={{
              investmentId,
              scope: 'chart'
            }}
            accessToken={props.accessToken}
            emptyStateBehavior="enable"
            data-testid="add-chart-tile-action"
          >
            <Button variant="default" size="sm" data-testid="add-chart-tile-button">
              <PieChart className="gba:mr-2 gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('investment.tiles.addChart', 'Add Chart Tile')}
            </Button>
          </AppAction>
        </div>
      </div>

      {/* Delete Error Alert */}
      {deleteError && (
        <Alert variant="destructive" data-testid="tiles-delete-error">
          {deleteError}
        </Alert>
      )}

      {/* Tiles Grid */}
      {tiles.length > 0 ? (
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6" data-testid="tiles-grid">
          {tiles.map(renderTile)}
        </div>
      ) : (
        /* Empty State */
        <Card className="gba:border-dashed" data-testid="tiles-empty-state">
          <CardContent className="gba:py-12 gba:text-center">
            <p className="gba:text-muted-foreground gba:mb-4">
              {getTranslationFromI18nKeyAndLabel(
                'investment.tiles.empty',
                'No tiles created yet. Add a text or KPI tile to get started.'
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading Overlay for Delete */}
      {isDeleting && (
        <div className="gba:fixed gba:inset-0 gba:bg-black/20 gba:flex gba:items-center gba:justify-center gba:z-50">
          <div className="gba:bg-background gba:p-6 gba:rounded-lg gba:shadow-lg">
            <p>{getTranslationFromI18nKeyAndLabel('investment.tiles.deleting', 'Deleting tile...')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvestmentTilesTab
