import React from 'react'
import type { ContentEntry } from '@/common/data/content/types/contentTypes'
import { PolicyFlowDialog } from './PolicyFlowDialog'

interface PolicyApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy: ContentEntry
  accessToken: string
  initiatorUserId?: string
  onSent?: () => void
}

export const PolicyApprovalDialog: React.FC<PolicyApprovalDialogProps> = props => (
  <PolicyFlowDialog variant="approval" {...props} />
)

export default PolicyApprovalDialog
