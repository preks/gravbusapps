import { useState, useCallback } from 'react'
import { useGitClient, type GitConfig } from '@/common/network/git'
import { getAllTouchedFiles, getReviewedKeysForFile } from './useTranslationCache'
import { serializeFTL, updateFileMeta } from '../utils/fluent'
import type { UseTranslationFilesResult } from './useTranslationFiles'
import { useSaveTranslations } from './useSaveTranslations'

const REVIEW_BRANCH = 'feature/NO-TICKET_translation_review'
const COMMIT_MESSAGE = 'chore NO-TICKET: review translations'
const PR_TITLE = 'chore NO-TICKET: review translations'

export interface UsePublishTranslationsResult {
  publish: () => Promise<{ prUrl: string; prId: string | number }>
  isPublishing: boolean
  error: string | null
  canPublish: boolean
}

/**
 * Hook to publish (save + push + PR) translation changes
 *
 * - Calls useSaveTranslations to commit + push
 * - Creates PR from review branch to base branch
 * - Clears reviewedKeys from file-meta before PR
 * - Returns PR URL
 */
export function usePublishTranslations(
  config: GitConfig | null,
  translationFiles: UseTranslationFilesResult
): UsePublishTranslationsResult {
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const gitClient = useGitClient(config)
  const { save: saveTranslations } = useSaveTranslations(config, translationFiles)

  // Calculate if publish is allowed (all touched files must be fully reviewed)
  const canPublish = useCallback(() => {
    const touchedFiles = getAllTouchedFiles()
    if (touchedFiles.length === 0) return false

    return touchedFiles.every(filePath => {
      const file = translationFiles.files.get(filePath)
      if (!file) return false

      const reviewedKeys = getReviewedKeysForFile(filePath)
      const allKeys = [...file.ast.body].filter((e: any) => e.type === 'Message').map((e: any) => e.id.name)

      return allKeys.length > 0 && allKeys.every(key => reviewedKeys.includes(key))
    })
  }, [translationFiles.files])()

  const publish = useCallback(async (): Promise<{ prUrl: string; prId: string | number }> => {
    if (!gitClient || !config) {
      throw new Error('No Git configuration')
    }

    if (!canPublish) {
      throw new Error('Cannot publish: not all touched files are fully reviewed')
    }

    setIsPublishing(true)
    setError(null)

    try {
      console.log('[usePublishTranslations] Starting publish...')

      // Step 1: Save translations (commit + push with reviewedKeys)
      console.log('[usePublishTranslations] Step 1: Saving translations...')
      await saveTranslations()

      // Step 2: Clear reviewedKeys and commit again for PR
      console.log('[usePublishTranslations] Step 2: Clearing reviewedKeys for PR...')
      const touchedFiles = getAllTouchedFiles()

      const filesForPR = touchedFiles
        .map(filePath => {
          const file = translationFiles.files.get(filePath)
          if (!file) return null

          // Clear reviewedKeys from file-meta for PR
          const updatedAST = updateFileMeta(file.ast, {
            ...file.meta,
            reviewedKeys: [], // Clear reviewed keys
            reviewedAt: new Date().toISOString(),
            reviewedBy: config.email || config.username || 'unknown',
            updatedAt: new Date().toISOString(),
            updatedBy: config.email || config.username || 'unknown'
          })

          const content = serializeFTL(updatedAST)

          return { path: filePath, content }
        })
        .filter(Boolean) as Array<{ path: string; content: string }>

      // Commit files without reviewedKeys
      console.log('[usePublishTranslations] Committing', filesForPR.length, 'files for PR...')
      await gitClient.commitFiles(REVIEW_BRANCH, filesForPR, `${COMMIT_MESSAGE} (finalize)`)
      await gitClient.push(REVIEW_BRANCH)

      // Step 3: Create PR
      console.log('[usePublishTranslations] Step 3: Creating PR...')
      const pr = await gitClient.createPullRequest(
        REVIEW_BRANCH,
        config.branch,
        PR_TITLE,
        `This PR contains reviewed translations from ${touchedFiles.length} files.\n\nAll translations have been reviewed and approved.`
      )

      console.log('[usePublishTranslations] PR created:', pr)

      // TODO: Clear cache for touched files after successful PR

      return { prUrl: pr.url, prId: pr.id }
    } catch (err) {
      console.error('[usePublishTranslations] Publish failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsPublishing(false)
    }
  }, [gitClient, config, canPublish, saveTranslations, translationFiles.files])

  return {
    publish,
    isPublishing,
    error,
    canPublish
  }
}
