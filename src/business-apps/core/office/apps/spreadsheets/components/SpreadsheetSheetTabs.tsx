/**
 * SpreadsheetSheetTabs Component
 *
 * Renders tab navigation for multiple sheets in a spreadsheet app.
 */

import React, { memo } from 'react'
import { Database, Layers } from 'lucide-react'
import type { SpreadsheetSheet } from '../types'

export interface SpreadsheetSheetTabsProps {
  sheets: SpreadsheetSheet[]
  activeSheetId: string
  onSheetChange: (sheetId: string) => void
  /** Optional: For entity data source sheets, pass the current entity data length */
  entityDataLength?: number
  'data-testid'?: string
}

export const SpreadsheetSheetTabs: React.FC<SpreadsheetSheetTabsProps> = memo(function SpreadsheetSheetTabs({
  sheets,
  activeSheetId,
  onSheetChange,
  entityDataLength,
  'data-testid': testId = 'spreadsheet-sheet-tabs'
}) {
  // Only render if there are multiple sheets
  if (sheets.length <= 1) {
    return null
  }

  return (
    <div
      className="gba:px-4 gba:border-t gba:border-border/50 gba:w-full gba:overflow-hidden gba:bg-muted/10"
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:gap-0.5 gba:py-1.5 gba:w-full gba:overflow-x-auto">
        {sheets.map(sheet => {
          const isActive = sheet.id === activeSheetId
          const hasEntitySource = sheet.entityDataSource?.enabled
          // For active entity source sheets, use entityDataLength if provided
          const dataCount =
            isActive && hasEntitySource && entityDataLength !== undefined ? entityDataLength : sheet.data.length

          return (
            <button
              key={sheet.id}
              type="button"
              className={`gba:group gba:relative gba:flex gba:items-center gba:gap-2 gba:px-3.5 gba:py-2 gba:text-sm gba:rounded-t-lg gba:transition-all gba:duration-200 ${
                isActive
                  ? 'gba:bg-background gba:text-foreground gba:font-medium gba:shadow-sm gba:border gba:border-b-0 gba:border-border/50 gba:-mb-px gba:z-10'
                  : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/30'
              }`}
              onClick={() => onSheetChange(sheet.id)}
              data-testid={`${testId}-tab-${sheet.id}`}
            >
              {hasEntitySource ? (
                <Database
                  className={`gba:w-3.5 gba:h-3.5 gba:flex-shrink-0 ${isActive ? 'gba:text-info' : 'gba:text-muted-foreground gba:group-hover:text-info'}`}
                />
              ) : (
                <Layers
                  className={`gba:w-3.5 gba:h-3.5 gba:flex-shrink-0 ${isActive ? 'gba:text-primary' : 'gba:text-muted-foreground gba:group-hover:text-primary'}`}
                />
              )}
              <span className="gba:truncate gba:max-w-[120px]">{sheet.name}</span>
              <span
                className={`gba:text-xs gba:px-1.5 gba:py-0.5 gba:rounded-full gba:tabular-nums ${
                  isActive
                    ? 'gba:bg-primary/10 gba:text-primary'
                    : 'gba:bg-muted gba:text-muted-foreground gba:group-hover:bg-muted/70'
                }`}
              >
                {dataCount}
              </span>
              {/* Active indicator line */}
              {isActive && (
                <div className="gba:absolute gba:bottom-0 gba:left-2 gba:right-2 gba:h-0.5 gba:bg-primary gba:rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
})
