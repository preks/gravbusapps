import React, { useMemo } from 'react'
import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { FileText, TrendingUp, Table, PieChart } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { TileData, TILE_TYPES } from './types/tileTypes'
import { TextTileCard } from './TextTileCard'
import { KpiTileCard } from './KpiTileCard'
import { TableTileCard } from './TableTileCard'
import { ChartTileCard } from './ChartTileCard'
import { loadTilesFromInvestment } from './utils/tileUtils'

interface InvestmentTilesTabProps extends BusinessAppContextProps {
  investmentId: string
  investment: any
}

export const InvestmentTilesTab: React.FC<InvestmentTilesTabProps> = ({ investmentId, investment, ...props }) => {
  // Parse tiles from additionalProperties
  const tiles = useMemo(() => {
    const tilesData = loadTilesFromInvestment(investment)
    return tilesData.sort((a, b) => a.order - b.order)
  }, [investment])

  // Render tile based on type
  const renderTile = (tile: TileData) => {
    // Check if table tile should span full width (4+ columns)
    const isTableWithManyColumns =
      tile.type === TILE_TYPES.TABLE && tile.tableData && tile.tableData.columns.length >= 4

    const wrapperClass = isTableWithManyColumns ? 'gba:lg:col-span-2' : ''

    let tileComponent
    switch (tile.type) {
      case TILE_TYPES.TEXT:
        tileComponent = <TextTileCard key={tile.id} tile={tile} investmentId={investmentId} {...props} />
        break
      case TILE_TYPES.KPI:
        tileComponent = <KpiTileCard key={tile.id} tile={tile} investmentId={investmentId} {...props} />
        break
      case TILE_TYPES.TABLE:
        tileComponent = <TableTileCard key={tile.id} tile={tile} investmentId={investmentId} {...props} />
        break
      case TILE_TYPES.CHART:
        tileComponent = <ChartTileCard key={tile.id} tile={tile} investmentId={investmentId} {...props} />
        break
      default:
        return null
    }

    // Wrap in div with conditional class for wide tables
    return wrapperClass ? (
      <div key={tile.id} className={wrapperClass}>
        {tileComponent}
      </div>
    ) : (
      tileComponent
    )
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
            contexts={[
              {
                context: FlowContextName.investmentKpiTilesUpdate,
                contextData: {
                  investmentId,
                  scope: 'text'
                }
              }
            ]}
            accessToken={props.accessToken}
            emptyState="enable"
            data-testid="add-text-tile-action"
          >
            <Button variant="default" size="sm" data-testid="add-text-tile-button">
              <FileText className="gba:mr-2 gba:h-4 gba:w-4" />
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
            accessToken={props.accessToken}
            emptyState="enable"
            data-testid="add-kpi-tile-action"
          >
            <Button variant="default" size="sm" data-testid="add-kpi-tile-button">
              <TrendingUp className="gba:mr-2 gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('investment.tiles.addKpi', 'Add KPI Tile')}
            </Button>
          </AppAction>

          {/* Add Table Tile */}
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
            accessToken={props.accessToken}
            emptyState="enable"
            data-testid="add-table-tile-action"
          >
            <Button variant="default" size="sm" data-testid="add-table-tile-button">
              <Table className="gba:mr-2 gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('investment.tiles.addTable', 'Add Table Tile')}
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
            accessToken={props.accessToken}
            emptyState="enable"
            data-testid="add-chart-tile-action"
          >
            <Button variant="default" size="sm" data-testid="add-chart-tile-button">
              <PieChart className="gba:mr-2 gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('investment.tiles.addChart', 'Add Chart Tile')}
            </Button>
          </AppAction>
        </div>
      </div>

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
    </div>
  )
}

export default InvestmentTilesTab
