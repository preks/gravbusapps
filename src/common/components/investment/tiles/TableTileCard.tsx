import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { Table as TableIcon } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { TileData } from './types/tileTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatForDisplay } from '@/common/utils/dateFormatter'

interface TableTileCardProps extends BusinessAppContextProps {
  tile: TileData
  investmentId: string
}

export const TableTileCard: React.FC<TableTileCardProps> = ({ tile, investmentId, ...props }) => {
  const tableData = tile.tableData
  const formattedDate = formatForDisplay(tile.updatedAt)

  return (
    <Card data-testid={`table-tile-${tile.id}`} className="gba:border gba:shadow-sm">
      <CardHeader className="gba:pb-4">
        <div className="gba:flex gba:justify-between gba:items-start">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:p-2 gba:rounded-lg gba:bg-info/10">
              <TableIcon className="gba:h-5 gba:w-5 gba:text-info" />
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
                    scope: 'table',
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
        {tableData && tableData.rows.length > 0 && tableData.columns.length > 0 ? (
          <div className="gba:overflow-x-auto" data-testid={`tile-table-${tile.id}`}>
            <table className="gba:w-full gba:border-collapse gba:text-sm">
              <thead>
                <tr>
                  {tableData.columns.map(column => (
                    <th
                      key={column.id}
                      className="gba:border gba:border-border gba:bg-muted gba:px-3 gba:py-2 gba:text-left gba:font-semibold gba:min-w-[200px]"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map(row => (
                  <tr key={row.id}>
                    {tableData.columns.map(column => (
                      <td
                        key={`${row.id}-${column.id}`}
                        className="gba:border gba:border-border gba:px-3 gba:py-2 gba:min-w-[200px]"
                      >
                        {row.cells[column.id] || (
                          <span className="gba:text-muted-foreground gba:italic gba:text-xs">Empty</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gba:text-center gba:py-6 gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('investment.tiles.noTableData', 'No table data')}
          </div>
        )}
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
