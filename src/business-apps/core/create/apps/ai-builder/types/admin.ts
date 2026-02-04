/**
 * Admin API Types
 */

export interface AutoInitConfig {
  id: string
  repoId?: string | null // Repository ID if initialized
  url: string
  branch: string
  source: 'github' | 'bitbucket'
  owner: string
  name: string
  autoInitOnStartup: boolean
  blockedBranches: string[]
  enabled: boolean
  // Publish configuration
  supportsPublish: boolean
  publishBasePath: string | null
  publishAssetsPath: string | null
  publishAzureEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAutoInitConfigRequest {
  url: string
  branch: string
  autoInitOnStartup?: boolean
  blockedBranches?: string[]
  enabled?: boolean
  // Publish configuration
  supportsPublish?: boolean
  publishBasePath?: string
  publishAssetsPath?: string
  publishAzureEnabled?: boolean
}

export interface UpdateAutoInitConfigRequest {
  branch?: string
  autoInitOnStartup?: boolean
  blockedBranches?: string[]
  enabled?: boolean
  // Publish configuration
  supportsPublish?: boolean
  publishBasePath?: string
  publishAssetsPath?: string
  publishAzureEnabled?: boolean
}
