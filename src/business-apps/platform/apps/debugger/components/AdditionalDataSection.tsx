import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { CopyIcon } from '@phosphor-icons/react'
import { JsonViewer } from './JsonViewer'

interface AdditionalDataSectionProps {
  additionalData?: any
}

export const AdditionalDataSection: React.FC<AdditionalDataSectionProps> = ({ additionalData }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (additionalData) {
      navigator.clipboard.writeText(JSON.stringify(additionalData, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!additionalData || Object.keys(additionalData).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Additional Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-muted-foreground">No additional data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Additional Data</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <CopyIcon className="gba:w-4 gba:h-4 gba:mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <JsonViewer data={additionalData} defaultExpanded={true} />
      </CardContent>
    </Card>
  )
}
