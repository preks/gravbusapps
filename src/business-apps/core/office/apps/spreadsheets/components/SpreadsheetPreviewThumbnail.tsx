/**
 * SpreadsheetPreviewThumbnail
 *
 * Lightweight preview for spreadsheet grid cards.
 * Renders a mini table from the first 5 rows when visible.
 * No external library - uses native table styling.
 */

import React, { useEffect, useRef, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { useSpreadsheetPreview } from '../hooks/useSpreadsheetPreview'
import type { SpreadsheetAppSummary } from '../types'
import { getIconByName } from '../utils/appIcons'

export interface SpreadsheetPreviewThumbnailProps {
  app: SpreadsheetAppSummary
  className?: string
  'data-testid'?: string
}

export const SpreadsheetPreviewThumbnail: React.FC<SpreadsheetPreviewThumbnailProps> = ({
  app,
  className = '',
  'data-testid': testId = 'spreadsheet-preview-thumbnail'
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
        }
      },
      { rootMargin: '50px', threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { columns, rows, isLoading } = useSpreadsheetPreview(app.id, app.firstSheetId, isVisible)

  const hasPreview = columns.length > 0 || rows.length > 0
  const IconComponent = app.icon ? getIconByName(app.icon) : null

  const renderFallbackIcon = () => (
    <div
      className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full gba:bg-gradient-to-br gba:from-emerald-500/10 gba:to-teal-500/10"
      data-testid={`${testId}-fallback`}
    >
      {IconComponent ? (
        <IconComponent className="gba:w-16 gba:h-16 gba:text-emerald-500/50" />
      ) : (
        <FileSpreadsheet className="gba:w-16 gba:h-16 gba:text-emerald-500/50" />
      )}
    </div>
  )

  if (!app.firstSheetId) {
    return (
      <div ref={containerRef} className={`gba:w-full gba:h-full ${className}`} data-testid={testId}>
        {renderFallbackIcon()}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className={`gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full gba:bg-gradient-to-br gba:from-emerald-500/10 gba:to-teal-500/10 ${className}`}
        data-testid={testId}
      >
        <FileSpreadsheet className="gba:w-12 gba:h-12 gba:text-emerald-500/30 gba:animate-pulse" />
      </div>
    )
  }

  if (!hasPreview) {
    return (
      <div ref={containerRef} className={`gba:w-full gba:h-full ${className}`} data-testid={testId}>
        {renderFallbackIcon()}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`gba:w-full gba:h-full gba:overflow-hidden gba:bg-background ${className}`}
      data-testid={testId}
    >
      <div className="gba:p-1 gba:overflow-auto gba:max-h-full">
        <table className="gba:w-full gba:min-w-0 gba:border-collapse gba:text-[10px]">
          {columns.length > 0 && (
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.id}
                    className="gba:border gba:border-border gba:bg-muted/50 gba:px-1.5 gba:py-0.5 gba:text-left gba:font-medium gba:text-muted-foreground gba:truncate gba:max-w-[60px]"
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.slice(0, 5).map((row, idx) => (
              <tr key={(row._id as string) || idx}>
                {columns.map(col => (
                  <td
                    key={col.id}
                    className="gba:border gba:border-border gba:px-1.5 gba:py-0.5 gba:truncate gba:max-w-[60px] gba:text-foreground"
                  >
                    {String(row[col.name] ?? row[col.id] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SpreadsheetPreviewThumbnail
