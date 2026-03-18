import React, { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { BoardRow, BoardColumn } from '../../types'
import { CellRenderer } from '../table/CellRenderer'
import { FlowTimelinePanel } from '../flow-engine/FlowTimelinePanel'

interface RowPagePropertiesProps {
  row: BoardRow
  columns: BoardColumn[]
  'data-testid'?: string
}

export function RowPageProperties({
  row,
  columns,
  'data-testid': testId = 'row-page-properties'
}: RowPagePropertiesProps) {
  const [expanded, setExpanded] = useState(true)
  const hasFlow = row.data.flowId && typeof row.data.flowId === 'string'

  return (
    <div className="gba:max-w-2xl gba:mx-auto gba:px-8" data-testid={testId}>
      {/* Collapsible properties */}
      <section className="gba:mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:mb-2 gba:group"
          data-testid={`${testId}-toggle`}
        >
          <ChevronRight
            className={`gba:w-3.5 gba:h-3.5 gba:transition-transform gba:duration-200 ${
              expanded ? 'gba:rotate-90' : ''
            }`}
          />
          <span>Properties</span>
          <span className="gba:text-muted-foreground/40 gba:tabular-nums">{columns.length}</span>
        </button>

        <div
          className={`gba:grid gba:transition-all gba:duration-200 gba:origin-top ${
            expanded ? 'gba:grid-rows-[1fr] gba:opacity-100' : 'gba:grid-rows-[0fr] gba:opacity-0'
          }`}
        >
          <div className="gba:overflow-hidden">
            <div className="gba:grid gba:grid-cols-[minmax(0,1fr)] gba:sm:grid-cols-2 gba:gap-x-6 gba:gap-y-0.5 gba:pl-5 gba:pb-2">
              {columns.map(col => (
                <div
                  key={col.id}
                  className="gba:flex gba:items-center gba:gap-3 gba:py-1.5 gba:rounded-md gba:hover:bg-muted/30 gba:px-2 gba:-mx-2 gba:transition-colors gba:duration-150"
                >
                  <span className="gba:text-xs gba:text-muted-foreground gba:w-28 gba:flex-shrink-0 gba:truncate">
                    {col.label}
                  </span>
                  <span className="gba:flex-1 gba:min-w-0 gba:text-sm">
                    <CellRenderer
                      value={row.data[col.name]}
                      type={col.type}
                      columnName={col.name}
                      options={col.selectOptions}
                      isPrimary={!!col.isPrimary}
                      rowData={row.data}
                      relationConfig={col.relationConfig}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Flow timeline */}
      {hasFlow && (
        <section className="gba:mb-4">
          <FlowTimelinePanel flowId={row.data.flowId as string} data-testid={`${testId}-flow-timeline`} />
        </section>
      )}

      {/* Separator */}
      <div className="gba:h-px gba:bg-border/50 gba:mb-6" />
    </div>
  )
}
