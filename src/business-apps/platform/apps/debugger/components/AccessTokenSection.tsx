import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { CopyIcon } from '@phosphor-icons/react'

interface AccessTokenSectionProps {
  accessToken: string
}

export const AccessTokenSection: React.FC<AccessTokenSectionProps> = ({ accessToken }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(accessToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="gba:flex gba:flex-col gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Access Token</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <CopyIcon className="gba:w-4 gba:h-4 gba:mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-col gba:h-full">
        <textarea
          id="accessToken"
          value={accessToken}
          readOnly
          className="gba:w-full gba:flex-1 gba:min-h-[200px] gba:p-2 gba:border gba:rounded gba:font-mono gba:text-xs gba:bg-background gba:text-foreground gba:resize-none"
        />
      </CardContent>
    </Card>
  )
}
