import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { Edit, Trash2, Table as TableIcon } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { TileData } from '../../types/tileTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface TableTileCardProps extends BusinessAppContextProps {
  tile: TileData
  investmentId: string
  onDelete: (tileId: string) => void
}

export const TableTileCard: React.FC<TableTileCardProps> = ({ tile, investmentId, onDelete, ...props }) => {
  const tableData = tile.tableData

  const formattedDate = new Date(tile.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

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
            {/* Edit Button - Opens popup via AppAction */}
            <AppAction
              contextsArray={[FlowContextName.investmentKpiTilesUpdate]}
              externalContextData={{
                investmentId,
                scope: 'table',
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

            {/* Delete Button */}
            <Button
              size="icon"
              variant="ghost"
              data-testid={`delete-tile-button-${tile.id}`}
              onClick={() => onDelete(tile.id)}
            >
              <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
            </Button>
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
