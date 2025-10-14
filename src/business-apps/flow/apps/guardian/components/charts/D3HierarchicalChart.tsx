import React, { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { GuardianNetworkData, GuardianFilter } from '../../types/guardianTypes'

interface D3HierarchicalChartProps {
  data: GuardianNetworkData
  dimensions: { width: number; height: number }
  filters: GuardianFilter
  animationSpeed: number
  isRealTime: boolean
  layout?: 'tree' | 'cluster'
  orientation?: 'top-to-bottom' | 'left-to-right'
  enableCollapse?: boolean
  onError: (error: string) => void
  prefixDataTestId: string
}

export const D3HierarchicalChart: React.FC<D3HierarchicalChartProps> = ({
  data,
  dimensions,
  filters,
  animationSpeed,
  isRealTime,
  layout = 'tree',
  orientation = 'top-to-bottom',
  enableCollapse = true,
  onError,
  prefixDataTestId
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const mountedRef = useRef(true)

  const renderHierarchy = useCallback(() => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    const { width, height } = dimensions
    const margin = { top: 40, right: 40, bottom: 40, left: 40 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Clear previous render
    svg.selectAll('*').remove()

    // Create hierarchical organization data
    const orgData = {
      name: 'NEWWORK SE',
      type: 'company',
      activeWorkflows: 12,
      children: [
        {
          name: 'Human Resources',
          type: 'department',
          activeWorkflows: 5,
          completionRate: 0.85,
          children: [
            { name: 'Alice Johnson', type: 'user', role: 'HR Manager', activeWorkflows: 3 },
            { name: 'Bob Smith', type: 'user', role: 'HR Specialist', activeWorkflows: 2 }
          ]
        },
        {
          name: 'IT Department',
          type: 'department',
          activeWorkflows: 4,
          completionRate: 0.92,
          children: [
            { name: 'Charlie Davis', type: 'user', role: 'Developer', activeWorkflows: 2 },
            { name: 'Diana Wilson', type: 'user', role: 'IT Manager', activeWorkflows: 2 }
          ]
        },
        {
          name: 'Engineering',
          type: 'department',
          activeWorkflows: 3,
          completionRate: 0.88,
          children: [
            { name: 'Eve Brown', type: 'user', role: 'Senior Engineer', activeWorkflows: 2 },
            { name: 'Frank Miller', type: 'user', role: 'Tech Lead', activeWorkflows: 1 }
          ]
        }
      ]
    }

    // Create tree layout
    const treeLayout = d3
      .tree<any>()
      .size([innerWidth, innerHeight])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth)

    // Create hierarchy
    const root = d3.hierarchy(orgData)
    const treeData = treeLayout(root)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Draw links (reporting relationships)
    const links = g
      .selectAll('.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr(
        'd',
        d3
          .linkVertical<any, any>()
          .x(d => d.x)
          .y(d => d.y)
      )
      .style('fill', 'none')
      .style('stroke', '#374151')
      .style('stroke-width', 2)
      .style('opacity', 0.6)

    // Draw nodes
    const nodes = g
      .selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)

    // Node circles with size based on active workflows
    nodes
      .append('circle')
      .attr('r', d => {
        if (d.data.type === 'company') return 25
        if (d.data.type === 'department') return Math.max(12, Math.min(20, (d.data.activeWorkflows || 0) * 2 + 8))
        return 8 // users
      })
      .style('fill', d => {
        if (d.data.type === 'company') return '#1f2937'
        if (d.data.type === 'department') {
          // Color by completion rate
          const rate = d.data.completionRate || 0.5
          return d3.interpolateRgb('#ef4444', '#10b981')(rate) as string
        }
        return '#8b5cf6' // users - purple
      })
      .style('stroke', '#e5e7eb')
      .style('stroke-width', 2)

    // Add completion rate halos for departments
    nodes
      .filter(d => d.data.type === 'department')
      .append('circle')
      .attr('r', d => Math.max(12, Math.min(20, (d.data.activeWorkflows || 0) * 2 + 8)) + 4)
      .style('fill', 'none')
      .style('stroke', d => {
        const rate = d.data.completionRate || 0.5
        return d3.interpolateRgb('#ef4444', '#10b981')(rate) as string
      })
      .style('stroke-width', 2)
      .style('opacity', 0.4)

    // Node labels
    nodes
      .append('text')
      .attr('dy', d => (d.data.type === 'user' ? '25px' : '35px'))
      .attr('text-anchor', 'middle')
      .style('fill', '#e5e7eb')
      .style('font-size', d => (d.data.type === 'company' ? '14px' : '11px'))
      .style('font-weight', d => (d.data.type === 'company' ? '600' : '500'))
      .text(d => d.data.name)

    // Add workflow count badges for departments
    nodes
      .filter(d => d.data.type === 'department')
      .append('text')
      .attr('dy', '4px')
      .attr('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .style('font-size', '10px')
      .style('font-weight', '600')
      .text(d => d.data.activeWorkflows || 0)

    // Add role labels for users
    nodes
      .filter(d => d.data.type === 'user')
      .append('text')
      .attr('dy', '40px')
      .attr('text-anchor', 'middle')
      .style('fill', '#9ca3af')
      .style('font-size', '9px')
      .text(d => d.data.role || '')
  }, [data, dimensions, filters, layout, orientation])

  useEffect(() => {
    if (!mountedRef.current) return

    try {
      renderHierarchy()
    } catch (error) {
      console.error('Error rendering hierarchy:', error)
      onError(error instanceof Error ? error.message : 'Failed to render organizational chart')
    }
  }, [renderHierarchy, onError])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 100%)'
        }}
        data-testid={`${prefixDataTestId}-hierarchy-svg`}
      />
    </div>
  )
}
