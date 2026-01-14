import React, { useEffect, useRef, useCallback, useState } from 'react'
import * as d3 from 'd3'
import { GuardianFilter, GuardianNetworkData } from '../../types/guardianTypes'

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
    window?: { startDate: string; endDate: string }
  } | null
  networkData?: GuardianNetworkData | null
  dimensions: { width: number; height: number }
  filters: GuardianFilter
  onError: (error: string) => void
  prefixDataTestId: string
}

export const D3TimelineChart: React.FC<D3TimelineChartProps> = ({
  auditData,
  networkData,
  dimensions,
  filters,
  onError,
  prefixDataTestId
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const mountedRef = useRef(true)

  const renderTimeline = useCallback(() => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    // Measure the actual rendered SVG size. This avoids relying on upstream container measurements
    // that can be wrong on first paint in the platform (causing a centered ~800px chart).
    const rect = (svgRef.current as any)?.getBoundingClientRect?.()
    const measuredWidth = rect ? Math.round(rect.width) : 0
    const measuredHeight = rect ? Math.round(rect.height) : 0

    const width = measuredWidth || svgSize.width || dimensions.width
    const height = measuredHeight || svgSize.height || dimensions.height
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 50 || height < 50) return

    // Ensure the internal coordinate system matches the actual pixel size.
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    // Clear previous render
    svg.selectAll('*').remove()

    const upper = (v: any) => String(v || '').toUpperCase()
    const resolveAction = (e: any) => e.action || e.eventType || e.type || e.event || e.name || 'UNKNOWN'
    const resolveStatus = (e: any) =>
      e.status ||
      e.taskStatus ||
      e.details?.status ||
      e.details?.newStatus ||
      e.details?.toStatus ||
      e.details?.workflowStatus ||
      e.workflowStatus ||
      e.details?.task_conductor_status ||
      'UNKNOWN'

    const normalizeTense = (token: string): string => {
      const t = upper(token).trim()
      if (!t) return 'UNKNOWN'
      if (t === 'UPDATE' || t === 'UPDATED') return 'UPDATED'
      if (t === 'COMMENT' || t === 'COMMENTED') return 'COMMENTED'
      if (t === 'COMPLETE' || t === 'COMPLETED') return 'COMPLETED'
      if (t === 'START' || t === 'STARTED' || t === 'CREATED' || t === 'CREATE') return 'STARTED'
      if (t === 'ASSIGN' || t === 'ASSIGNED') return 'ASSIGNED'
      if (t === 'CLAIM' || t === 'CLAIMED') return 'CLAIMED'
      if (t === 'REJECT' || t === 'REJECTED') return 'REJECTED'
      if (t === 'FAIL' || t === 'FAILED') return 'FAILED'
      if (t === 'CANCEL' || t === 'CANCELED' || t === 'CANCELLED') return 'CANCELED'
      return t
    }

    const normalizeActionLabel = (rawAction: string): string => {
      const raw = upper(rawAction)
      if (!raw) return 'TASK UNKNOWN'

      // Split on underscores and whitespace, keep alphanumerics.
      const words = raw
        .replace(/[^A-Z0-9_ ]+/g, ' ')
        .replace(/_+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)

      const hasFlowWord = words.includes('FLOW') || words.includes('WORKFLOW')
      const hasTaskWord = words.includes('TASK')

      // Pick a primary verb-like token for consistent tense.
      const verbCandidates = [
        'COMMENT',
        'COMMENTED',
        'UPDATE',
        'UPDATED',
        'COMPLETE',
        'COMPLETED',
        'START',
        'STARTED',
        'CREATE',
        'CREATED',
        'ASSIGN',
        'ASSIGNED',
        'CLAIM',
        'CLAIMED',
        'REJECT',
        'REJECTED',
        'FAIL',
        'FAILED',
        'CANCEL',
        'CANCELED',
        'CANCELLED'
      ]

      const found = verbCandidates.find(v => words.includes(v))
      const verb = normalizeTense(found || words[0] || 'UNKNOWN')

      if (hasFlowWord) return `FLOW ${verb}`
      if (hasTaskWord) return `TASK ${verb}`
      return `TASK ${verb}`
    }

    // Use real audit events; do not generate mock/random data.
    const events: TimelineEvent[] = (auditData?.entries || []).map((e: any, idx: number) => ({
      id: e.id || `audit-${idx}`,
      timestamp: e.timestamp || e.createdAt || e.time || new Date().toISOString(),
      userId: e.userId || e.actorUserId || 'unknown',
      userName: e.userName,
      department:
        e.department ||
        e.details?.department ||
        e.details?.organizationalUnit ||
        e.details?.orgUnit ||
        e.workflowMeta?.department ||
        'Unknown',
      flowId: e.flowId || e.rootWorkflowId || e.workflowId || 'unknown',
      flowName: e.flowName || e.rootWorkflowName || e.workflowName || 'Unknown Flow',
      taskId: e.taskId || e.task?.id || 'unknown',
      taskName: e.taskName || e.task?.name || e.details?.taskName || 'Unknown Task',
      action: normalizeActionLabel(resolveAction(e)),
      status: resolveStatus(e),
      details: e.details
    }))

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

    const isValid = (d: any) => d.date instanceof Date && !isNaN(d.date.getTime())
    const cleaned = parsedEvents.filter(isValid)
    if (!cleaned.length) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#6b7280')
        .style('font-size', '16px')
        .text('No valid timestamps in audit data')
      return
    }

    // Synthesize "Flow started" / "Flow completed" events when possible, so lifecycle is visible.
    const isFlowStartAction = (a: string) => /(^|_)(FLOW|WORKFLOW).*(START|CREAT)/.test(upper(a))
    const isFlowCompleteAction = (a: string) => /(^|_)(FLOW|WORKFLOW).*(COMPLETE|FINISH|DONE)/.test(upper(a))
    const isCompletionSignal = (e: any) =>
      upper(e.status) === 'COMPLETED' ||
      upper(e.status) === 'DONE' ||
      isFlowCompleteAction(e.action) ||
      /COMPLETE/.test(upper(e.action)) ||
      upper(e.details?.workflowStatus) === 'COMPLETED' ||
      upper(e.workflowStatus) === 'COMPLETED'

    const byFlow = d3.group(cleaned, d => String(d.flowId || 'unknown'))
    const synthetic: any[] = []

    for (const [flowId, evts] of byFlow.entries()) {
      if (!evts.length) continue
      const first = evts[0]

      const alreadyHasStart = evts.some(e => isFlowStartAction(e.action))
      if (!alreadyHasStart) {
        synthetic.push({
          ...first,
          id: `flow-start-${flowId}`,
          action: 'FLOW STARTED',
          status: 'STARTED',
          taskId: '—',
          taskName: 'Flow started'
        })
      }

      // Only add a completion marker when we see a completion-like signal in the window.
      const completionCandidate = [...evts].reverse().find(e => isCompletionSignal(e))
      const alreadyHasFlowComplete = evts.some(e => isFlowCompleteAction(e.action))
      if (completionCandidate && !alreadyHasFlowComplete) {
        synthetic.push({
          ...completionCandidate,
          id: `flow-complete-${flowId}`,
          action: 'FLOW COMPLETED',
          status: 'COMPLETED',
          taskId: '—',
          taskName: 'Flow completed'
        })
      }
    }

    const allEvents = [...cleaned, ...synthetic]
      .map(e => ({ ...e, date: e.date instanceof Date ? e.date : new Date(e.timestamp) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    // Choose a lane strategy:
    // - If there are few flows, group by flow (best mental model)
    // - Otherwise, group by action (keeps lanes readable while still showing ALL events)
    const flowCount = new Set(allEvents.map(e => String(e.flowId || 'unknown'))).size
    const laneMode: 'flow' | 'action' = flowCount <= 12 ? 'flow' : 'action'

    // Reduce unused space on the left by using smaller margins + truncated labels
    const margin = {
      top: 20,
      right: 20,
      bottom: 35,
      left: 140
    }
    const innerWidth = Math.max(0, width - margin.left - margin.right)
    const innerHeight = Math.max(0, height - margin.top - margin.bottom)

    // Create scales
    const fallbackExtent = d3.extent(allEvents, d => d.date) as [Date, Date]

    // Strategy: zoom IN on actual event extent, not the full filter window
    // This spreads events across the chart width instead of bunching them
    const eventExtentStart = fallbackExtent[0] || new Date(Date.now() - 60 * 60 * 1000)
    const eventExtentEnd = fallbackExtent[1] || new Date()
    const eventSpanMs = Math.max(1, eventExtentEnd.getTime() - eventExtentStart.getTime())

    // Add 10% padding on each side of the event extent for the "90% zoom"
    // This ensures events fill 90% of the chart width with 5% margin on each side
    const paddingMs = Math.max(60_000, Math.round(eventSpanMs * 0.111)) // 10% padding = 90% content

    const xScale = d3
      .scaleTime()
      .domain([new Date(eventExtentStart.getTime() - paddingMs), new Date(eventExtentEnd.getTime() + paddingMs)])
      .range([0, innerWidth])

    // "Logical structure":
    // - If there are few flows, group by flow (best mental model)
    // - Otherwise, group by action (keeps lanes readable while still showing ALL events)
    const actionKey = (a: string) => (a || 'UNKNOWN').toUpperCase()
    const laneKeyFor = (e: any) => (laneMode === 'flow' ? String(e.flowId || 'unknown') : actionKey(e.action))
    const laneLabelFor = (e: any) => {
      if (laneMode === 'action') return actionKey(e.action)
      const id = String(e.flowId || 'unknown')
      const name = String(e.flowName || 'Flow')
      return `${name} • ${id.slice(-8)}`
    }

    const truncate = (s: string, max = 18) => (s.length > max ? s.slice(0, max - 1) + '…' : s)

    const laneStats = new Map<string, { label: string; count: number; lastTs: number }>()
    for (const e of allEvents) {
      const k = laneKeyFor(e)
      const cur = laneStats.get(k) || { label: laneLabelFor(e), count: 0, lastTs: 0 }
      cur.count += 1
      cur.lastTs = Math.max(cur.lastTs, e.date.getTime())
      if (!cur.label || cur.label.startsWith('Flow •')) cur.label = laneLabelFor(e)
      laneStats.set(k, cur)
    }

    // Stable, logical lane order. Requirement:
    // - Comment after Updated and before Complete
    // - Flow lifecycle uses "FLOW STARTED/COMPLETED" (no underscores)
    // - Task events use "TASK <PAST_TENSE>" consistently
    // - FLOW COMPLETED should always be last
    const actionOrder: Record<string, number> = {
      'FLOW STARTED': 10,
      'TASK ASSIGNED': 20,
      'TASK CLAIMED': 30,
      'TASK UPDATED': 40,
      'TASK COMMENTED': 45,
      'TASK COMPLETED': 50,
      'TASK TIMED_OUT': 70,
      'TASK OVERDUE': 80,
      'TASK FAILED': 90,
      'TASK REJECTED': 95,
      'TASK CANCELED': 98,
      'FLOW COMPLETED': 1_000_000
    }

    const lanes = Array.from(laneStats.entries())
      .sort((a, b) => {
        // For action lanes: keep a stable logical lifecycle order
        const ak = String(a[0] || '')
        const bk = String(b[0] || '')
        const ar = actionOrder[ak] ?? 10_000
        const br = actionOrder[bk] ?? 10_000
        if (ar !== br) return ar - br

        // Then by recency, then by label for stability
        const last = b[1].lastTs - a[1].lastTs
        if (last !== 0) return last
        return (a[1].label || ak).localeCompare(b[1].label || bk)
      })
      .map(([k]) => k)

    // Always fit into the card: compress lanes to the available height (no vertical scroll).
    const yScale = d3.scaleBand().domain(lanes).range([0, innerHeight]).padding(0.18)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Add lane axis (y-axis with event/action labels)
    const yAxisG = g
      .append('g')
      .attr('class', 'y-axis')
      .call(
        d3.axisLeft(yScale).tickFormat((k: any) => {
          const meta = laneStats.get(String(k))
          const label = meta ? meta.label : String(k)
          return truncate(String(label))
        })
      )

    yAxisG
      .selectAll('text')
      .style('fill', '#e5e7eb')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .attr('dx', '-8')
      .attr('dy', '0.32em')

    yAxisG.selectAll('path, line').style('stroke', '#374151').style('opacity', 0.5)

    // Color events by status/action (more consistent than department)
    const getEventColor = (event: any): string => {
      const status = upper(event.status)
      const action = upper(event.action)

      // Red for failures and rejections
      if (status === 'FAILED' || status === 'REJECTED' || action?.includes('FAILED') || action?.includes('REJECTED')) {
        return '#ef4444' // Red
      }

      // Amber for SLA-risky/overdue-like situations
      if (status === 'OVERDUE' || action?.includes('OVERDUE') || (event.details && event.details.slaViolation)) {
        return '#f59e0b' // Yellow/Amber
      }

      if (action === 'FLOW COMPLETED') return '#10b981'
      if (action === 'FLOW STARTED') return '#60a5fa'
      if (status === 'COMPLETED' || action.includes('COMPLETED')) return '#10b981'
      if (status === 'IN_PROGRESS' || action.includes('CLAIMED') || action.includes('ASSIGNED')) return '#60a5fa'
      if (status === 'SCHEDULED') return '#a78bfa'
      return '#e5e7eb'
    }

    // Draw timeline lanes
    lanes.forEach(lane => {
      const y = yScale(lane) || 0
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
      .data(allEvents)
      .enter()
      .append('g')
      .attr('class', 'event')
      .attr('transform', d => {
        const x = xScale(d.date)
        const lane = laneKeyFor(d)
        const y = (yScale(lane) || 0) + yScale.bandwidth() / 2
        return `translate(${x},${y})`
      })

    // Event circles with SLA/failure color coding
    eventGroups
      .append('circle')
      .attr('r', d => {
        const status = upper(d.status)
        const band = yScale.bandwidth()
        const base = Math.max(2.5, Math.min(5, band / 3))
        // Larger circles for failures and SLA breaches
        return status === 'FAILED' || status === 'REJECTED' || status === 'OVERDUE' ? base + 2 : base
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
          <div><strong>${d.flowName} • ${String(d.flowId).slice(-8)}</strong></div>
          <div>Task: ${d.taskName}</div>
          <div>Action: ${d.action}</div>
          <div>Status: ${d.status}</div>
          <div>User: ${d.userName || d.userId}</div>
          <div>Time: ${d3.timeFormat('%Y-%m-%d %H:%M:%S')(d.date)}</div>
        `)

        tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 10 + 'px')
      })
      .on('mouseleave', function () {
        d3.selectAll('.timeline-tooltip').remove()
      })

    // Add time axis (draw last so it's always visible)
    const [d0, d1] = xScale.domain()
    const axisSpanMs = d1.getTime() - d0.getTime()
    const fmt =
      axisSpanMs <= 6 * 60 * 60 * 1000
        ? d3.timeFormat('%H:%M')
        : axisSpanMs <= 3 * 24 * 60 * 60 * 1000
          ? d3.timeFormat('%d %b %H:%M')
          : d3.timeFormat('%d %b')

    const tickCount = Math.max(3, Math.min(10, Math.floor(innerWidth / 140)))
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat(fmt as any)
      .ticks(tickCount)
      .tickSize(-innerHeight)
      .tickPadding(10)

    const xAxisG = g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${innerHeight})`).call(xAxis)

    // Axis styling + gridlines
    xAxisG.selectAll('text').style('fill', '#9ca3af').style('font-size', '11px')
    xAxisG.selectAll('path.domain').style('stroke', '#374151').style('opacity', 0.8)
    xAxisG.selectAll('line').style('stroke', '#374151').style('opacity', 0.25).style('shape-rendering', 'crispEdges')

    // Style axes
    g.selectAll('.y-axis path, .y-axis line').style('stroke', '#374151')
  }, [auditData, networkData, dimensions, filters, svgSize.width, svgSize.height])

  useEffect(() => {
    if (!mountedRef.current) return

    try {
      renderTimeline()
    } catch (error) {
      console.error('Error rendering timeline:', error)
      onError(error instanceof Error ? error.message : 'Failed to render timeline')
    }
  }, [renderTimeline, onError])

  // Track actual SVG size with ResizeObserver (covers layout changes without window resize).
  useEffect(() => {
    const node = svgRef.current
    if (!node || typeof ResizeObserver === 'undefined') return

    const ro = new ResizeObserver(() => {
      const r = node.getBoundingClientRect()
      const w = Math.round(r.width)
      const h = Math.round(r.height)
      if (w > 0 && h > 0) setSvgSize({ width: w, height: h })
    })
    ro.observe(node)

    // Kick once after mount
    const r0 = node.getBoundingClientRect()
    const w0 = Math.round(r0.width)
    const h0 = Math.round(r0.height)
    if (w0 > 0 && h0 > 0) setSvgSize({ width: w0, height: h0 })

    return () => ro.disconnect()
  }, [])

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
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="gba:bg-card/30 gba:block"
        data-testid={`${prefixDataTestId}-timeline-svg`}
      />
    </div>
  )
}
