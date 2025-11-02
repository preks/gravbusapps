import { useState, useCallback } from 'react'
import { useGitClient, type GitConfig } from '@/common/network/git'
import { getAllTouchedFiles, getReviewedKeysForFile } from './useTranslationCache'
import { serializeFTL, updateFileMeta } from '../utils/fluent'
import type { UseTranslationFilesResult } from './useTranslationFiles'

const REVIEW_BRANCH = 'feature/NO-TICKET_translation_review'
const COMMIT_MESSAGE = 'chore NO-TICKET: review translations'

export interface UseSaveTranslationsResult {
  save: () => Promise<void>
  isSaving: boolean
  error: string | null
}

/**
 * Hook to save (commit + push) translation changes
 *
 * - Ensures review branch exists
 * - Commits all touched files with reviewedKeys in file-meta
 * - Auto-pushes (Bitbucket API does this automatically)
 */
export function useSaveTranslations(
  config: GitConfig | null,
  translationFiles: UseTranslationFilesResult
): UseSaveTranslationsResult {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const gitClient = useGitClient(config)

  const save = useCallback(async () => {
    if (!gitClient || !config) {
      setError('No Git configuration')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      console.log('[useSaveTranslations] Starting save...')

      // Ensure review branch exists
      await gitClient.ensureBranch(REVIEW_BRANCH, config.branch)

      // Get all touched files
      const touchedFiles = getAllTouchedFiles()
      console.log('[useSaveTranslations] Touched files:', touchedFiles.length)

      if (touchedFiles.length === 0) {
        console.log('[useSaveTranslations] No files to save')
        return
      }

      // Prepare files for commit
      const filesToCommit = touchedFiles
        .map(filePath => {
          const file = translationFiles.files.get(filePath)
          if (!file) return null

          // Get reviewed keys for this file
          const reviewedKeys = getReviewedKeysForFile(filePath)

          // Update file-meta with reviewedKeys
          const updatedAST = updateFileMeta(file.ast, {
            ...file.meta,
            reviewedKeys,
            updatedAt: new Date().toISOString(),
            updatedBy: config.email || config.username || 'unknown'
          })

          // Serialize to FTL
          const content = serializeFTL(updatedAST)

          return { path: filePath, content }
        })
        .filter(Boolean) as Array<{ path: string; content: string }>

      // Commit all files
      console.log('[useSaveTranslations] Committing', filesToCommit.length, 'files...')
      const result = await gitClient.commitFiles(REVIEW_BRANCH, filesToCommit, COMMIT_MESSAGE)

      // Push (auto-pushed by Bitbucket API, but call for consistency)
      console.log('[useSaveTranslations] Pushing...')
      await gitClient.push(REVIEW_BRANCH)

      console.log('[useSaveTranslations] Save complete:', result)
    } catch (err) {
      console.error('[useSaveTranslations] Save failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [gitClient, config, translationFiles.files])

  return {
    save,
    isSaving,
    error
  }
}
