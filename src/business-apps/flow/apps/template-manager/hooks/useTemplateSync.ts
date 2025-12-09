/**
 * useTemplateSync Hook
 * Handles template synchronization between instances with localStorage history
 */

import { useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { FlowEngineInstance } from '../types/instance'
import { SyncOperation, TemplateSyncItem, SyncOptions, SyncResult, SyncMode } from '../types/sync'
import { templateApi } from '../services/templateApi'

const SYNC_HISTORY_KEY = 'template-sync-history'
const MAX_HISTORY_ITEMS = 100

export const useTemplateSync = (accessToken: string) => {
  const [currentSync, setCurrentSync] = useState<SyncOperation | null>(null)
  const [syncHistory, setSyncHistory] = useState<SyncOperation[]>([])

  // Load sync history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(SYNC_HISTORY_KEY)
      if (storedHistory) {
        const history = JSON.parse(storedHistory)
        setSyncHistory(history)
      }
    } catch (err) {
      console.error('Failed to load sync history from localStorage', err)
    }
  }, [])

  // Save sync history to localStorage
  const saveSyncToHistory = useCallback(
    (sync: SyncOperation) => {
      try {
        const updatedHistory = [sync, ...syncHistory].slice(0, MAX_HISTORY_ITEMS)
        localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(updatedHistory))
        setSyncHistory(updatedHistory)
      } catch (err) {
        console.error('Failed to save sync history to localStorage', err)
      }
    },
    [syncHistory]
  )

  const syncTemplate = useCallback(
    async (
      templateId: string,
      sourceInstance: FlowEngineInstance,
      targetInstance: FlowEngineInstance,
      mode: SyncMode,
      options: SyncOptions
    ): Promise<SyncResult> => {
      const startTime = Date.now()

      try {
        // Use accessToken for instances without apiKey (current platform or local dev)
        const sourceApiKey = sourceInstance.apiKey || accessToken
        const targetApiKey = targetInstance.apiKey || accessToken

        // Fetch source template
        const sourceTemplate = await templateApi.getTemplateById(sourceInstance.baseUrl, templateId, sourceApiKey)

        // Check for active workflows if needed
        if (options.skipIfActiveWorkflows) {
          const hasActive = await templateApi.hasActiveWorkflows(targetInstance.baseUrl, templateId, targetApiKey)
          if (hasActive) {
            return {
              templateId,
              success: false,
              action: 'skipped',
              message: 'Skipped: Active workflows detected',
              duration: Date.now() - startTime
            }
          }
        }

        // Dry run mode - just validate
        if (options.dryRun) {
          return {
            templateId,
            success: true,
            action: 'skipped',
            message: 'Dry run: Would sync successfully',
            duration: Date.now() - startTime
          }
        }

        // Determine target version
        const targetTemplate = { ...sourceTemplate }

        if (mode === 'create_version') {
          // Check if template exists in target
          const existingTemplate = await templateApi
            .getTemplateById(targetInstance.baseUrl, templateId, targetApiKey)
            .catch(() => null)

          if (existingTemplate) {
            targetTemplate.version = existingTemplate.version + 1
          }
        }

        if (options.asDraft) {
          targetTemplate.isDraft = true
        }

        // Execute sync
        await templateApi.createOrUpdateTemplate(targetInstance.baseUrl, targetTemplate, targetApiKey)

        const duration = Date.now() - startTime

        return {
          templateId,
          success: true,
          action: mode === 'create_version' ? 'created' : 'updated',
          newVersion: targetTemplate.version,
          message: `Successfully synced to v${targetTemplate.version}`,
          duration
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error'
        return {
          templateId,
          success: false,
          action: 'skipped',
          message: error,
          duration: Date.now() - startTime,
          error
        }
      }
    },
    [accessToken]
  )

  const syncMultiple = useCallback(
    async (
      templates: TemplateSyncItem[],
      sourceInstance: FlowEngineInstance,
      targetInstance: FlowEngineInstance,
      options: SyncOptions
    ): Promise<SyncOperation> => {
      const syncOp: SyncOperation = {
        id: uuidv4(),
        timestamp: new Date(),
        sourceInstance,
        targetInstance,
        templates: templates.map(t => ({ ...t, status: 'pending' as const })),
        options,
        status: 'in_progress',
        results: []
      }

      setCurrentSync(syncOp)

      const results: SyncResult[] = []

      for (const template of templates) {
        // Update template status to 'syncing'
        console.log(`[Bulk Sync] Starting template: ${template.name}`)
        setCurrentSync(prev =>
          prev
            ? {
                ...prev,
                templates: prev.templates.map(t =>
                  t.templateId === template.templateId ? { ...t, status: 'syncing' as const } : t
                )
              }
            : null
        )

        // Small delay to ensure UI updates are visible
        await new Promise(resolve => setTimeout(resolve, 100))

        try {
          const result = await syncTemplate(template.templateId, sourceInstance, targetInstance, template.mode, options)

          results.push(result)
          console.log(`[Bulk Sync] Completed template: ${template.name} - ${result.success ? 'SUCCESS' : 'FAILED'}`)

          // Update template status to 'success' or 'failed'
          setCurrentSync(prev =>
            prev
              ? {
                  ...prev,
                  templates: prev.templates.map(t =>
                    t.templateId === template.templateId
                      ? { ...t, status: result.success ? 'success' : 'failed', error: result.error }
                      : t
                  )
                }
              : null
          )

          // Small delay between templates for better UX
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error'
          results.push({
            templateId: template.templateId,
            success: false,
            action: 'skipped',
            message: error,
            duration: 0,
            error
          })

          setCurrentSync(prev =>
            prev
              ? {
                  ...prev,
                  templates: prev.templates.map(t =>
                    t.templateId === template.templateId ? { ...t, status: 'failed', error } : t
                  )
                }
              : null
          )
        }
      }

      // Complete sync operation
      console.log(
        `[Bulk Sync] All templates completed. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`
      )

      // Use functional update to preserve the updated template statuses
      let completedSync: SyncOperation | null = null
      setCurrentSync(prev => {
        if (!prev) return null

        completedSync = {
          ...prev,
          status: 'completed',
          results
        }

        return completedSync
      })

      if (completedSync) {
        saveSyncToHistory(completedSync)
        return completedSync
      }

      // Fallback (should never happen)
      return {
        ...syncOp,
        status: 'completed',
        results
      }
    },
    [syncTemplate, saveSyncToHistory]
  )

  const clearSyncHistory = useCallback(() => {
    localStorage.removeItem(SYNC_HISTORY_KEY)
    setSyncHistory([])
  }, [])

  return {
    currentSync,
    syncHistory,
    syncTemplate,
    syncMultiple,
    clearSyncHistory
  }
}
