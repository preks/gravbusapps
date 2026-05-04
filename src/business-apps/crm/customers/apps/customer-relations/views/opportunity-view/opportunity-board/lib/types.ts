export interface Stage {
  id: string
  name: string
  code?: string // Catalog code for API calls (enum value)
  order: number
  probability: number
  rotting: boolean
  rottingDays: number
}

export interface Opportunity {
  id: string
  name: string
  title?: string
  description?: string
  estimatedAmount?: number
  amount?: number
  winningChance?: number
  stageId?: string
  salesPipelineRef?: string
  salesPipelineStageRef?: string
  closeDate?: string
  estimatedCloseDate?: string
  status?: string
  account?: {
    id?: string
    name: string
  }
  ownerEmployee?: {
    id?: string
    fullName: string
  }
  owner?: string
  currency?: string
  createdAt?: string
  updatedAt?: string
  lastActivityAt?: string
  tags?: string[]
  version: number
  sourceApp?: string
  position?: number // For ordering within a stage
}
