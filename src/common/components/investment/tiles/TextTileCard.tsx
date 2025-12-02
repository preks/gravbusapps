import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { TileData } from './types/tileTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatForDisplay } from '@/common/utils/dateFormatter'

interface TextTileCardProps extends BusinessAppContextProps {
  tile: TileData
  investmentId: string
}

export const TextTileCard: React.FC<TextTileCardProps> = ({ tile, investmentId, ...props }) => {
  const formattedDate = formatForDisplay(tile.updatedAt)

  return (
    <Card data-testid={`text-tile-${tile.id}`} className="gba:border gba:shadow-sm">
      <CardHeader className="gba:pb-4">
        <div className="gba:flex gba:justify-between gba:items-start">
          <CardTitle className="gba:text-lg">{tile.title}</CardTitle>

          {/* Action Buttons */}
          <div className="gba:flex gba:gap-2">
            <AppAction
              variant="update-secondary"
              contexts={[
                {
                  context: FlowContextName.investmentKpiTilesUpdate,
                  contextData: {
                    investmentId,
                    scope: 'text',
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
        <div className="gba:whitespace-pre-wrap gba:text-sm" data-testid={`tile-content-${tile.id}`}>
          {tile.textContent || (
            <span className="gba:text-muted-foreground gba:italic">
              {getTranslationFromI18nKeyAndLabel('investment.tiles.noContent', 'No content')}
            </span>
          )}
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
