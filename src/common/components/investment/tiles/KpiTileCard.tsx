import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { TrendingUp } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { TileData } from './types/tileTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatForDisplay } from '@/common/utils/dateFormatter'

interface KpiTileCardProps extends BusinessAppContextProps {
  tile: TileData
  investmentId: string
}

export const KpiTileCard: React.FC<KpiTileCardProps> = ({ tile, investmentId, ...props }) => {
  // Format KPI value with unit
  const formattedValue =
    tile.kpiValue !== undefined && tile.kpiValue !== null
      ? `${tile.kpiValue}${tile.kpiUnit || ''}`
      : getTranslationFromI18nKeyAndLabel('common.notAvailable', 'N/A')

  const formattedDate = formatForDisplay(tile.updatedAt)

  return (
    <Card data-testid={`kpi-tile-${tile.id}`} className="gba:border gba:shadow-sm">
      <CardHeader className="gba:pb-4">
        <div className="gba:flex gba:justify-between gba:items-start">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:p-2 gba:rounded-lg gba:bg-primary/10">
              <TrendingUp className="gba:h-5 gba:w-5 gba:text-primary" />
            </div>
            <CardTitle className="gba:text-lg">{tile.title}</CardTitle>
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:gap-2">
            <AppAction
              variant="update-secondary"
              contexts={[
                {
                  context: FlowContextName.investmentKpiTilesUpdate,
                  contextData: {
                    investmentId,
                    scope: 'kpi',
                    tileId: tile.id
                  }
                }
              ]}
              accessToken={props.accessToken}
              data-testid={`edit-tile-${tile.id}`}
            />

            <AppAction
              variant="delete-secondary"
              contexts={[
                {
                  context: FlowContextName.investmentKpiTilesUpdate,
                  contextData: {
                    investmentId,
                    scope: 'delete',
                    tileId: tile.id
                  }
                }
              ]}
              accessToken={props.accessToken}
              data-testid={`delete-tile-${tile.id}`}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="gba:text-4xl gba:font-bold gba:text-primary gba:mb-2" data-testid={`tile-value-${tile.id}`}>
          {formattedValue}
        </div>
        <div
          className="gba:mt-4 gba:text-xs gba:text-muted-foreground gba:text-right"
          data-testid={`tile-updated-${tile.id}`}
        >
          {getTranslationFromI18nKeyAndLabel('investment.tiles.lastUpdated', 'Last updated')}: {formattedDate}
        </div>
      </CardContent>
    </Card>
  )
}
