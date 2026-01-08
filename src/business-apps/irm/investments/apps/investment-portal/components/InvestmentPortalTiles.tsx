import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { GridFourIcon, FileTextIcon, TrendUpIcon, TableIcon, ChartPieIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import {
  loadTilesFromInvestment,
  TILE_TYPES,
  TileData,
  TextTileCard,
  KpiTileCard,
  TableTileCard,
  ChartTileCard
} from '@/common/components/investment/tiles'

interface InvestmentPortalTilesProps extends BusinessAppContextProps {
  investmentId: string
  investment: Investment
}

export const InvestmentPortalTiles: React.FC<InvestmentPortalTilesProps> = ({
  investmentId,
  investment,
  accessToken,
  userInfo,
  additionalData
}) => {
  const currentUserId = userInfo?.id

  // Load tiles and filter by current user
  const userTiles = useMemo(() => {
    const allTiles = loadTilesFromInvestment(investment)

    // Filter tiles created by current user
    const filtered = allTiles.filter(tile => tile.createdBy === currentUserId)

    // Sort by order
    return filtered.sort((a, b) => a.order - b.order)
  }, [investment, currentUserId])

  // Render individual tile
  const renderTile = (tile: TileData) => {
    const tileProps = {
      tile,
      investmentId,
      accessToken,
      userInfo,
      additionalData
    }

    switch (tile.type) {
      case TILE_TYPES.TEXT:
        return <TextTileCard key={tile.id} {...tileProps} />
      case TILE_TYPES.KPI:
        return <KpiTileCard key={tile.id} {...tileProps} />
      case TILE_TYPES.TABLE:
        return <TableTileCard key={tile.id} {...tileProps} />
      case TILE_TYPES.CHART:
        return <ChartTileCard key={tile.id} {...tileProps} />
      default:
        return null
    }
  }

  // Render add tile buttons
  const renderAddTileButtons = () => (
    <div
      className="gba:flex gba:justify-end gba:gap-2 gba:mb-6 gba:flex-wrap"
      data-testid="investment-portal-add-tile-buttons"
    >
      {/* Add Text Tile */}
      <AppAction
        contexts={[
          {
            context: FlowContextName.investmentKpiTilesUpdate,
            contextData: {
              investmentId,
              scope: 'text'
            }
          }
        ]}
        accessToken={accessToken}
        emptyState="enable"
        data-testid="add-text-tile-action"
      >
        <Button variant="default" size="sm" data-testid="add-text-tile-button">
          <FileTextIcon className="gba:mr-2 gba:h-4 gba:w-4" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addText', 'Add Text Tile')}
        </Button>
      </AppAction>

      {/* Add KPI Tile */}
      <AppAction
        contexts={[
          {
            context: FlowContextName.investmentKpiTilesUpdate,
            contextData: {
              investmentId,
              scope: 'kpi'
            }
          }
        ]}
        accessToken={accessToken}
        emptyState="enable"
        data-testid="add-kpi-tile-action"
      >
        <Button variant="default" size="sm" data-testid="add-kpi-tile-button">
          <TrendUpIcon className="gba:mr-2 gba:h-4 gba:w-4" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addKpi', 'Add KPI Tile')}
        </Button>
      </AppAction>

      {/* Add TableIcon Tile */}
      <AppAction
        contexts={[
          {
            context: FlowContextName.investmentKpiTilesUpdate,
            contextData: {
              investmentId,
              scope: 'table'
            }
          }
        ]}
        accessToken={accessToken}
        emptyState="enable"
        data-testid="add-table-tile-action"
      >
        <Button variant="default" size="sm" data-testid="add-table-tile-button">
          <TableIcon className="gba:mr-2 gba:h-4 gba:w-4" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addTableIcon', 'Add TableIcon Tile')}
        </Button>
      </AppAction>

      {/* Add Chart Tile */}
      <AppAction
        contexts={[
          {
            context: FlowContextName.investmentKpiTilesUpdate,
            contextData: {
              investmentId,
              scope: 'chart'
            }
          }
        ]}
        accessToken={accessToken}
        emptyState="enable"
        data-testid="add-chart-tile-action"
      >
        <Button variant="default" size="sm" data-testid="add-chart-tile-button">
          <ChartPieIcon className="gba:mr-2 gba:h-4 gba:w-4" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addChart', 'Add Chart Tile')}
        </Button>
      </AppAction>
    </div>
  )

  // Empty state
  if (userTiles.length === 0) {
    return (
      <div data-testid="investment-portal-tiles-empty-container">
        {renderAddTileButtons()}
        <Card className="gba:border-dashed" data-testid="investment-portal-tiles-empty">
          <CardContent className="gba:py-12 gba:text-center">
            <GridFourIcon className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:text-muted-foreground" />
            <p className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'investment.portal.tiles.empty',
                "You haven't created any tiles for this investment yet."
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render tiles grid with add buttons
  return (
    <div data-testid="investment-portal-tiles-container">
      {renderAddTileButtons()}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6" data-testid="investment-portal-tiles-grid">
        {userTiles.map(renderTile)}
      </div>
    </div>
  )
}
