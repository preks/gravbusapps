import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { Edit, Trash2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { TileData } from './types/tileTypes'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'

interface TextTileCardProps extends BusinessAppContextProps {
  tile: TileData
  investmentId: string
  onRefresh?: () => void
}

export const TextTileCard: React.FC<TextTileCardProps> = ({ tile, investmentId, onRefresh, ...props }) => {
  const formattedDate = formatDate(tile.updatedAt, 'date.short')

  return (
    <Card data-testid={`text-tile-${tile.id}`} className="gba:border gba:shadow-sm">
      <CardHeader className="gba:pb-4">
        <div className="gba:flex gba:justify-between gba:items-start">
          <CardTitle className="gba:text-lg">{tile.title}</CardTitle>

          {/* Action Buttons */}
          <div className="gba:flex gba:gap-2">
            {/* Edit Button - Opens popup via AppAction */}
            <AppAction
              contextsArray={[FlowContextName.investmentKpiTilesUpdate]}
              externalContextData={{
                investmentId,
                scope: 'text',
                tileId: tile.id
              }}
              accessToken={props.accessToken}
              emptyStateBehavior="hide"
              data-testid={`edit-tile-action-${tile.id}`}
            >
              <Button size="icon" variant="ghost" data-testid={`edit-tile-button-${tile.id}`}>
                <Edit className="gba:h-4 gba:w-4" />
              </Button>
            </AppAction>

            {/* Delete Button - Deletes tile via AppAction */}
            <AppAction
              contextsArray={[FlowContextName.investmentKpiTilesUpdate]}
              externalContextData={{
                investmentId,
                scope: 'delete',
                tileId: tile.id
              }}
              accessToken={props.accessToken}
              emptyStateBehavior="hide"
              onProcessCompletion={onRefresh}
              data-testid={`delete-tile-action-${tile.id}`}
            >
              <Button size="icon" variant="ghost" data-testid={`delete-tile-button-${tile.id}`}>
                <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
              </Button>
            </AppAction>
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
