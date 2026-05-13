import { useCallback } from 'react'
import { toast } from 'sonner'

import type { SpreadsheetApp } from '../types'

export interface UseSpreadsheetRenameActionParams {
  app: SpreadsheetApp
  canEditWithLock: boolean
  onAppUpdate?: ((app: SpreadsheetApp) => Promise<SpreadsheetApp> | SpreadsheetApp) | null
  messages: {
    required: string
    failed: string
    success: string
  }
}

export interface UseSpreadsheetRenameActionResult {
  handleRenameAppName: (name: string) => Promise<boolean>
}

export function useSpreadsheetRenameAction(params: UseSpreadsheetRenameActionParams): UseSpreadsheetRenameActionResult {
  const { app, canEditWithLock, onAppUpdate, messages } = params

  const handleRenameAppName = useCallback(
    async (name: string): Promise<boolean> => {
      if (!canEditWithLock || !onAppUpdate) {
        return false
      }
      const nextName = name.trim()
      if (!nextName) {
        toast.error(messages.required)
        return false
      }
      if (nextName === app.name) {
        return true
      }
      try {
        const updatedApp = await Promise.resolve(onAppUpdate({ ...app, name: nextName }) as unknown)
        if (!updatedApp || typeof updatedApp !== 'object') {
          toast.error(messages.failed)
          return false
        }
        const persistedName = (updatedApp as SpreadsheetApp).name
        if (persistedName !== nextName) {
          toast.error(messages.failed)
          return false
        }
        toast.success(messages.success)
        return true
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to rename spreadsheet:', error)
        toast.error(messages.failed)
        return false
      }
    },
    [app, canEditWithLock, messages.failed, messages.required, messages.success, onAppUpdate]
  )

  return { handleRenameAppName }
}
