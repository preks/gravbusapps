/**
 * BuildConsoleLog - Console-style streaming build logs
 * Real-time log display with auto-scroll
 */

import React, { useEffect, useRef } from 'react'
import { Info, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@newwork/nw-design-system'

export interface BuildLogEntry {
  timestamp: string
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  duration?: number
  componentName?: string
}

export interface BuildConsoleLogProps {
  logs: BuildLogEntry[]
  currentOperation?: string | null
  isBuilding: boolean
  maxHeight?: string
  className?: string
  'data-testid'?: string
}

const logIcons = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle
}

const logColors = {
  info: 'gba:text-foreground',
  success: 'gba:text-foreground',
  error: 'gba:text-foreground',
  warning: 'gba:text-foreground'
}

export const BuildConsoleLog: React.FC<BuildConsoleLogProps> = ({
  logs,
  currentOperation,
  isBuilding,
  maxHeight = '320px',
  className,
  'data-testid': testId = 'build-console-log'
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs.length])

  return (
    <div
      className={cn('gba:font-mono gba:border gba:border-border gba:rounded-lg gba:overflow-hidden', className)}
      data-testid={testId}
    >
      {/* Compact header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1 gba:bg-muted/50 gba:border-b gba:border-border">
        <span className="gba:flex gba:h-1.5 gba:w-1.5">
          <span className="gba:animate-ping gba:absolute gba:inline-flex gba:h-1.5 gba:w-1.5 gba:rounded-full gba:opacity-75 gba:bg-foreground"></span>
          <span className="gba:relative gba:inline-flex gba:rounded-full gba:h-1.5 gba:w-1.5 gba:bg-foreground"></span>
        </span>
        <span className="gba:text-xs gba:font-medium">Build Events</span>
        {isBuilding && <span className="gba:text-[10px] gba:text-muted-foreground">(live)</span>}
      </div>

      {/* Log content */}
      <div
        ref={logContainerRef}
        className="gba:overflow-y-auto gba:bg-background gba:scrollbar-thin"
        style={{ maxHeight }}
      >
        <div className="gba:p-2 gba:space-y-0.5">
          {logs.length === 0 && (
            <div className="gba:text-xs gba:text-muted-foreground gba:italic">Waiting for build to start...</div>
          )}

          {logs.map((log, index) => {
            const Icon = logIcons[log.type]
            const colorClass = logColors[log.type]
            const logKey = `${log.timestamp}-${log.type}-${index}`

            return (
              <div
                key={logKey}
                className={cn(
                  'gba:flex gba:items-start gba:gap-2 gba:text-xs gba:leading-snug',
                  index === logs.length - 1 && 'gba:opacity-100',
                  index < logs.length - 1 && 'gba:opacity-70'
                )}
              >
                <span className="gba:text-muted-foreground gba:shrink-0 gba:w-16 gba:text-[10px]">{log.timestamp}</span>
                <Icon className={cn('gba:w-3 gba:h-3 gba:mt-0.5 gba:shrink-0', colorClass)} />
                <span className="gba:text-foreground gba:flex-1 gba:text-[11px]">
                  {log.componentName && <span className="gba:text-info">[{log.componentName}]</span>} {log.message}
                </span>
                {log.duration && (
                  <span className="gba:text-muted-foreground gba:shrink-0 gba:text-[10px]">+{log.duration}ms</span>
                )}
              </div>
            )
          })}

          {/* Current operation with typing indicator */}
          {isBuilding && currentOperation && (
            <div className="gba:flex gba:items-start gba:gap-2 gba:text-xs gba:leading-snug gba:animate-pulse">
              <span className="gba:text-muted-foreground gba:shrink-0 gba:w-16 gba:text-[10px]">
                {new Date().toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <Loader2 className="gba:w-3 gba:h-3 gba:mt-0.5 gba:shrink-0 gba:text-foreground gba:animate-spin" />
              <span className="gba:text-muted-foreground gba:flex-1 gba:text-[11px]">{currentOperation}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BuildConsoleLog
