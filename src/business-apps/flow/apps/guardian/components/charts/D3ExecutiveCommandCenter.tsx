import React, { useEffect, useRef, useCallback, useState } from 'react'
import * as d3 from 'd3'
import { GuardianFilter } from '../../types/guardianTypes'

interface ExecutiveMetrics {
  workflowCompletionRate: number
  taskCompletionRate: number
  slaAdherence: number
  overduePercentage: number
  totalWorkflows: number
  totalTasks: number
  avgCycleHours: number
  criticalIssues: number
}

interface D3ExecutiveCommandCenterProps {
  workflowData: any
  dimensions: { width: number; height: number }
  filters: GuardianFilter
  isRealTime: boolean
  onError: (error: string) => void
  prefixDataTestId: string
}

export const D3ExecutiveCommandCenter: React.FC<D3ExecutiveCommandCenterProps> = ({
  workflowData,
  dimensions,
  filters,
  isRealTime,
  onError,
  prefixDataTestId
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [currentMetrics, setCurrentMetrics] = useState<ExecutiveMetrics | null>(null)
  const [previousMetrics, setPreviousMetrics] = useState<ExecutiveMetrics | null>(null)

  // Extract metrics from workflow data
  const extractMetrics = useCallback((data: any): ExecutiveMetrics => {
    const analytics = data?.analytics || {}
    const flowManagement = analytics.flowManagement?.statusMetrics || {}
    const slaKillers = analytics.flowManagement?.slaKillers || []
    const longestCycles = analytics.flowManagement?.longestCycleFlows || []

    return {
      workflowCompletionRate: flowManagement.workflow_completion_rate || 0,
      taskCompletionRate: flowManagement.task_completion_rate || 0,
      slaAdherence: 100 - (flowManagement.overdue_percentage || 0),
      overduePercentage: flowManagement.overdue_percentage || 0,
      totalWorkflows: flowManagement.total_workflows || 0,
      totalTasks: flowManagement.total_tasks || 0,
      avgCycleHours: longestCycles[0]?.avg_cycle_hours || 0,
      criticalIssues: slaKillers.filter((killer: any) => killer.violation_rate > 20).length
    }
  }, [])

  // Animated counter component
  const animateCounter = useCallback(
    (
      element: d3.Selection<SVGTextElement, unknown, null, undefined>,
      fromValue: number,
      toValue: number,
      duration: number = 2000,
      formatter?: (value: number) => string
    ) => {
      element
        .transition()
        .duration(duration)
        .ease(d3.easeQuadOut)
        .tween('text', function () {
          const interpolate = d3.interpolate(fromValue, toValue)
          return function (t) {
            const value = interpolate(t)
            const formattedValue = formatter ? formatter(value) : Math.round(value).toString()
            d3.select(this).text(formattedValue)
          }
        })
    },
    []
  )

  // Create pulsing effect for critical metrics
  const createPulseEffect = useCallback(
    (element: d3.Selection<SVGElement, unknown, null, undefined>, color: string, intensity: number) => {
      if (!isRealTime) return

      element
        .style('filter', `drop-shadow(0 0 ${intensity * 10}px ${color})`)
        .transition()
        .duration(1500)
        .ease(d3.easeSinInOut)
        .style('filter', `drop-shadow(0 0 ${intensity * 20}px ${color})`)
        .transition()
        .duration(1500)
        .ease(d3.easeSinInOut)
        .style('filter', `drop-shadow(0 0 ${intensity * 10}px ${color})`)
        .on('end', function () {
          if (isRealTime) {
            createPulseEffect(d3.select(this), color, intensity)
          }
        })
    },
    [isRealTime]
  )

  // Render executive dashboard
  const renderCommandCenter = useCallback(() => {
    const svg = d3.select(svgRef.current)
    if (!svg.node() || !currentMetrics) return

    const { width, height } = dimensions
    svg.selectAll('*').remove()

    // Background with grid pattern
    const defs = svg.append('defs')
    const pattern = defs
      .append('pattern')
      .attr('id', 'grid-pattern')
      .attr('width', 50)
      .attr('height', 50)
      .attr('patternUnits', 'userSpaceOnUse')

    pattern
      .append('path')
      .attr('d', 'M 50 0 L 0 0 0 50')
      .attr('fill', 'none')
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.3)

    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#grid-pattern)')

    // Create gradient definitions for gauges
    const gradient = defs
      .append('radialGradient')
      .attr('id', 'gauge-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%')

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#60a5fa').attr('stop-opacity', 0.8)

    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#1e40af').attr('stop-opacity', 0.4)

    // Main container
    const container = svg.append('g').attr('transform', `translate(20, 20)`)

    // Title
    container
      .append('text')
      .attr('x', width / 2 - 20)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .text('🛡️ Executive Command Center')

    // Real-time indicator
    if (isRealTime) {
      const indicator = container.append('g').attr('transform', `translate(${width - 120}, 10)`)

      indicator.append('circle').attr('r', 6).attr('fill', '#10b981')

      indicator.append('text').attr('x', 12).attr('y', 5).attr('fill', '#10b981').attr('font-size', '12px').text('LIVE')

      createPulseEffect(indicator.select('circle'), '#10b981', 0.8)
    }

    // Key Performance Indicators Grid
    const kpiData = [
      {
        title: 'Workflow Success',
        value: currentMetrics.workflowCompletionRate,
        previous: previousMetrics?.workflowCompletionRate || 0,
        suffix: '%',
        color:
          currentMetrics.workflowCompletionRate > 85
            ? '#10b981'
            : currentMetrics.workflowCompletionRate > 70
              ? '#f59e0b'
              : '#ef4444',
        x: 50,
        y: 80
      },
      {
        title: 'Task Completion',
        value: currentMetrics.taskCompletionRate,
        previous: previousMetrics?.taskCompletionRate || 0,
        suffix: '%',
        color:
          currentMetrics.taskCompletionRate > 90
            ? '#10b981'
            : currentMetrics.taskCompletionRate > 75
              ? '#f59e0b'
              : '#ef4444',
        x: 250,
        y: 80
      },
      {
        title: 'SLA Adherence',
        value: currentMetrics.slaAdherence,
        previous: previousMetrics?.slaAdherence || 0,
        suffix: '%',
        color: currentMetrics.slaAdherence > 95 ? '#10b981' : currentMetrics.slaAdherence > 85 ? '#f59e0b' : '#ef4444',
        x: 450,
        y: 80
      },
      {
        title: 'Active Workflows',
        value: currentMetrics.totalWorkflows,
        previous: previousMetrics?.totalWorkflows || 0,
        suffix: '',
        color: '#60a5fa',
        x: 50,
        y: 200
      },
      {
        title: 'Total Tasks',
        value: currentMetrics.totalTasks,
        previous: previousMetrics?.totalTasks || 0,
        suffix: '',
        color: '#8b5cf6',
        x: 250,
        y: 200
      },
      {
        title: 'Critical Issues',
        value: currentMetrics.criticalIssues,
        previous: previousMetrics?.criticalIssues || 0,
        suffix: '',
        color:
          currentMetrics.criticalIssues > 5 ? '#ef4444' : currentMetrics.criticalIssues > 2 ? '#f59e0b' : '#10b981',
        x: 450,
        y: 200,
        pulse: currentMetrics.criticalIssues > 3
      }
    ]

    // Render KPI cards
    kpiData.forEach((kpi, index) => {
      const kpiGroup = container.append('g').attr('transform', `translate(${kpi.x}, ${kpi.y})`)

      // Card background
      const card = kpiGroup
        .append('rect')
        .attr('width', 160)
        .attr('height', 80)
        .attr('rx', 8)
        .attr('fill', 'rgba(31, 41, 55, 0.8)')
        .attr('stroke', kpi.color)
        .attr('stroke-width', 2)
        .attr('filter', `drop-shadow(0 4px 8px rgba(0,0,0,0.3))`)

      // Title
      kpiGroup
        .append('text')
        .attr('x', 80)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text(kpi.title)

      // Value with animation
      const valueText = kpiGroup
        .append('text')
        .attr('x', 80)
        .attr('y', 50)
        .attr('text-anchor', 'middle')
        .attr('fill', kpi.color)
        .attr('font-size', '24px')
        .attr('font-weight', 'bold')
        .text(`${Math.round(kpi.previous)}${kpi.suffix}`)

      // Animate counter
      animateCounter(valueText, kpi.previous, kpi.value, 2000, value => `${Math.round(value)}${kpi.suffix}`)

      // Trend indicator
      const trend = kpi.value - kpi.previous
      if (Math.abs(trend) > 0.1) {
        const trendGroup = kpiGroup.append('g').attr('transform', `translate(120, 60)`)

        trendGroup
          .append('text')
          .attr('fill', trend > 0 ? '#10b981' : '#ef4444')
          .attr('font-size', '10px')
          .text(trend > 0 ? '↑' : '↓')

        trendGroup
          .append('text')
          .attr('x', 8)
          .attr('y', 0)
          .attr('fill', trend > 0 ? '#10b981' : '#ef4444')
          .attr('font-size', '10px')
          .text(`${Math.abs(trend).toFixed(1)}`)
      }

      // Pulse effect for critical metrics
      if (kpi.pulse) {
        createPulseEffect(kpiGroup.select('rect'), kpi.color, 1.2)
      }
    })

    // System Health Gauge
    const gaugeCenter = { x: width - 200, y: height - 150 }
    const gaugeRadius = 60

    const gaugeGroup = container.append('g').attr('transform', `translate(${gaugeCenter.x}, ${gaugeCenter.y})`)

    // Gauge background arc
    const arc = d3
      .arc()
      .innerRadius(gaugeRadius - 15)
      .outerRadius(gaugeRadius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(Math.PI * 0.75)

    gaugeGroup
      .append('path')
      .datum({ startAngle: -Math.PI * 0.75, endAngle: Math.PI * 0.75 })
      .attr('d', arc as any)
      .attr('fill', 'rgba(55, 65, 81, 0.3)')

    // Health score calculation
    const healthScore = (currentMetrics.workflowCompletionRate + currentMetrics.slaAdherence) / 2
    const healthAngle = -Math.PI * 0.75 + Math.PI * 1.5 * (healthScore / 100)

    // Gauge fill arc
    const healthArc = d3
      .arc()
      .innerRadius(gaugeRadius - 15)
      .outerRadius(gaugeRadius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(healthAngle)

    gaugeGroup
      .append('path')
      .datum({ startAngle: -Math.PI * 0.75, endAngle: healthAngle })
      .attr('d', healthArc as any)
      .attr('fill', 'url(#gauge-gradient)')

    // Gauge center text
    gaugeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -10)
      .attr('fill', '#e5e7eb')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text(`${Math.round(healthScore)}%`)

    gaugeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 8)
      .attr('fill', '#9ca3af')
      .attr('font-size', '12px')
      .text('System Health')

    // Alert indicators for critical issues
    if (currentMetrics.criticalIssues > 0) {
      const alertGroup = container.append('g').attr('transform', `translate(${width - 100}, ${height - 60})`)

      alertGroup
        .append('rect')
        .attr('width', 80)
        .attr('height', 30)
        .attr('rx', 4)
        .attr('fill', '#ef4444')
        .attr('opacity', 0.9)

      alertGroup
        .append('text')
        .attr('x', 40)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(`⚠️ ${currentMetrics.criticalIssues} Issues`)

      createPulseEffect(alertGroup.select('rect'), '#ef4444', 1.5)
    }
  }, [currentMetrics, previousMetrics, dimensions, isRealTime, animateCounter, createPulseEffect])

  // Update metrics when data changes
  useEffect(() => {
    if (!workflowData) return

    try {
      const newMetrics = extractMetrics(workflowData)
      setPreviousMetrics(currentMetrics)
      setCurrentMetrics(newMetrics)
    } catch (error) {
      console.error('Error extracting metrics:', error)
      onError('Failed to extract metrics from workflow data')
    }
  }, [workflowData, extractMetrics, currentMetrics, onError])

  // Render when metrics change
  useEffect(() => {
    if (currentMetrics) {
      renderCommandCenter()
    }
  }, [currentMetrics, renderCommandCenter])

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 100%)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
      data-testid={`${prefixDataTestId}-executive-command-center`}
    >
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} style={{ display: 'block' }} />
    </div>
  )
}
