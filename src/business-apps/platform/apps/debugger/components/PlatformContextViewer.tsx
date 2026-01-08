import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { CopyIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { JsonViewer } from './JsonViewer'

export const PlatformContextViewer: React.FC = () => {
  const [copied, setCopied] = useState(false)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  const windowData = useMemo(() => {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      // Safely serialize the window object, handling circular references
      const seen = new WeakSet()
      const serialized = JSON.parse(
        JSON.stringify(window, (_key, value) => {
          // Skip functions
          if (typeof value === 'function') {
            return '[Function]'
          }
          // Skip circular references
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]'
            }
            seen.add(value)
          }
          return value
        })
      )
      return serialized
    } catch (error) {
      console.error('Failed to serialize window object:', error)
      return { error: 'Failed to serialize window object' }
    }
  }, [reloadTrigger])

  const reloadData = useCallback(() => {
    setReloadTrigger(prev => prev + 1)
  }, [])

  const handleCopy = () => {
    if (windowData) {
      navigator.clipboard.writeText(JSON.stringify(windowData, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>window</CardTitle>
          <div className="gba:flex gba:gap-2">
            <Button variant="ghost" size="sm" onClick={reloadData}>
              <ArrowClockwiseIcon className="gba:w-4 gba:h-4 gba:mr-1" />
              Reload
            </Button>
            {windowData && (
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <CopyIcon className="gba:w-4 gba:h-4 gba:mr-1" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!windowData ? (
          <div className="gba:text-muted-foreground">window is not available</div>
        ) : (
          <JsonViewer data={windowData} defaultExpanded={true} />
        )}
      </CardContent>
    </Card>
  )
}
