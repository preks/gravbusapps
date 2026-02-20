import { useState, useRef, useCallback } from 'react'

/**
 * Shared hook for chart-click-to-show-table pattern.
 * Manages selected chart id and scrolls to table when selection changes.
 */
export function useChartTableSelection() {
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const handleChartClick = useCallback(
    (chartId: string) => {
      const isSelecting = selectedChart !== chartId
      setSelectedChart(prev => (prev === chartId ? null : chartId))
      if (isSelecting && tableRef.current) {
        setTimeout(() => {
          tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
        }, 100)
      }
    },
    [selectedChart]
  )

  return { selectedChart, setSelectedChart, tableRef, handleChartClick }
}
