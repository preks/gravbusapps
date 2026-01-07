import React, { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { CalculationStep } from '../hooks/useCalculationTrace'

interface TraceChartProps {
  steps: CalculationStep[]
}

interface ChartPoint {
  step: CalculationStep
  index: number
  amount: number
  change: number
  x: number
  y: number
}

/**
 * Visual timeline chart showing how the calculation amount grows and falls
 * through each step. Hover over points to see step details.
 */
export const TraceChart: React.FC<TraceChartProps> = ({ steps }) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Calculate chart data points
  const chartData = useMemo(() => {
    const allPoints: ChartPoint[] = []
    let runningTotal = 0

    // Filter relevant steps:
    // Include all calculation steps EXCEPT generated allowances (which would double-count)
    const relevantSteps = steps.filter(step => {
      // Always include deductions and mileage
      if (step.category === 'DEDUCTION') return true
      if (step.category === 'MILEAGE') return true

      // For AMOUNT_CALCULATION and EXPENSE_ITEM, exclude generated allowances
      if (step.category === 'AMOUNT_CALCULATION' || step.category === 'EXPENSE_ITEM') {
        // Exclude by expenseClass containing ALLOWANCE
        const expenseClass = step.inputs?.expenseClass || ''
        if (expenseClass.includes('ALLOWANCE')) {
          return false
        }
        // Exclude by title being "Generated Allowance"
        const title = step.inputs?.title || ''
        if (title === 'Generated Allowance') {
          return false
        }
        return true
      }

      return false
    })

    relevantSteps.forEach((step, index) => {
      let change = 0

      if (step.category === 'AMOUNT_CALCULATION' || step.category === 'MILEAGE' || step.category === 'EXPENSE_ITEM') {
        // Try calculatedValue first (if it's a real number), then outputs.amount
        if (typeof step.calculatedValue === 'number' && !isNaN(step.calculatedValue)) {
          change = step.calculatedValue
        } else if (step.outputs?.amount != null) {
          change = Number(step.outputs.amount)
        } else if (step.outputs?.itemAmount != null) {
          change = Number(step.outputs.itemAmount)
        } else if (step.outputs?.result != null && typeof step.outputs.result === 'number') {
          change = step.outputs.result
        }
      } else if (step.category === 'DEDUCTION') {
        if (step.outputs?.deductionAmount != null) {
          change = -Math.abs(Number(step.outputs.deductionAmount))
        } else if (typeof step.calculatedValue === 'number' && !isNaN(step.calculatedValue)) {
          change = -Math.abs(step.calculatedValue)
        }
      }

      if (change !== 0) {
        runningTotal += change
        allPoints.push({
          step,
          index,
          amount: runningTotal,
          change,
          x: 0,
          y: 0
        })
      }
    })

    // If too many points, sample them to keep chart readable
    const MAX_POINTS = 30
    if (allPoints.length <= MAX_POINTS) {
      return allPoints
    }

    // Sample points: keep first, last, and evenly spaced points in between
    // Also keep any deduction points (they're important!)
    const sampledPoints: ChartPoint[] = []
    const step = Math.floor(allPoints.length / (MAX_POINTS - 2))

    for (let i = 0; i < allPoints.length; i++) {
      const point = allPoints[i]
      const isFirst = i === 0
      const isLast = i === allPoints.length - 1
      const isDeduction = point.change < 0
      const isSamplePoint = i % step === 0

      if (isFirst || isLast || isDeduction || isSamplePoint) {
        sampledPoints.push({ ...point, index: sampledPoints.length })
      }
    }

    return sampledPoints
  }, [steps])

  // Chart dimensions
  const chartWidth = 800
  const chartHeight = 300
  const padding = { top: 40, right: 40, bottom: 60, left: 80 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // Calculate scales
  const { minAmount, maxAmount, points } = useMemo(() => {
    if (chartData.length === 0) {
      return { minAmount: 0, maxAmount: 100, points: [] }
    }

    const amounts = chartData.map(d => d.amount)
    const min = Math.min(0, ...amounts)
    const max = Math.max(...amounts, 1)
    const range = max - min || 1

    const calculatedPoints = chartData.map((point, i) => ({
      ...point,
      x: padding.left + (i / Math.max(chartData.length - 1, 1)) * innerWidth,
      y: padding.top + innerHeight - ((point.amount - min) / range) * innerHeight
    }))

    return { minAmount: min, maxAmount: max, points: calculatedPoints }
  }, [chartData, innerWidth, innerHeight, padding])

  // Generate path for the line
  const linePath = useMemo(() => {
    if (points.length === 0) return ''
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }, [points])

  // Generate path for the area under the line
  const areaPath = useMemo(() => {
    if (points.length === 0) return ''
    const baseline = padding.top + innerHeight
    return `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
  }, [linePath, points, padding.top, innerHeight])

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
  }

  // Get step category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      AMOUNT_CALCULATION: '#10b981',
      DEDUCTION: '#ef4444',
      MILEAGE: '#3b82f6',
      TRAVEL_BREAKDOWN: '#8b5cf6',
      COUNTRY_RULE: '#a855f7',
      RULE_LOOKUP: '#f59e0b',
      AGGREGATION: '#06b6d4'
    }
    return colors[category] || '#6b7280'
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  if (points.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64 gba:bg-gray-50 gba:rounded-lg gba:border gba:border-gray-200">
        <p className="gba:text-gray-500">No calculation data to visualize</p>
      </div>
    )
  }

  return (
    <div className="gba:relative">
      {/* Chart title */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <div>
          <h3 className="gba:text-sm gba:font-semibold gba:text-gray-700">Expense Calculation Flow</h3>
          <p className="gba:text-xs gba:text-gray-400 gba:mt-0.5">Allowances, deductions, mileage, and expense items</p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs">
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-emerald-500" />
            <span className="gba:text-gray-600">Allowance/Expense</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-blue-500" />
            <span className="gba:text-gray-600">Mileage</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-red-500" />
            <span className="gba:text-gray-600">Deduction</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="gba:overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {/* Grid lines */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="gba:[stop-color:theme(colors.emerald.500)]" stopOpacity="0.3" />
            <stop offset="100%" className="gba:[stop-color:theme(colors.emerald.500)]" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
          const y = padding.top + innerHeight * (1 - tick)
          const value = minAmount + (maxAmount - minAmount) * tick
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                className="gba:stroke-gray-200"
                strokeDasharray={tick === 0 ? '0' : '4,4'}
              />
              <text
                x={padding.left - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="gba:text-xs gba:fill-gray-500"
              >
                {formatCurrency(value)}
              </text>
            </g>
          )
        })}

        {/* Zero line if applicable */}
        {minAmount < 0 && maxAmount > 0 && (
          <line
            x1={padding.left}
            y1={padding.top + innerHeight - ((0 - minAmount) / (maxAmount - minAmount)) * innerHeight}
            x2={chartWidth - padding.right}
            y2={padding.top + innerHeight - ((0 - minAmount) / (maxAmount - minAmount)) * innerHeight}
            className="gba:stroke-gray-400"
            strokeWidth="1"
          />
        )}

        {/* Area under the curve */}
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Main line */}
        <path
          d={linePath}
          fill="none"
          className="gba:stroke-emerald-500"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => {
          const isDeduction = point.change < 0
          const isMileage = point.step.category === 'MILEAGE'
          const isHovered = hoveredPoint?.index === point.index

          // Determine point color based on type
          let pointColorClass = 'gba:fill-emerald-500'
          let textColorClass = 'gba:fill-emerald-600'
          if (isDeduction) {
            pointColorClass = 'gba:fill-red-500'
            textColorClass = 'gba:fill-red-600'
          } else if (isMileage) {
            pointColorClass = 'gba:fill-blue-500'
            textColorClass = 'gba:fill-blue-600'
          }

          return (
            <g key={i}>
              {/* Vertical line on hover */}
              {isHovered && (
                <line
                  x1={point.x}
                  y1={padding.top}
                  x2={point.x}
                  y2={padding.top + innerHeight}
                  className="gba:stroke-gray-400"
                  strokeDasharray="4,4"
                />
              )}

              {/* Point circle */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isHovered ? 8 : 6}
                className={`gba:cursor-pointer gba:transition-all gba:duration-150 ${pointColorClass}`}
                strokeWidth="2"
                style={{ stroke: 'var(--color-white, #fff)' }}
                onMouseEnter={() => setHoveredPoint(point)}
              />

              {/* Change indicator - only show when hovered or if few points */}
              {point.change !== 0 && (isHovered || points.length <= 15) && (
                <text
                  x={point.x}
                  y={point.y - 16}
                  textAnchor="middle"
                  className={`gba:text-xs gba:font-medium ${textColorClass}`}
                >
                  {isDeduction ? '' : '+'}
                  {formatCurrency(point.change)}
                </text>
              )}
            </g>
          )
        })}

        {/* X-axis labels (only show some to avoid clutter) */}
        {points.map((point, i) => {
          // Only show labels for first, last, and every nth point
          const showLabel =
            i === 0 || i === points.length - 1 || points.length <= 15 || i % Math.ceil(points.length / 10) === 0
          if (!showLabel) return null
          return (
            <text
              key={i}
              x={point.x}
              y={chartHeight - padding.bottom + 20}
              textAnchor="middle"
              className="gba:text-xs gba:fill-gray-500"
            >
              #{point.step.stepOrder}
            </text>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="gba:absolute gba:z-50 gba:pointer-events-none gba:transform gba:-translate-x-1/2"
          style={{
            left: Math.max(150, Math.min(tooltipPosition.x, chartWidth - 150)),
            top: Math.max(0, tooltipPosition.y - 180)
          }}
        >
          <div className="gba:bg-white gba:rounded-lg gba:shadow-xl gba:border gba:border-gray-200 gba:p-3 gba:min-w-[280px]">
            {/* Header */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2 gba:pb-2 gba:border-b gba:border-gray-100">
              <div
                className="gba:w-3 gba:h-3 gba:rounded-full"
                style={{ backgroundColor: getCategoryColor(hoveredPoint.step.category) }}
              />
              <span className="gba:text-sm gba:font-semibold gba:text-gray-800">{hoveredPoint.step.stepName}</span>
            </div>

            {/* Step details */}
            <div className="gba:space-y-1.5 gba:text-xs">
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-gray-500">Category:</span>
                <span className="gba:font-medium gba:text-gray-700">{hoveredPoint.step.category}</span>
              </div>

              {hoveredPoint.change !== 0 && (
                <div className="gba:flex gba:justify-between">
                  <span className="gba:text-gray-500">Change:</span>
                  <span
                    className={`gba:font-semibold ${hoveredPoint.change < 0 ? 'gba:text-red-600' : 'gba:text-emerald-600'}`}
                  >
                    {hoveredPoint.change < 0 ? '' : '+'}
                    {formatCurrency(hoveredPoint.change)}
                  </span>
                </div>
              )}

              <div className="gba:flex gba:justify-between gba:pt-1 gba:border-t gba:border-gray-100">
                <span className="gba:text-gray-500">Running Total:</span>
                <span className="gba:font-bold gba:text-gray-900">{formatCurrency(hoveredPoint.amount)}</span>
              </div>

              {hoveredPoint.step.description && (
                <p className="gba:text-gray-500 gba:mt-2 gba:pt-2 gba:border-t gba:border-gray-100 gba:italic">
                  {hoveredPoint.step.description}
                </p>
              )}
            </div>

            {/* Change indicator icon */}
            <div className="gba:absolute gba:-bottom-2 gba:left-1/2 gba:-translate-x-1/2">
              <div className="gba:w-4 gba:h-4 gba:bg-white gba:border-r gba:border-b gba:border-gray-200 gba:transform gba:rotate-45" />
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mt-4 gba:pt-4 gba:border-t gba:border-gray-200">
        <div className="gba:text-center">
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:text-emerald-600 gba:mb-1">
            <TrendingUp className="gba:w-4 gba:h-4" />
            <span className="gba:text-xs gba:font-medium">Total Added</span>
          </div>
          <div className="gba:text-lg gba:font-bold gba:text-emerald-700">
            {formatCurrency(points.filter(p => p.change > 0).reduce((sum, p) => sum + p.change, 0))}
          </div>
        </div>
        <div className="gba:text-center">
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:text-red-600 gba:mb-1">
            <TrendingDown className="gba:w-4 gba:h-4" />
            <span className="gba:text-xs gba:font-medium">Total Deducted</span>
          </div>
          <div className="gba:text-lg gba:font-bold gba:text-red-700">
            {formatCurrency(Math.abs(points.filter(p => p.change < 0).reduce((sum, p) => sum + p.change, 0)))}
          </div>
        </div>
        <div className="gba:text-center">
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:text-gray-600 gba:mb-1">
            <Minus className="gba:w-4 gba:h-4" />
            <span className="gba:text-xs gba:font-medium">Final Amount</span>
          </div>
          <div className="gba:text-lg gba:font-bold gba:text-gray-900">
            {formatCurrency(points.length > 0 ? points[points.length - 1].amount : 0)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TraceChart
