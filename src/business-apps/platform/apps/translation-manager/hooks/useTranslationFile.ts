import { useState, useCallback } from 'react'
import { useGitClient, type GitConfig } from '@/common/network/git'
import { parseFTL, serializeFTL } from '../utils/fluent'
import type * as F from '@fluent/syntax'

/**
 * Translation file data with parsed AST
 */
export interface TranslationFile {
  path: string
  locale: string
  content: string
  ast: F.Resource
  sha?: string
  lastModified?: string | null
}

export interface UseTranslationFileResult {
  files: Map<string, TranslationFile>
  isLoading: boolean
  error: string | null
  loadFile: (path: string, branch: string) => Promise<void>
  loadFiles: (paths: string[], branch: string) => Promise<void>
  saveFile: (path: string, ast: F.Resource, branch: string, message: string) => Promise<void>
  updateFileAST: (path: string, ast: F.Resource) => void
  ensureBranch: (branch: string, fromBranch: string) => Promise<void>
  createPullRequest: (head: string, base: string, title: string, body: string) => Promise<any>
}

/**
 * Hook to load and manage individual translation files
 *
 * Handles loading, parsing, and saving .ftl files
 *
 * @param config Git configuration
 * @returns Translation file operations and state
 */
export function useTranslationFile(config: GitConfig | null): UseTranslationFileResult {
  const [files, setFiles] = useState<Map<string, TranslationFile>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create Git client internally
  const gitClient = useGitClient(config)

  /**
   * Load a single translation file
   */
  const loadFile = useCallback(
    async (path: string, branch: string) => {
      if (!gitClient) {
        setError('No Git configuration provided')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log(`[useTranslationFile] Loading file: ${path}`)

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

        const fileData: TranslationFile = {
          path,
          locale,
          content: fileContent.content,
          ast,
          sha: fileContent.sha,
          lastModified
        }

        setFiles(prev => {
          const updated = new Map(prev)
          updated.set(path, fileData)
          return updated
        })

        console.log(`[useTranslationFile] Loaded: ${path} (${locale})`)
      } catch (err) {
        console.error('[useTranslationFile] Error loading file:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    },
    [gitClient]
  )

  /**
   * Load multiple translation files in parallel
   */
  const loadFiles = useCallback(
    async (paths: string[], branch: string) => {
      if (!gitClient) {
        setError('No Git configuration provided')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log(`[useTranslationFile] Loading ${paths.length} files...`)

        // Load all files in parallel
        const results = await Promise.allSettled(
          paths.map(async path => {
            const [fileContent, lastModified] = await Promise.all([
              gitClient.readFile(path, branch),
              gitClient.getLastCommitDate(path, branch)
            ])

            const ast = parseFTL(fileContent.content)
            const filename = path.split('/').pop() || ''
            const locale = filename.replace('.ftl', '')

            return {
              path,
              locale,
              content: fileContent.content,
              ast,
              sha: fileContent.sha,
              lastModified
            } as TranslationFile
          })
        )

        // Process results
        const newFiles = new Map(files)
        let errorCount = 0

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            newFiles.set(result.value.path, result.value)
          } else {
            errorCount++
            console.error(`[useTranslationFile] Failed to load ${paths[index]}:`, result.reason)
          }
        })

        setFiles(newFiles)

        if (errorCount > 0) {
          setError(`Failed to load ${errorCount} of ${paths.length} files`)
        }

        console.log(`[useTranslationFile] Loaded ${results.length - errorCount}/${paths.length} files`)
      } catch (err) {
        console.error('[useTranslationFile] Error loading files:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    },
    [gitClient, files]
  )

  /**
   * Save a translation file back to the repository
   */
  const saveFile = useCallback(
    async (path: string, ast: F.Resource, branch: string, message: string) => {
      if (!gitClient) {
        setError('No Git configuration provided')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log(`[useTranslationFile] Saving file: ${path}`)

        // Serialize AST to FTL
        const content = serializeFTL(ast)

        // Write to repository
        await gitClient.writeFile(branch, path, content, message)

        // Update local cache
        setFiles(prev => {
          const updated = new Map(prev)
          const existing = updated.get(path)

          if (existing) {
            updated.set(path, {
              ...existing,
              content,
              ast
            })
          }

          return updated
        })

        console.log(`[useTranslationFile] Saved: ${path}`)
      } catch (err) {
        console.error('[useTranslationFile] Error saving file:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [gitClient]
  )

  /**
   * Update file AST in memory (without saving)
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

  /**
   * Ensure a branch exists (create if needed)
   */
  const ensureBranch = useCallback(
    async (branch: string, fromBranch: string) => {
      if (!gitClient) throw new Error('No Git configuration provided')
      await gitClient.ensureBranch(branch, fromBranch)
    },
    [gitClient]
  )

  /**
   * Create a pull request
   */
  const createPullRequest = useCallback(
    async (head: string, base: string, title: string, body: string) => {
      if (!gitClient) throw new Error('No Git configuration provided')
      return gitClient.createPullRequest(head, base, title, body)
    },
    [gitClient]
  )

  return {
    files,
    isLoading,
    error,
    loadFile,
    loadFiles,
    saveFile,
    updateFileAST,
    ensureBranch,
    createPullRequest
  }
}
