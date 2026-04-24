import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, CardContent } from '@newwork/nw-design-system'
import { GridFourIcon } from '@phosphor-icons/react'
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

  // Portal is view-only: users see tiles they have created themselves,
  // sorted by their configured display order. Tiles are managed from the
  // investment record screens, not from the portal.
  const userTiles = useMemo(() => {
    const allTiles = loadTilesFromInvestment(investment)
    const filtered = allTiles.filter(tile => tile.createdBy === currentUserId)
    return filtered.sort((a, b) => a.order - b.order)
  }, [investment, currentUserId])

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

  if (userTiles.length === 0) {
    return (
      <Card className="gba:border-dashed" data-testid="investment-portal-tiles-empty">
        <CardContent className="gba:py-12 gba:text-center">
          <GridFourIcon className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:text-muted-foreground" />
          <p className="gba:font-medium gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('investment.portal.tiles.empty.title', 'No tiles yet')}
          </p>
          <p className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'investment.portal.tiles.empty.description',
              'Once you add a tile to this investment, you will see it here.'
            )}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6" data-testid="investment-portal-tiles-grid">
      {userTiles.map(renderTile)}
    </div>
  )
}
