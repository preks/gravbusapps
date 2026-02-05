/**
 * BuildConsoleLog - Console-style streaming build logs
 * Real-time log display with auto-scroll
 */

import React, { useEffect, useRef } from 'react'
import { Info, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, cn } from '@newwork/nw-design-system'

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
  maxHeight = '400px',
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
    <Card className={cn('gba:font-mono', className)} data-testid={testId}>
      <CardHeader className="gba:py-3 gba:border-b gba:border-border">
        <CardTitle className="gba:text-sm gba:font-medium gba:flex gba:items-center gba:gap-2">
          <span className="gba:flex gba:h-2 gba:w-2">
            <span
              className={cn(
                'gba:animate-ping gba:absolute gba:inline-flex gba:h-2 gba:w-2 gba:rounded-full gba:opacity-75 gba:bg-foreground'
              )}
            ></span>
            <span
              className={cn('gba:relative gba:inline-flex gba:rounded-full gba:h-2 gba:w-2 gba:bg-foreground')}
            ></span>
          </span>
          Build Log
          {isBuilding && <span className="gba:text-xs gba:text-muted-foreground gba:font-normal">(live)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:p-0">
        <div
          ref={logContainerRef}
          className="gba:overflow-y-auto gba:bg-muted/30 gba:scrollbar-thin"
          style={{ maxHeight }}
        >
          <div className="gba:p-4 gba:space-y-1">
            {logs.length === 0 && (
              <div className="gba:text-sm gba:text-muted-foreground gba:italic">Waiting for build to start...</div>
            )}

            {logs.map((log, index) => {
              const Icon = logIcons[log.type]
              const colorClass = logColors[log.type]
              const logKey = `${log.timestamp}-${log.type}-${index}`

              return (
                <div
                  key={logKey}
                  className={cn(
                    'gba:flex gba:items-start gba:gap-2 gba:text-xs gba:leading-relaxed gba:animate-in gba:slide-in-from-left-2 gba:duration-200',
                    index === logs.length - 1 && 'gba:opacity-100',
                    index < logs.length - 1 && 'gba:opacity-70'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="gba:text-muted-foreground gba:shrink-0 gba:w-20">{log.timestamp}</span>
                  <Icon className={cn('gba:w-3 gba:h-3 gba:mt-0.5 gba:shrink-0', colorClass)} />
                  <span className="gba:text-foreground gba:flex-1">
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
              <div className="gba:flex gba:items-start gba:gap-2 gba:text-xs gba:leading-relaxed gba:animate-pulse">
                <span className="gba:text-muted-foreground gba:shrink-0 gba:w-20">
                  {new Date().toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <Loader2 className="gba:w-3 gba:h-3 gba:mt-0.5 gba:shrink-0 gba:text-foreground gba:animate-spin" />
                <span className="gba:text-muted-foreground gba:flex-1">{currentOperation}</span>
                <span className="gba:flex gba:gap-0.5">
                  <span className="gba:w-1 gba:h-1 gba:bg-current gba:rounded-full gba:animate-bounce"></span>
                  <span
                    className="gba:w-1 gba:h-1 gba:bg-current gba:rounded-full gba:animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></span>
                  <span
                    className="gba:w-1 gba:h-1 gba:bg-current gba:rounded-full gba:animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></span>
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BuildConsoleLog
