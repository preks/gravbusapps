/**
 * AccountStatusBadge - Renders a colored badge for email account status.
 */

import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import type { EmailAccount } from '../types'

interface AccountStatusBadgeProps {
  status: EmailAccount['status']
}

export const AccountStatusBadge: React.FC<AccountStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'active':
      return (
        <Badge variant="success" className="gba:gap-1">
          <CheckCircle className="gba:w-3 gba:h-3" />
          Active
        </Badge>
      )
    case 'disconnected':
      return (
        <Badge variant="destructive" className="gba:gap-1">
          <XCircle className="gba:w-3 gba:h-3" />
          Disconnected
        </Badge>
      )
    case 'error':
      return (
        <Badge variant="warning" className="gba:gap-1">
          <AlertCircle className="gba:w-3 gba:h-3" />
          Error
        </Badge>
      )
    case 'syncing':
      return (
        <Badge variant="info" className="gba:gap-1">
          <RefreshCw className="gba:w-3 gba:h-3 gba:animate-spin" />
          Syncing
        </Badge>
      )
    default:
      return null
  }
}
