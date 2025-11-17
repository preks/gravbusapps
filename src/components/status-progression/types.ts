import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface ReferenceData {
  code: string
  value: string
}

export interface StatusProgressionConfig {
  flowContextName: FlowContextName
  statusReferencePrefix: string
  testIdPrefix: string
}

export interface StatusProgressionProps {
  currentStatus: string
  statuses: ReferenceData[]
  leadId: string
  leadVersion: number
  accessToken: string
  config: StatusProgressionConfig
}

export interface StatusIndices {
  openIndex: number
  convertedIndex: number
  lostIndex: number
  currentIndex: number
  isOpen: boolean
  isConverted: boolean
  isLost: boolean
}
