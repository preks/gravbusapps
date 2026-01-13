import React, { useRef, useEffect, useState } from 'react'
import { Spinner, Alert } from '@newwork/nw-design-system'
import { GuardianNetworkData, GuardianViewMode, GuardianFilter } from '../types/guardianTypes'
import { D3ForceNetworkChart } from './charts/D3ForceNetworkChart'
import { D3SankeyChart } from './charts/D3SankeyChart'
import { D3HierarchicalChart } from './charts/D3HierarchicalChart'
import { D3ChordChart } from './charts/D3ChordChart'
import { D3TimelineChart } from './charts/D3TimelineChart'
import { D3ExecutiveCommandCenter } from './charts/D3ExecutiveCommandCenter'

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
        const { clientWidth, clientHeight } = containerRef.current
        setDimensions({
          width: clientWidth || 800,
          height: clientHeight || 600
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Reset error when view mode changes
  useEffect(() => {
    setError(null)
  }, [viewMode])

  const renderChart = () => {
    if (!networkData || !networkData.nodes.length) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6b7280',
            fontSize: '16px'
          }}
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
              isRealTime={isRealTime}
              onError={setError}
              prefixDataTestId={prefixDataTestId}
              data-testid={`${prefixDataTestId}-timeline`}
            />
          )

        case 'geographic':
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#6b7280'
              }}
            >
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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          gap: '16px'
        }}
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="large" />
        <span style={{ color: '#6b7280', fontSize: '14px', textTransform: 'capitalize' }}>
          Loading {viewMode.replace('-', ' ')} visualization...
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px', height: '100%' }}>
        <Alert type="error" title="Visualization Error" description={error} data-testid={`${prefixDataTestId}-error`} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'transparent', // Let parent container handle background
        overflow: 'hidden'
      }}
      data-testid={`${prefixDataTestId}-container`}
    >
      {/* Chart Container */}
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>{renderChart()}</div>

      {/* View Mode Indicator */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#60a5fa',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500',
          textTransform: 'capitalize',
          backdropFilter: 'blur(4px)'
        }}
      >
        {viewMode.replace('-', ' ')} View
      </div>

      {/* Real-time Indicator */}
      {isRealTime && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#10b981',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              animation: 'pulse 2s infinite'
            }}
          />
          Live Data
        </div>
      )}

      {/* Legend Overlay - Only show for force-directed network graph */}
      {viewMode === 'force-directed' && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#e5e7eb',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '11px',
            backdropFilter: 'blur(4px)',
            lineHeight: '1.4'
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '6px', color: '#60a5fa' }}>Legend</div>
          <div>🟠 Departments</div>
          <div>🟣 Users</div>
          <div>⬢ Active Workflows</div>
          <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '6px' }}>
            <div>✨ Moving dots = Active tasks in progress</div>
            <div>🌀 Green halo = Good SLA adherence</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
