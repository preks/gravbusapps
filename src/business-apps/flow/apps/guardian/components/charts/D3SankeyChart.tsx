import React, { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { GuardianNetworkData, GuardianFilter } from '../../types/guardianTypes'

interface D3SankeyChartProps {
  data: GuardianNetworkData
  dimensions: { width: number; height: number }
  filters: GuardianFilter
  animationSpeed: number
  isRealTime: boolean
  showFlow?: boolean
  enableAnimation?: boolean
  onError: (error: string) => void
  prefixDataTestId: string
}

export const D3SankeyChart: React.FC<D3SankeyChartProps> = ({
  data,
  dimensions,
  filters,
  animationSpeed,
  isRealTime,
  showFlow = true,
  enableAnimation = true,
  onError,
  prefixDataTestId
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const mountedRef = useRef(true)

  const renderSankey = useCallback(() => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    const { width, height } = dimensions
    const margin = { top: 20, right: 80, bottom: 20, left: 80 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Clear previous render
    svg.selectAll('*').remove()

    // Create mock sankey data showing workflow flow through departments
    const sankeyNodes = [
      // Source nodes (workflow initiation)
      { id: 'source-hr', name: 'HR Requests', layer: 0, value: 15 },
      { id: 'source-it', name: 'IT Requests', layer: 0, value: 10 },
      { id: 'source-eng', name: 'Engineering', layer: 0, value: 12 },

      // Process nodes (workflow steps)
      { id: 'approval', name: 'Approval', layer: 1, value: 20 },
      { id: 'review', name: 'Review', layer: 1, value: 12 },
      { id: 'validation', name: 'Validation', layer: 1, value: 8 },

      // Destination nodes (completion)
      { id: 'completed', name: 'Completed', layer: 2, value: 25 },
      { id: 'rejected', name: 'Rejected', layer: 2, value: 8 },
      { id: 'pending', name: 'Pending', layer: 2, value: 7 }
    ]

    const sankeyLinks = [
      // From sources to processes
      { source: 'source-hr', target: 'approval', value: 12 },
      { source: 'source-hr', target: 'review', value: 3 },
      { source: 'source-it', target: 'validation', value: 6 },
      { source: 'source-it', target: 'approval', value: 4 },
      { source: 'source-eng', target: 'review', value: 8 },
      { source: 'source-eng', target: 'validation', value: 4 },

      // From processes to outcomes
      { source: 'approval', target: 'completed', value: 14 },
      { source: 'approval', target: 'rejected', value: 2 },
      { source: 'review', target: 'completed', value: 8 },
      { source: 'review', target: 'pending', value: 3 },
      { source: 'validation', target: 'completed', value: 6 },
      { source: 'validation', target: 'rejected', value: 4 }
    ]

    // Position nodes in layers
    const layers = d3.group(sankeyNodes, d => d.layer)
    const layerWidth = innerWidth / 3

    sankeyNodes.forEach(node => {
      const layer = layers.get(node.layer) || []
      const layerIndex = layer.indexOf(node)
      const layerHeight = innerHeight / layer.length

      ;(node as any).x = node.layer * layerWidth + layerWidth / 2
      ;(node as any).y = layerIndex * layerHeight + layerHeight / 2
      ;(node as any).width = 60
      ;(node as any).height = Math.max(20, node.value * 3)
    })

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Draw links (flows)
    const linkGenerator = d3
      .linkHorizontal()
      .x((d: any) => d.x)
      .y((d: any) => d.y)

    sankeyLinks.forEach(link => {
      const sourceNode = sankeyNodes.find(n => n.id === link.source)
      const targetNode = sankeyNodes.find(n => n.id === link.target)

      if (sourceNode && targetNode) {
        const linkPath = g
          .append('path')
          .datum({
            source: { x: (sourceNode as any).x + (sourceNode as any).width / 2, y: (sourceNode as any).y },
            target: { x: (targetNode as any).x - (targetNode as any).width / 2, y: (targetNode as any).y }
          })
          .attr('d', linkGenerator as any)
          .style('fill', 'none')
          .style('stroke', '#60a5fa')
          .style('stroke-width', Math.max(2, link.value / 2))
          .style('opacity', 0.6)

        // Add flow animation
        if (enableAnimation && isRealTime) {
          linkPath.style('stroke-dasharray', '5,5').style('animation', 'dash 2s linear infinite')
        }
      }
    })

    // Draw nodes
    const nodeGroups = g
      .selectAll('.sankey-node')
      .data(sankeyNodes)
      .enter()
      .append('g')
      .attr('class', 'sankey-node')
      .attr(
        'transform',
        d => `translate(${(d as any).x - (d as any).width / 2}, ${(d as any).y - (d as any).height / 2})`
      )

    nodeGroups
      .append('rect')
      .attr('width', d => (d as any).width)
      .attr('height', d => (d as any).height)
      .style('fill', d => {
        if (d.layer === 0) return '#10b981' // Source - green
        if (d.layer === 1) return '#f59e0b' // Process - amber
        if (d.name === 'Completed') return '#60a5fa' // Success - blue
        if (d.name === 'Rejected') return '#ef4444' // Failure - red
        return '#8b5cf6' // Pending - purple
      })
      .style('stroke', '#1f2937')
      .style('stroke-width', 1)
      .style('rx', 4)

    // Add node labels
    nodeGroups
      .append('text')
      .attr('x', d => (d as any).width / 2)
      .attr('y', d => (d as any).height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('fill', '#ffffff')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text(d => d.name)

    // Add value labels
    nodeGroups
      .append('text')
      .attr('x', d => (d as any).width / 2)
      .attr('y', d => (d as any).height + 15)
      .attr('text-anchor', 'middle')
      .style('fill', '#e5e7eb')
      .style('font-size', '10px')
      .text(d => `${d.value} flows`)

    // Add CSS for animation
    svg.append('style').text(`
      @keyframes dash {
        to {
          stroke-dashoffset: -10;
        }
      }
    `)
  }, [data, dimensions, filters, enableAnimation, isRealTime])

  useEffect(() => {
    if (!mountedRef.current) return

    try {
      renderSankey()
    } catch (error) {
      console.error('Error rendering Sankey:', error)
      onError(error instanceof Error ? error.message : 'Failed to render Sankey diagram')
    }
  }, [renderSankey, onError])

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
        data-testid={`${prefixDataTestId}-sankey-svg`}
      />
    </div>
  )
}
