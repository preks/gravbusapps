import React, { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { GuardianFilter } from '../../types/guardianTypes'

interface SLAViolation {
  flowName: string
  stepName: string
  violationRate: number
  avgOverdueHours: number
  totalTasks: number
  department: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

interface D3SLAHeatMapProps {
  workflowData: any
  dimensions: { width: number; height: number }
  filters: GuardianFilter
  isRealTime: boolean
  onError: (error: string) => void
  prefixDataTestId: string
}

export const D3SLAHeatMap: React.FC<D3SLAHeatMapProps> = ({
  workflowData,
  dimensions,
  filters,
  isRealTime,
  onError,
  prefixDataTestId
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Extract SLA violations from workflow data
  const extractSLAViolations = useCallback((data: any): SLAViolation[] => {
    const analytics = data?.analytics || {}
    const slaKillers = analytics.flowManagement?.slaKillers || []
    const longestCycles = analytics.flowManagement?.longestCycleFlows || []

    // Combine SLA killers with cycle time data
    const violations: SLAViolation[] = []

    // Process SLA killers
    slaKillers.forEach((killer: any, index: number) => {
      const severity =
        killer.violation_rate > 50
          ? 'critical'
          : killer.violation_rate > 30
            ? 'high'
            : killer.violation_rate > 15
              ? 'medium'
              : 'low'

      violations.push({
        flowName: killer.flow_name || 'Unknown Flow',
        stepName: killer.step_name || 'Unknown Step',
        violationRate: killer.violation_rate || 0,
        avgOverdueHours: killer.avg_overdue_hours || 0,
        totalTasks: killer.total_tasks || 0,
        // Do not invent departments; use real fields when present.
        department: killer.department || killer.orgUnit || '—',
        severity
      })
    })

    return violations.slice(0, 12) // Limit for visualization
  }, [])

  // Create pulsing animation for critical violations
  const createPulseAnimation = useCallback(
    (element: d3.Selection<SVGElement, unknown, null, undefined>, severity: string) => {
      if (!isRealTime || severity !== 'critical') return

      element
        .transition()
        .duration(1000)
        .ease(d3.easeSinInOut)
        .style('opacity', 0.6)
        .transition()
        .duration(1000)
        .ease(d3.easeSinInOut)
        .style('opacity', 1)
        .on('end', function () {
          if (isRealTime) {
            createPulseAnimation(d3.select(this), severity)
          }
        })
    },
    [isRealTime]
  )

  // Render the SLA heat map
  const renderHeatMap = useCallback(() => {
    const svg = d3.select(svgRef.current)
    if (!svg.node() || !workflowData) return

    const { width, height } = dimensions
    svg.selectAll('*').remove()

    const violations = extractSLAViolations(workflowData)
    if (violations.length === 0) return

    // Margins and dimensions
    const margin = { top: 60, right: 120, bottom: 80, left: 150 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.bottom - margin.top

    // Create container
    const container = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Background gradient
    const defs = svg.append('defs')
    const bgGradient = defs
      .append('linearGradient')
      .attr('id', 'background-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%')

    bgGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0c0c0c')

    bgGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1a1a1a')

    svg
      .insert('rect', ':first-child')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#background-gradient)')

    // Title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '20px')
      .attr('font-weight', 'bold')
      .text('🚨 SLA Violation Heat Map')

    // Get unique flows and steps
    const flows = Array.from(new Set(violations.map(v => v.flowName)))
    const steps = Array.from(new Set(violations.map(v => v.stepName)))

    // Create scales
    const xScale = d3.scaleBand().domain(flows).range([0, innerWidth]).padding(0.1)

    const yScale = d3.scaleBand().domain(steps).range([0, innerHeight]).padding(0.1)

    // Color scale for violation rates
    const colorScale = d3.scaleSequential().domain([0, 100]).interpolator(d3.interpolateRgb('#10b981', '#ef4444'))

    // Size scale for total tasks
    const sizeScale = d3
      .scaleSqrt()
      .domain([0, d3.max(violations, d => d.totalTasks) || 100])
      .range([5, Math.min(xScale.bandwidth(), yScale.bandwidth()) / 2])

    // Create tooltip
    const tooltip = d3
      .select(containerRef.current)
      .append('div')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', '#e5e7eb')
      .style('padding', '12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000)

    // Draw heat map cells
    const cells = container
      .selectAll('.heatmap-cell')
      .data(violations)
      .enter()
      .append('g')
      .attr('class', 'heatmap-cell')
      .attr('transform', d => `translate(${xScale(d.flowName)}, ${yScale(d.stepName)})`)

    // Cell backgrounds
    cells
      .append('rect')
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.violationRate))
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8)

    // Violation rate circles
    const circles = cells
      .append('circle')
      .attr('cx', xScale.bandwidth() / 2)
      .attr('cy', yScale.bandwidth() / 2)
      .attr('r', d => sizeScale(d.totalTasks))
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', d => {
        switch (d.severity) {
          case 'critical':
            return '#dc2626'
          case 'high':
            return '#f59e0b'
          case 'medium':
            return '#eab308'
          case 'low':
            return '#10b981'
          default:
            return '#6b7280'
        }
      })
      .attr('stroke-width', 3)

    // Add pulse animation to critical violations
    circles.each(function (d) {
      createPulseAnimation(d3.select(this), d.severity)
    })

    // Violation rate text
    cells
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', yScale.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#1f2937')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(d => `${Math.round(d.violationRate)}%`)

    // Severity indicators
    cells
      .append('rect')
      .attr('x', xScale.bandwidth() - 15)
      .attr('y', 5)
      .attr('width', 10)
      .attr('height', 10)
      .attr('fill', d => {
        switch (d.severity) {
          case 'critical':
            return '#dc2626'
          case 'high':
            return '#f59e0b'
          case 'medium':
            return '#eab308'
          case 'low':
            return '#10b981'
          default:
            return '#6b7280'
        }
      })
      .attr('rx', 2)

    // Add interactivity
    cells
      .on('mouseover', function (event, d) {
        d3.select(this).select('rect').transition().duration(200).attr('opacity', 1).attr('stroke-width', 2)

        tooltip
          .style('opacity', 1)
          .html(
            `
            <div><strong>${d.flowName}</strong></div>
            <div><strong>Step:</strong> ${d.stepName}</div>
            <div><strong>Department:</strong> ${d.department}</div>
            <div><strong>Violation Rate:</strong> ${d.violationRate}%</div>
            <div><strong>Avg Overdue:</strong> ${d.avgOverdueHours}h</div>
            <div><strong>Total Tasks:</strong> ${d.totalTasks}</div>
            <div><strong>Severity:</strong> <span style="color: ${
              d.severity === 'critical'
                ? '#dc2626'
                : d.severity === 'high'
                  ? '#f59e0b'
                  : d.severity === 'medium'
                    ? '#eab308'
                    : '#10b981'
            }">${d.severity.toUpperCase()}</span></div>
          `
          )
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 10 + 'px')
      })
      .on('mousemove', function (event) {
        tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 10 + 'px')
      })
      .on('mouseout', function () {
        d3.select(this).select('rect').transition().duration(200).attr('opacity', 0.8).attr('stroke-width', 1)

        tooltip.style('opacity', 0)
      })

    // X-axis (Flows)
    const xAxis = container
      .append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', '#e5e7eb')
      .style('font-size', '11px')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')

    // Y-axis (Steps)
    container.append('g').call(d3.axisLeft(yScale)).selectAll('text').attr('fill', '#e5e7eb').style('font-size', '11px')

    // Axis labels
    container
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 60)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '12px')
      .text('Workflow Flows')

    container
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '12px')
      .text('Process Steps')

    // Legend
    const legend = container.append('g').attr('transform', `translate(${innerWidth + 20}, 20)`)

    // Color legend
    const legendHeight = 100
    const legendWidth = 20

    const legendScale = d3.scaleLinear().domain([0, 100]).range([legendHeight, 0])

    const legendAxis = d3
      .axisRight(legendScale)
      .ticks(5)
      .tickFormat(d => `${d}%`)

    // Create gradient for legend
    const legendGradient = defs
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%')

    for (let i = 0; i <= 10; i++) {
      legendGradient
        .append('stop')
        .attr('offset', `${i * 10}%`)
        .attr('stop-color', colorScale(i * 10))
    }

    legend
      .append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#legend-gradient)')
      .attr('stroke', '#4b5563')

    legend
      .append('g')
      .attr('transform', `translate(${legendWidth}, 0)`)
      .call(legendAxis)
      .selectAll('text')
      .attr('fill', '#e5e7eb')
      .style('font-size', '10px')

    legend
      .append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '12px')
      .text('Violation %')

    // Severity legend
    const severityLegend = container.append('g').attr('transform', `translate(${innerWidth + 20}, 150)`)

    const severityData = [
      { severity: 'critical', color: '#dc2626', label: 'Critical (>50%)' },
      { severity: 'high', color: '#f59e0b', label: 'High (30-50%)' },
      { severity: 'medium', color: '#eab308', label: 'Medium (15-30%)' },
      { severity: 'low', color: '#10b981', label: 'Low (<15%)' }
    ]

    severityData.forEach((item, i) => {
      const legendItem = severityLegend.append('g').attr('transform', `translate(0, ${i * 20})`)

      legendItem.append('rect').attr('width', 12).attr('height', 12).attr('fill', item.color).attr('rx', 2)

      legendItem
        .append('text')
        .attr('x', 18)
        .attr('y', 9)
        .attr('fill', '#e5e7eb')
        .attr('font-size', '11px')
        .text(item.label)
    })

    severityLegend
      .append('text')
      .attr('x', 0)
      .attr('y', -10)
      .attr('fill', '#e5e7eb')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('Severity Levels')
  }, [workflowData, dimensions, extractSLAViolations, createPulseAnimation])

  // Render when data changes
  useEffect(() => {
    renderHeatMap()

    // Cleanup tooltip on unmount
    return () => {
      d3.select(containerRef.current).selectAll('div').remove()
    }
  }, [renderHeatMap])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 100%)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
      data-testid={`${prefixDataTestId}-sla-heatmap`}
    >
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} style={{ display: 'block' }} />
    </div>
  )
}
