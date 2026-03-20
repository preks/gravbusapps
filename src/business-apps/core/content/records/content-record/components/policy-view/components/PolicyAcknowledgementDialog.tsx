import React from 'react'
import type { ContentEntry } from '@/common/data/content/types/contentTypes'
import { PolicyFlowDialog } from './PolicyFlowDialog'

interface PolicyAcknowledgementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy: ContentEntry
  accessToken: string
  initiatorUserId?: string
  onSent?: () => void
}

export const PolicyAcknowledgementDialog: React.FC<PolicyAcknowledgementDialogProps> = props => (
  <PolicyFlowDialog variant="acknowledgement" {...props} />
)

export default PolicyAcknowledgementDialog
