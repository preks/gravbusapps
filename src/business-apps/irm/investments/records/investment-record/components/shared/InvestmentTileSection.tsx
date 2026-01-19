import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Alert } from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action/AppAction'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentTileFields } from '../../hooks/useInvestmentTileFields'
import { getPhosphorIcon } from '../../utils/phosphorIconMapping'

interface InvestmentTileSectionProps extends BusinessAppContextProps {
  investment?: any
  isLoading?: boolean
  'data-testid'?: string
}

const prefixDataTestId = 'investment-tile-section'

const InvestmentTileSection: React.FC<InvestmentTileSectionProps> = ({
  investment,
  isLoading: parentLoading,
  accessToken,
  userInfo,
  additionalData,
  'data-testid': dataTestId = prefixDataTestId
}) => {
  // Create business app context
  const businessAppContext = {
    accessToken,
    userInfo,
    additionalData
  }

  // Get dynamic tile fields from catalog
  const {
    processedTiles,
    loading: tilesLoading,
    error: tilesError
  } = useInvestmentTileFields(businessAppContext, investment)

  const isLoading = parentLoading || tilesLoading

  // Show loading state
  if (isLoading) {
    return (
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6" data-testid={`${dataTestId}-loading`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} data-testid={`${dataTestId}-loading-card-${index}`}>
            <CardHeader>
              <div className="gba:animate-pulse">
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="gba:animate-pulse gba:space-y-2">
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-5/6"></div>
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-4/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Show error state
  if (tilesError) {
    return (
      <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
        <h4>Error Loading Tiles</h4>
        <p>{tilesError}</p>
      </Alert>
    )
  }

  // Show empty state if no tiles configured
  if (!processedTiles.length) {
    return (
      <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid={`${dataTestId}-empty`}>
        <p>No tile fields configured for this investment type.</p>
      </div>
    )
  }

  // Calculate grid columns based on number of tiles
  const getGridCols = (tileCount: number): string => {
    if (tileCount === 1) return 'gba:grid-cols-1'
    if (tileCount === 2) return 'gba:grid-cols-1 gba:lg:grid-cols-2'
    if (tileCount >= 3) return 'gba:grid-cols-1 gba:lg:grid-cols-3'
    return 'gba:grid-cols-1 gba:lg:grid-cols-3'
  }

  return (
    <div className={`gba:grid ${getGridCols(processedTiles.length)} gba:gap-6`} data-testid={dataTestId}>
      {processedTiles.map(tile => {
        const IconComponent = getPhosphorIcon(tile.icon)

        return (
          <Card key={tile.key} data-testid={`${dataTestId}-tile-${tile.key}`} className="gba:relative">
            <CardHeader>
              <div className="gba:flex gba:items-center gba:justify-between">
                <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                  <IconComponent className="gba:h-5 gba:w-5 gba:text-blue-600" />
                  {tile.label}
                </CardTitle>

                {/* Action for editing */}
                <div className="gba:flex gba:justify-start gba:gap-2">
                  <AppAction
                    contextsArray={[FlowContextName.investmentTileUpdate]}
                    externalContextData={{
                      investmentId: investment?.id,
                      tileKey: tile.key,
                      scope: 'tile'
                    }}
                    prefixDataTestId={`${dataTestId}-edit-${tile.key}`}
                    accessToken={accessToken}
                    emptyStateBehavior="hide"
                    deferMainContextRequestsUntilClick
                  >
                    <PencilSimpleIcon
                      className="gba:h-4 gba:w-4 gba:text-gray-500 hover:gba:text-blue-600 gba:cursor-pointer"
                      data-testid={`${dataTestId}-edit-${tile.key}-icon`}
                    />
                  </AppAction>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="gba:space-y-3" data-testid={`${dataTestId}-content-${tile.key}`}>
                {tile.value ? (
                  // Show tile content if it exists
                  <div className="gba:whitespace-pre-wrap gba:text-sm gba:text-gray-700 gba:leading-relaxed">
                    {tile.value}
                  </div>
                ) : (
                  // Show empty state for individual tile
                  <div className="gba:text-center gba:py-4 gba:text-gray-400">
                    <p className="gba:text-sm">No content yet.</p>
                    <p className="gba:text-xs gba:mt-1">Click the edit button to add content.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default InvestmentTileSection
