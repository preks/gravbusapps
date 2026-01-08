import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { CopyIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { JsonViewer } from './JsonViewer'

export const LocalStorageViewer: React.FC = () => {
  const { data, refresh } = useLocalStorage()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Local Storage</CardTitle>
          <div className="gba:flex gba:gap-2">
            <Button variant="ghost" size="sm" onClick={refresh}>
              <ArrowClockwiseIcon className="gba:w-4 gba:h-4 gba:mr-1" />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <CopyIcon className="gba:w-4 gba:h-4 gba:mr-1" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(data).length === 0 ? (
          <div className="gba:text-muted-foreground">Local storage is empty</div>
        ) : (
          <JsonViewer data={data} defaultExpanded={true} />
        )}
      </CardContent>
    </Card>
  )
}
