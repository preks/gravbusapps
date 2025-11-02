import { useState, useCallback } from 'react'
import { useGitClient, type GitConfig } from '@/common/network/git'
import { parseFTL, serializeFTL, getFileMeta, type FileMeta } from '../utils/fluent'
import type * as F from '@fluent/syntax'

/**
 * Translation file data with parsed AST and metadata
 */
export interface TranslationFile {
  path: string
  locale: string
  content: string
  ast: F.Resource
  sha?: string
  lastModified?: string | null
  meta?: FileMeta
  needsReview?: boolean // reviewedAt < lastModified
}

export interface UseTranslationFilesResult {
  files: Map<string, TranslationFile>
  isLoading: boolean
  progress: { loaded: number; total: number }
  error: string | null
  loadFiles: (paths: string[], branch: string) => Promise<void>
  updateFileAST: (path: string, ast: F.Resource) => void
  clearFiles: () => void
}

/**
 * Hook to load multiple translation files in parallel with progress tracking
 *
 * @param config Git configuration
 * @returns Translation files operations and state with progress
 */
export function useTranslationFiles(config: GitConfig | null): UseTranslationFilesResult {
  const [files, setFiles] = useState<Map<string, TranslationFile>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)

  // Create Git client internally
  const gitClient = useGitClient(config)

  /**
   * Load multiple translation files in parallel with progress tracking
   */
  const loadFiles = useCallback(
    async (paths: string[], branch: string) => {
      if (!gitClient || !config) {
        setError('No Git configuration provided')
        return
      }

      if (paths.length === 0) {
        setFiles(new Map())
        setProgress({ loaded: 0, total: 0 })
        return
      }

      setIsLoading(true)
      setError(null)
      setProgress({ loaded: 0, total: paths.length })

      try {
        console.log(`[useTranslationFiles] Loading ${paths.length} files in parallel...`)

        const newFiles = new Map<string, TranslationFile>()
        let loadedCount = 0
        let errorCount = 0

        // Load all files in parallel with progress tracking
        await Promise.all(
          paths.map(async path => {
            try {
              // Fetch file content and metadata in parallel
              const [fileContent, lastModified] = await Promise.all([
                gitClient.readFile(path, branch),
                gitClient.getLastCommitDate(path, branch)
              ])

              // Parse FTL content
              const ast = parseFTL(fileContent.content)

              // Extract locale from filename (e.g., "en-US.ftl" -> "en-US")
              const filename = path.split('/').pop() || ''
              const locale = filename.replace('.ftl', '')

              // Extract metadata
              const meta = getFileMeta(ast)

              // Determine if needs review: reviewedAt < lastModified
              const needsReview =
                lastModified && meta?.reviewedAt
                  ? new Date(lastModified) > new Date(meta.reviewedAt)
                  : !meta?.reviewedAt // No review timestamp = needs review

              const fileData: TranslationFile = {
                path,
                locale,
                content: fileContent.content,
                ast,
                sha: fileContent.sha,
                lastModified,
                meta,
                needsReview
              }

              newFiles.set(path, fileData)
              loadedCount++

              // Update progress
              setProgress({ loaded: loadedCount, total: paths.length })

              console.log(`[useTranslationFiles] Loaded ${loadedCount}/${paths.length}: ${path}`)
            } catch (err) {
              errorCount++
              console.error(`[useTranslationFiles] Failed to load ${path}:`, err)
            }
          })
        )

        setFiles(newFiles)

        if (errorCount > 0) {
          setError(`Failed to load ${errorCount} of ${paths.length} files`)
        }

        console.log(`[useTranslationFiles] Completed: ${loadedCount}/${paths.length} files loaded successfully`)
      } catch (err) {
        console.error('[useTranslationFiles] Error loading files:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    },
    [gitClient, config]
  )

  /**
   * Clear all loaded files
   */
  const clearFiles = useCallback(() => {
    setFiles(new Map())
    setProgress({ loaded: 0, total: 0 })
    setError(null)
  }, [])

  /**
   * Update a file's AST in memory (does not save to Git)
   */
  const updateFileAST = useCallback((path: string, ast: F.Resource) => {
    setFiles(prev => {
      const updated = new Map(prev)
      const existing = updated.get(path)
      if (existing) {
        updated.set(path, {
          ...existing,
          ast,
          content: serializeFTL(ast)
        })
      }
      return updated
    })
  }, [])

  return {
    files,
    isLoading,
    progress,
    error,
    loadFiles,
    updateFileAST,
    clearFiles
  }
}
