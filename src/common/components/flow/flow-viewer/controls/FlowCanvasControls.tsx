import React, { useEffect, useRef, useState } from 'react'
import { Panel, useReactFlow, useStore } from '@xyflow/react'
import { Minus, Plus, ImageDown } from 'lucide-react'
import { RiFocus3Line } from 'react-icons/ri'
import { Button } from '@newwork/nw-design-system'
import type { FlowCanvasThemeColors } from '../types/viewerTypes'

const ZOOM_PRESETS = [25, 50, 75, 100]

interface FlowCanvasControlsProps {
  uiColors: FlowCanvasThemeColors
  onExport: () => void
  isExporting: boolean
  'data-testid'?: string
}

export const FlowCanvasControls: React.FC<FlowCanvasControlsProps> = ({
  uiColors,
  onExport,
  isExporting,
  'data-testid': testId = 'flow-canvas-controls'
}) => {
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow()
  const zoomLevel = useStore(s => s.transform[2])
  const isMaxZoom = useStore(s => s.transform[2] >= s.maxZoom)
  const isMinZoom = useStore(s => s.transform[2] <= s.minZoom)
  const [displayZoom, setDisplayZoom] = useState(`${Math.round(zoomLevel * 100)}%`)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDisplayZoom(`${Math.round(zoomLevel * 100)}%`)
  }, [zoomLevel])

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick, true)
    return () => document.removeEventListener('mousedown', handleClick, true)
  }, [dropdownOpen])

  return (
    <Panel position="bottom-left" style={{ zIndex: 100 }} data-testid={testId}>
      <div
        ref={containerRef}
        className="gba:relative gba:flex gba:items-center gba:gap-0.5 gba:p-0.5 gba:rounded-lg gba:w-[220px]"
        style={{
          backgroundColor: uiColors.surface,
          border: uiColors.border ? `1px solid ${uiColors.border}` : undefined
        }}
      >
        {dropdownOpen && (
          <div
            className="gba:absolute gba:bottom-full gba:left-0 gba:mb-1 gba:bg-popover gba:border gba:border-border gba:rounded-lg gba:shadow-md gba:py-1 gba:min-w-[100px] gba:z-50"
            data-testid={`${testId}-zoom-dropdown`}
          >
            {ZOOM_PRESETS.map(preset => (
              <button
                key={preset}
                className={`gba:w-full gba:text-left gba:px-3 gba:py-1.5 gba:text-xs gba:text-foreground gba:hover:bg-accent gba:hover:text-accent-foreground gba:transition-colors ${
                  Math.round(zoomLevel * 100) === preset ? 'gba:font-semibold' : ''
                }`}
                onClick={() => {
                  zoomTo(preset / 100, { duration: 300 })
                  setDropdownOpen(false)
                }}
                data-testid={`${testId}-zoom-preset-${preset}`}
              >
                {preset}%
              </button>
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => zoomOut({ duration: 250 })}
          disabled={isMinZoom}
          data-testid={`${testId}-zoom-out`}
          aria-label="Zoom out"
        >
          <Minus className="gba:h-4 gba:w-4" />
        </Button>

        <button
          className="gba:text-xs gba:font-semibold gba:text-foreground gba:min-w-[44px] gba:text-center gba:select-none gba:rounded gba:px-1 gba:py-1 gba:hover:bg-accent gba:hover:text-accent-foreground gba:transition-colors gba:cursor-pointer"
          onClick={() => setDropdownOpen(v => !v)}
          data-testid={`${testId}-zoom-level`}
          aria-label="Select zoom level"
        >
          {displayZoom}
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => zoomIn({ duration: 250 })}
          disabled={isMaxZoom}
          data-testid={`${testId}-zoom-in`}
          aria-label="Zoom in"
        >
          <Plus className="gba:h-4 gba:w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => fitView({ duration: 300 })}
          data-testid={`${testId}-fit-view`}
          aria-label="Fit to view"
        >
          <RiFocus3Line className="gba:h-4 gba:w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
          data-testid={`${testId}-export`}
          aria-label="Download as image"
        >
          <ImageDown className="gba:h-4 gba:w-4" />
        </Button>
      </div>
    </Panel>
  )
}
