import React, { useRef, useEffect, useState } from 'react'
import { Spinner, Alert } from '@newwork/nw-design-system'
import { GuardianNetworkData, GuardianViewMode, GuardianFilter } from '../types/guardianTypes'
import { D3ForceNetworkChart } from './charts/D3ForceNetworkChart'
import { D3SankeyChart } from './charts/D3SankeyChart'
import { D3HierarchicalChart } from './charts/D3HierarchicalChart'
import { D3ChordChart } from './charts/D3ChordChart'
import { D3TimelineChart } from './charts/D3TimelineChart'

interface GuardianD3VisualizationProps {
  networkData: GuardianNetworkData | null
  auditData?: any // Audit log data for timeline view
  viewMode: GuardianViewMode
  filters: GuardianFilter
  animationSpeed: number
  isLoading: boolean
  isRealTime: boolean
  prefixDataTestId: string
}

export const GuardianD3Visualization: React.FC<GuardianD3VisualizationProps> = ({
  networkData,
  auditData,
  viewMode,
  filters,
  animationSpeed,
  isLoading,
  isRealTime,
  prefixDataTestId
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [error, setError] = useState<string | null>(null)

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const clientWidth = Math.round(rect.width)
        const clientHeight = Math.round(rect.height)
        // Avoid locking into the fallback size when the container hasn't been laid out yet.
        // We'll retry via rAF + ResizeObserver + timeout below.
        if (clientWidth < 50 || clientHeight < 50) return
        setDimensions({ width: clientWidth, height: clientHeight })
      }
    }

    updateDimensions()
    // Window resize covers viewport changes, but not layout shifts (e.g. loading state, container resizing).
    // ResizeObserver ensures we re-measure when the surrounding layout changes without a window resize.
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => updateDimensions())
      ro.observe(containerRef.current)
    }

    // Extra safety: on the platform the container size can change right after mount without triggering a window resize.
    // rAF + small timeout reliably catches the final layout width (prevents "looks correct only after resize").
    const raf1 = requestAnimationFrame(() => updateDimensions())
    const raf2 = requestAnimationFrame(() => updateDimensions())
    const t = window.setTimeout(() => updateDimensions(), 200)

    window.addEventListener('resize', updateDimensions)
    return () => {
      window.removeEventListener('resize', updateDimensions)
      ro?.disconnect()
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.clearTimeout(t)
    }
  }, [])

  // Reset error when view mode changes
  useEffect(() => {
    setError(null)
  }, [viewMode])

  const renderChart = () => {
    if (!networkData || !networkData.nodes.length) {
      return (
        <div
          className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground gba:text-base"
          data-testid={`${prefixDataTestId}-empty-state`}
        >
          {isLoading ? 'Loading network data...' : 'No data available for visualization'}
        </div>
      )
    }

    const commonProps = {
      data: networkData,
      dimensions,
      filters,
      animationSpeed,
      isRealTime,
      onError: setError,
      prefixDataTestId
    }

    try {
      switch (viewMode) {
        case 'force-directed':
          return (
            <D3ForceNetworkChart
              {...commonProps}
              showParticles={true}
              enableClustering={true}
              edgeBundling={true}
              data-testid={`${prefixDataTestId}-force-network`}
            />
          )

        case 'sankey':
          return (
            <D3SankeyChart
              {...commonProps}
              showFlow={true}
              enableAnimation={isRealTime}
              data-testid={`${prefixDataTestId}-sankey`}
            />
          )

        case 'hierarchical':
          return (
            <D3HierarchicalChart
              {...commonProps}
              layout="tree"
              orientation="top-to-bottom"
              enableCollapse={true}
              data-testid={`${prefixDataTestId}-hierarchical`}
            />
          )

        case 'chord':
          return (
            <D3ChordChart
              {...commonProps}
              enableTooltips={true}
              showLabels={filters.showLabels}
              data-testid={`${prefixDataTestId}-chord`}
            />
          )

        case 'timeline':
          return (
            <D3TimelineChart
              auditData={auditData}
              networkData={networkData}
              dimensions={dimensions}
              filters={filters}
              onError={setError}
              prefixDataTestId={prefixDataTestId}
              data-testid={`${prefixDataTestId}-timeline`}
            />
          )

        case 'geographic':
          return (
            <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
              Geographic view coming soon...
            </div>
          )

        case 'realtime':
          return (
            <D3ForceNetworkChart
              {...commonProps}
              showParticles={true}
              enableClustering={false}
              edgeBundling={false}
              heatmapMode={true}
              data-testid={`${prefixDataTestId}-realtime`}
            />
          )

        default:
          return (
            <D3ForceNetworkChart
              {...commonProps}
              showParticles={true}
              enableClustering={true}
              edgeBundling={true}
              data-testid={`${prefixDataTestId}-default`}
            />
          )
      }
    } catch (err) {
      console.error('Error rendering chart:', err)
      setError(err instanceof Error ? err.message : 'Unknown rendering error')
      return null
    }
  }

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-4"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:text-sm gba:text-muted-foreground gba:capitalize">
          Loading {viewMode.replace('-', ' ')} visualization...
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:h-full">
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
          <div>
            <h4 className="gba:font-semibold">Visualization Error</h4>
            <p className="gba:text-sm gba:mt-1">{error}</p>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="gba:w-full gba:h-full gba:relative gba:overflow-hidden"
      data-testid={`${prefixDataTestId}-container`}
    >
      {/* Chart Container */}
      <div className="gba:w-full gba:h-full gba:relative">{renderChart()}</div>

      {/* View Mode Indicator (hide for timeline; heading already exists) */}
      {viewMode !== 'timeline' && (
        <div className="gba:absolute gba:top-3 gba:right-3 gba:rounded-md gba:border gba:border-border gba:bg-popover/80 gba:px-3 gba:py-2 gba:text-xs gba:font-medium gba:text-foreground gba:capitalize gba:backdrop-blur-sm">
          {viewMode.replace('-', ' ')} View
        </div>
      )}

      {/* Real-time Indicator */}
      {isRealTime && (
        <div className="gba:absolute gba:top-3 gba:left-3 gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:border gba:border-border gba:bg-popover/80 gba:px-3 gba:py-2 gba:text-xs gba:font-medium gba:text-success gba:backdrop-blur-sm">
          <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-success gba:animate-pulse" />
          Live Data
        </div>
      )}

      {/* Legend Overlay - Only show for force-directed network graph */}
      {viewMode === 'force-directed' && (
        <div className="gba:absolute gba:bottom-3 gba:right-3 gba:rounded-md gba:border gba:border-border gba:bg-popover/80 gba:p-3 gba:text-xs gba:text-foreground gba:backdrop-blur-sm gba:leading-snug">
          <div className="gba:font-semibold gba:mb-2">Legend</div>
          <div>🟠 Departments</div>
          <div>🟣 Users</div>
          <div>⬢ Active Workflows</div>
          <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border-border">
            <div>✨ Moving dots = Active tasks in progress</div>
            <div>🌀 Green halo = Good SLA adherence</div>
          </div>
        </div>
      )}
    </div>
  )
}
