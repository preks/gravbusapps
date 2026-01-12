import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { CopyIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { JsonViewer } from './JsonViewer'

export const PlatformContextViewer: React.FC = () => {
  const [copied, setCopied] = useState(false)
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const [windowSerializationError, setWindowSerializationError] = useState<string | null>(null)

  const windowData = useMemo(() => {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      // Custom serialization function that properly detects circular references
      // by tracking the traversal path, not just seen objects
      const serialize = (obj: any, visited: WeakSet<any>, path: Set<any>): any => {
        // Handle primitives
        if (obj === null || typeof obj !== 'object') {
          return obj
        }

        // Handle functions
        if (typeof obj === 'function') {
          return '[Function]'
        }

        // Check for circular reference (object is in current traversal path)
        if (path.has(obj)) {
          return '[Circular]'
        }

        // Check if we've already serialized this object (shared reference, not circular)
        if (visited.has(obj)) {
          return '[Shared Reference]'
        }

        // Mark as visited and add to current path
        visited.add(obj)
        path.add(obj)

        try {
          // Handle arrays
          if (Array.isArray(obj)) {
            return obj.map(item => serialize(item, visited, path))
          }

          // Handle objects
          const result: Record<string, any> = {}
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              try {
                result[key] = serialize(obj[key], visited, path)
              } catch {
                // Skip properties that can't be serialized
                result[key] = '[Error serializing]'
              }
            }
          }
          return result
        } finally {
          // Remove from current path when done traversing this object
          path.delete(obj)
        }
      }

      const visited = new WeakSet()
      const path = new Set<any>()
      const result = serialize(window, visited, path)
      setWindowSerializationError(null)
      return result
    } catch (error) {
      console.error('Failed to serialize window object:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to serialize window object'
      setWindowSerializationError(errorMessage)
      return null
    }
  }, [reloadTrigger])

  const reloadData = useCallback(() => {
    setReloadTrigger(prev => prev + 1)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!windowData) {
      return
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(windowData, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Optionally could show an error message to the user here
    }
  }, [windowData, setCopied])

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
        {windowSerializationError ? (
          <div className="gba:text-destructive">Failed to serialize window object: {windowSerializationError}</div>
        ) : !windowData ? (
          <div className="gba:text-muted-foreground">window is not available</div>
        ) : (
          <JsonViewer data={windowData} />
        )}
      </CardContent>
    </Card>
  )
}
