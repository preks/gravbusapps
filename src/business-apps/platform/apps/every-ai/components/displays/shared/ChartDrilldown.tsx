import React, { useEffect, useMemo } from 'react'
import { Button } from '@newwork/nw-design-system'
import { X } from '@phosphor-icons/react'
import type { DataQuerySpec } from '../../../types/models'
import { useDisplayDataRequery } from '../../../hooks/useDisplayDataRequery'
import { inferTableDataFromGraphqlRows } from '../interactive-table/graphqlRowsToTableData'
import { InteractiveTableDisplay } from '../interactive-table/InteractiveTableDisplay'

export interface ChartDrilldownProps {
  accessToken: string
  querySpec: DataQuerySpec
  matchValue: string
  onClose: () => void
}

/** Inline panel rendered below a chart when the user clicks a drillable segment.
 * It re-queries GraphQL directly (no agent round trip) using the embedded spec
 * and shows the matching rows as an interactive table. */
export const ChartDrilldown: React.FC<ChartDrilldownProps> = ({ accessToken, querySpec, matchValue, onClose }) => {
  const { rows, loading, error, run } = useDisplayDataRequery(accessToken, querySpec)

  const drilldown = useMemo(
    () => querySpec.drilldowns?.find(entry => entry.matchValue === matchValue),
    [querySpec.drilldowns, matchValue]
  )

  useEffect(() => {
    if (drilldown) {
      const offsetVar = querySpec.offsetVar ?? 'offset'
      run({ ...drilldown.variables, [offsetVar]: 0 })
    }
  }, [drilldown, querySpec.offsetVar, run])

  const title = drilldown?.title ?? `Details: ${matchValue}`
  const tableData = useMemo(() => inferTableDataFromGraphqlRows(rows, { title }), [rows, title])

  return (
    <div className="gba:mt-4 gba:border-t gba:pt-4" data-testid="chart-drilldown">
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
        <p className="gba:text-sm gba:font-semibold gba:text-foreground">{title}</p>
        <Button variant="ghost" size="sm" onClick={onClose} data-testid="chart-drilldown-close">
          <X className="gba:w-4 gba:h-4" />
        </Button>
      </div>
      {loading ? (
        <p className="gba:text-sm gba:text-muted-foreground">Loading details…</p>
      ) : error ? (
        <p className="gba:text-sm gba:text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="gba:text-sm gba:text-muted-foreground">No matching records.</p>
      ) : (
        <InteractiveTableDisplay data={tableData} accessToken={accessToken} />
      )}
    </div>
  )
}
