import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { CopyIcon } from '@phosphor-icons/react'
import { JsonViewer } from './JsonViewer'

interface UserInfoSectionProps {
  userInfo?: any
}

export const UserInfoSection: React.FC<UserInfoSectionProps> = ({ userInfo }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (userInfo) {
      navigator.clipboard.writeText(JSON.stringify(userInfo, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!userInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-muted-foreground">No user info available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>User Info</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <CopyIcon className="gba:w-4 gba:h-4 gba:mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <JsonViewer data={userInfo} defaultExpanded={true} />
      </CardContent>
    </Card>
  )
}
