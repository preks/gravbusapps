import React from 'react'
import { StatusProgression as SharedStatusProgression } from '@/common/components/status-progression'
import type { ReferenceData } from '../types'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface StatusProgressionProps {
  currentStatus: string
  statuses: ReferenceData[]
  leadId: string
  leadVersion: number
  accessToken: string
}

export const StatusProgression: React.FC<StatusProgressionProps> = props => {
  return (
    <SharedStatusProgression
      {...props}
      config={{
        flowContextName: FlowContextName.customerSaveLead,
        statusReferencePrefix: 'SalesLeadStatus:v1:',
        testIdPrefix: 'lead-status'
      }}
    />
  )
}
