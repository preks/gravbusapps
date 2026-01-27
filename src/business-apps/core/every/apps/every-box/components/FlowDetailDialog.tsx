/**
 * FlowDetailDialog Component
 * Dialog wrapper for flow details - uses FlowDetailContent internally
 */

import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { Flow } from '../types'
import { FlowDetailContent } from './FlowDetailContent'

interface FlowDetailDialogProps {
  flow: Flow | null
  onClose: () => void
  accessToken: string
}

export const FlowDetailDialog: React.FC<FlowDetailDialogProps> = ({ flow, onClose, accessToken }) => {
  if (!flow) return null

  return (
    <Card className="gba:h-full gba:flex gba:flex-col gba:shadow-lg" data-testid="flow-detail-dialog">
      <CardContent className="gba:flex-1 gba:overflow-y-auto gba:pt-6">
        <FlowDetailContent flow={flow} onClose={onClose} accessToken={accessToken} showCloseButton={true} />
      </CardContent>
    </Card>
  )
}
