/**
 * Admin API Types
 */

export interface AutoInitConfig {
  id: string
  url: string
  branch: string
  source: 'github' | 'bitbucket'
  owner: string
  name: string
  autoInitOnStartup: boolean
  blockedBranches: string[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAutoInitConfigRequest {
  url: string
  branch: string
  autoInitOnStartup?: boolean
  blockedBranches?: string[]
  enabled?: boolean
}

export interface UpdateAutoInitConfigRequest {
  branch?: string
  autoInitOnStartup?: boolean
  blockedBranches?: string[]
  enabled?: boolean
}
