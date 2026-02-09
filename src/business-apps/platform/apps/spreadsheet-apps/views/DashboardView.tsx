/**
 * DashboardView Component
 *
 * Dashboard with KPIs and data summary
 */

import React, { memo } from 'react'
import { Card } from '@newwork/nw-design-system'
import { BarChart3 } from 'lucide-react'
import type { SpreadsheetSheet } from '../types'

export interface DashboardViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  testId: string
}

/**
 * DashboardView - KPI cards and data summary
 */
export const DashboardView = memo<DashboardViewProps>(function DashboardView({ sheet, data, testId }) {
  // Calculate KPIs
  const numericColumns = sheet.columns.filter(c => ['number', 'currency', 'percentage'].includes(c.type))

  const kpis = numericColumns.slice(0, 4).map(col => {
    const values = data.map(row => Number(row[col.name])).filter(v => !isNaN(v))

    const sum = values.reduce((a, b) => a + b, 0)
    const avg = values.length > 0 ? sum / values.length : 0

    return {
      label: col.label,
      value: col.type === 'currency' ? `$${sum.toLocaleString()}` : sum.toLocaleString(),
      subValue: `Avg: ${col.type === 'currency' ? '$' : ''}${avg.toFixed(2)}`,
      type: col.type
    }
  })

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* KPI Cards */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="gba:p-6">
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">{kpi.label}</p>
            <p className="gba:text-2xl gba:font-bold gba:text-foreground">{kpi.value}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{kpi.subValue}</p>
          </Card>
        ))}
      </div>

      {/* Placeholder for charts */}
      <Card className="gba:p-6">
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64 gba:bg-muted/20 gba:rounded-lg">
          <div className="gba:text-center">
            <BarChart3 className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-3" />
            <p className="gba:text-muted-foreground">Charts visualization coming soon</p>
          </div>
        </div>
      </Card>

      {/* Data summary */}
      <Card className="gba:p-6">
        <h3 className="gba:font-semibold gba:text-foreground gba:mb-4">Data Summary</h3>
        <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Total Records</p>
            <p className="gba:text-xl gba:font-semibold">{data.length}</p>
          </div>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Columns</p>
            <p className="gba:text-xl gba:font-semibold">{sheet.columns.length}</p>
          </div>
        </div>
      </Card>
    </div>
  )
})

export default DashboardView
