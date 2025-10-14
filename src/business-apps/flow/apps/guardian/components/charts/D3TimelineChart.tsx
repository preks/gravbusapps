import React, { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { GuardianFilter } from '../../types/guardianTypes'

interface TimelineEvent {
  id: string
  timestamp: string
  userId: string
  userName?: string
  department?: string
  flowId: string
  flowName: string
  taskId: string
  taskName: string
  action: string
  status: string
  details?: any
}

interface D3TimelineChartProps {
  auditData: {
    entries: TimelineEvent[]
    total: number
    summary: any
  } | null
  dimensions: { width: number; height: number }
  filters: GuardianFilter
  isRealTime: boolean
  onError: (error: string) => void
  prefixDataTestId: string
}

export const D3TimelineChart: React.FC<D3TimelineChartProps> = ({
  auditData,
  dimensions,
  filters,
  isRealTime,
  onError,
  prefixDataTestId
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const mountedRef = useRef(true)

  const renderTimeline = useCallback(() => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    const { width, height } = dimensions
    const margin = { top: 40, right: 80, bottom: 60, left: 120 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Clear previous render
    svg.selectAll('*').remove()

    // Generate mock audit data based on selected time range
    const generateMockAuditEvents = (timeRange: string) => {
      const now = new Date()
      let timeSpanMs: number
      let eventCount: number

      switch (timeRange) {
        case '1h':
          timeSpanMs = 60 * 60 * 1000
          eventCount = 8
          break
        case '6h':
          timeSpanMs = 6 * 60 * 60 * 1000
          eventCount = 15
          break
        case '24h':
          timeSpanMs = 24 * 60 * 60 * 1000
          eventCount = 25
          break
        case '7d':
          timeSpanMs = 7 * 24 * 60 * 60 * 1000
          eventCount = 40
          break
        case '30d':
          timeSpanMs = 30 * 24 * 60 * 60 * 1000
          eventCount = 80
          break
        default:
          timeSpanMs = 7 * 24 * 60 * 60 * 1000
          eventCount = 40
      }

      // Department-specific users and workflows
      const departmentData = {
        'Human Resources': {
          users: ['Sarah Wilson', 'Mike Johnson', 'Lisa Chen'],
          workflows: ['Employee Onboarding', 'Performance Review', 'Leave Request']
        },
        'IT Department': {
          users: ['David Brown', 'Alex Kumar', 'Emma Davis'],
          workflows: ['System Deployment', 'Security Audit', 'Software Installation']
        },
        Engineering: {
          users: ['John Smith', 'Maria Garcia', 'Chris Lee'],
          workflows: ['Code Review', 'Feature Development', 'Bug Fix']
        },
        Finance: {
          users: ['Jane Doe', 'Robert Taylor', 'Amy Zhang'],
          workflows: ['Budget Approval', 'Expense Review', 'Invoice Processing']
        }
      }

      const departments = Object.keys(departmentData)
      const actions = [
        'Task Started',
        'Task Completed',
        'Approval Requested',
        'Document Reviewed',
        'Status Updated',
        'Task Failed',
        'SLA Breach'
      ]
      const statuses = ['COMPLETED', 'IN_PROGRESS', 'FAILED', 'OVERDUE', 'REJECTED']

      return Array.from({ length: eventCount }, (_, i) => {
        const timeOffset = Math.random() * timeSpanMs
        const eventTime = new Date(now.getTime() - timeOffset)

        // Introduce some SLA breaches and failures
        const isFailure = Math.random() < 0.1 // 10% failures
        const isSlaBreach = Math.random() < 0.15 // 15% SLA breaches

        let action = actions[Math.floor(Math.random() * actions.length)]
        let status = statuses[Math.floor(Math.random() * statuses.length)]

        if (isFailure) {
          action = 'TASK_FAILED'
          status = 'FAILED'
        } else if (isSlaBreach) {
          action = 'APPROVAL_OVERDUE'
          status = 'OVERDUE'
        }

        // Pick a random department and corresponding user
        const department = departments[Math.floor(Math.random() * departments.length)]
        const departmentInfo = departmentData[department]
        const userName = departmentInfo.users[Math.floor(Math.random() * departmentInfo.users.length)]
        const flowName = departmentInfo.workflows[Math.floor(Math.random() * departmentInfo.workflows.length)]

        return {
          id: `audit-${i + 1}`,
          timestamp: eventTime.toISOString(),
          userId: `${department.toLowerCase().replace(/\s+/g, '-')}-${Math.floor(Math.random() * 10)}`,
          userName,
          department,
          flowId: `wf-${Math.floor(Math.random() * 5) + 1}`,
          flowName,
          taskId: `task-${i + 1}`,
          taskName: `${action} - ${flowName}`,
          action,
          status
        }
      })
    }

    const mockAuditEvents = generateMockAuditEvents(filters.timeRange)

    // Always use mock data for now to ensure proper department display
    const events = mockAuditEvents

    if (!events.length) {
      // Show empty state
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#6b7280')
        .style('font-size', '16px')
        .text('No audit data available')
      return
    }

    // Parse timestamps and sort chronologically
    const parsedEvents = events
      .map(e => ({
        ...e,
        date: new Date(e.timestamp)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(parsedEvents, d => d.date) as [Date, Date])
      .range([0, innerWidth])

    // Group events by department for y-positioning
    const departments = Array.from(new Set(parsedEvents.map(e => e.department || 'Unknown')))
    const yScale = d3.scaleBand().domain(departments).range([0, innerHeight]).padding(0.1)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Add time axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%H:%M')).ticks(6))
      .selectAll('text')
      .style('fill', '#e5e7eb')
      .style('font-size', '11px')

    // Add department axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('fill', '#e5e7eb')
      .style('font-size', '11px')

    // Color events by department and SLA/failure status
    const getEventColor = (event: any): string => {
      // Check for SLA breach or failure indicators
      const status = event.status?.toUpperCase()
      const action = event.action?.toUpperCase()

      // Red for failures and rejections
      if (status === 'FAILED' || status === 'REJECTED' || action?.includes('FAILED') || action?.includes('REJECTED')) {
        return '#ef4444' // Red
      }

      // Yellow for SLA breaches (overdue tasks)
      if (status === 'OVERDUE' || action?.includes('OVERDUE') || (event.details && event.details.slaViolation)) {
        return '#f59e0b' // Yellow/Amber
      }

      // Department-based colors for normal events
      const dept = event.department?.toLowerCase() || 'unknown'
      switch (dept) {
        case 'human resources':
        case 'hr':
          return '#10b981' // Green
        case 'it department':
        case 'it':
          return '#60a5fa' // Blue
        case 'engineering':
          return '#8b5cf6' // Purple
        case 'finance':
          return '#06b6d4' // Cyan
        default:
          return '#e5e7eb' // White/Light gray for normal events
      }
    }

    // Draw timeline lanes for departments
    departments.forEach(dept => {
      const y = yScale(dept) || 0
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', y + yScale.bandwidth() / 2)
        .attr('y2', y + yScale.bandwidth() / 2)
        .style('stroke', '#374151')
        .style('stroke-width', 1)
        .style('opacity', 0.3)
    })

    // Draw events
    const eventGroups = g
      .selectAll('.event')
      .data(parsedEvents)
      .enter()
      .append('g')
      .attr('class', 'event')
      .attr('transform', d => {
        const x = xScale(d.date)
        const y = (yScale(d.department || 'Unknown') || 0) + yScale.bandwidth() / 2
        return `translate(${x},${y})`
      })

    // Event circles with SLA/failure color coding
    eventGroups
      .append('circle')
      .attr('r', d => {
        const status = d.status?.toUpperCase()
        // Larger circles for failures and SLA breaches
        return status === 'FAILED' || status === 'REJECTED' || status === 'OVERDUE' ? 6 : 4
      })
      .style('fill', d => getEventColor(d))
      .style('stroke', '#1f2937')
      .style('stroke-width', 1)
      .style('opacity', 0.8)

    // Event lines connecting to timeline
    eventGroups
      .append('line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', -8)
      .attr('y2', 8)
      .style('stroke', d => getEventColor(d))
      .style('stroke-width', 2)
      .style('opacity', 0.6)

    // Add tooltips on hover
    eventGroups
      .on('mouseenter', function (event, d) {
        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'timeline-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.9)')
          .style('color', '#e5e7eb')
          .style('padding', '8px 12px')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .style('opacity', 0)

        tooltip.transition().duration(200).style('opacity', 1)

        tooltip.html(`
          <div><strong>${d.taskName || d.flowName}</strong></div>
          <div>Department: ${d.department}</div>
          <div>Action: ${d.action}</div>
          <div>Status: ${d.status}</div>
          <div>User: ${d.userName || d.userId}</div>
          <div>Time: ${d3.timeFormat('%H:%M:%S')(d.date)}</div>
        `)

        tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 10 + 'px')
      })
      .on('mouseleave', function () {
        d3.selectAll('.timeline-tooltip').remove()
      })

    // Style axes
    g.selectAll('.x-axis path, .x-axis line').style('stroke', '#374151')

    g.selectAll('.y-axis path, .y-axis line').style('stroke', '#374151')
  }, [auditData, dimensions, filters])

  useEffect(() => {
    if (!mountedRef.current) return

    try {
      renderTimeline()
    } catch (error) {
      console.error('Error rendering timeline:', error)
      onError(error instanceof Error ? error.message : 'Failed to render timeline')
    }
  }, [renderTimeline, onError])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      d3.selectAll('.timeline-tooltip').remove()
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          background: 'rgba(15, 23, 42, 0.3)'
        }}
        data-testid={`${prefixDataTestId}-timeline-svg`}
      />
    </div>
  )
}
