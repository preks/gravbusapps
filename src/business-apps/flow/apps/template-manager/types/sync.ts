/**
 * Template Sync Type Definitions
 * For synchronizing templates between instances
 */

import { FlowEngineInstance } from './instance'

export type SyncMode = 'create_version' | 'overwrite' | 'draft' | 'skip'

export interface SyncOperation {
  id: string
  timestamp: Date
  sourceInstance: FlowEngineInstance
  targetInstance: FlowEngineInstance
  templates: TemplateSyncItem[]
  options: SyncOptions
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  results?: SyncResult[]
}

export interface TemplateSyncItem {
  templateId: string
  name: string
  sourceVersion: number
  targetVersion?: number
  mode: SyncMode
  status: 'pending' | 'syncing' | 'success' | 'failed' | 'skipped'
  error?: string
}

export interface SyncOptions {
  validateDependencies: boolean
  asDraft: boolean
  skipIfActiveWorkflows: boolean
  dryRun: boolean
}

export interface SyncResult {
  templateId: string
  success: boolean
  action: 'created' | 'updated' | 'skipped'
  newVersion?: number
  message: string
  duration: number
  error?: string
}
