import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGitClient, type GitConfig } from '@/common/network/git'

/**
 * Translation tree structure for organizing translation files
 */
export interface TranslationScope {
  path: string // Full path to scope directory (e.g., "src/business-apps/hr/core/apps/employee-record")
  name: string // Display name (e.g., "employee-record")
  module: string // Module name (e.g., "hr")
  subModule: string // Sub-module (e.g., "core")
  files: string[] // List of .ftl files in this scope
}

export interface UseTranslationTreeResult {
  scopes: TranslationScope[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to load translation file tree structure from Git repository
 *
 * Scans for all _i18n directories and their .ftl files
 *
 * @param config Git configuration
 * @param branch Branch to scan
 * @returns Translation tree data, loading state, and refetch function
 */
export function useTranslationTree(config: GitConfig | null, branch: string): UseTranslationTreeResult {
  const [scopes, setScopes] = useState<TranslationScope[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create Git client internally - stable reference
  const gitClient = useGitClient(config)

  // Stable config key for useEffect dependency
  const configKey = useMemo(
    () => (config ? `${config.provider}:${config.workspace}:${config.repo}:${config.branch}` : null),
    [config]
  )

  const loadTree = useCallback(async () => {
    if (!gitClient || !config) {
      console.log('[useTranslationTree] No Git client or config')
      setScopes([])
      setIsLoading(false)
      setError('No Git configuration provided')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[useTranslationTree] Loading tree from branch:', branch)

      // Get all entries from the repository
      const entries = await gitClient.getTree(branch, 'src/business-apps')

      console.log('[useTranslationTree] Received entries:', entries.length)

      // Find all _i18n directories (Bitbucket uses 'commit_directory', GitHub uses 'tree')
      const i18nDirs = entries.filter(
        t =>
          (t.type === 'tree' || t.type === 'commit_directory') &&
          t.path.endsWith('/_i18n') &&
          t.path.includes('src/business-apps')
      )

      console.log(
        '[useTranslationTree] Found _i18n directories:',
        i18nDirs.length,
        i18nDirs.map(d => d.path)
      )

      const scopeList: TranslationScope[] = []

      for (const dir of i18nDirs) {
        const scopePath = dir.path.replace(/\/_i18n$/, '')

        // Get all .ftl files in this _i18n directory (Bitbucket uses 'commit_file', GitHub uses 'blob')
        const files = entries
          .filter(
            t =>
              (t.type === 'blob' || t.type === 'commit_file') &&
              t.path.startsWith(dir.path + '/') &&
              t.path.endsWith('.ftl')
          )
          .map(f => f.path)
          .sort()

        console.log(`[useTranslationTree] Scope ${scopePath}: found ${files.length} .ftl files`)

        if (files.length === 0) continue

        // Parse path: src/business-apps/<module>/<sub-module>/...
        const pathParts = scopePath.split('/')
        const businessAppsIndex = pathParts.indexOf('business-apps')

        if (businessAppsIndex < 0) continue

        // Get module and subModule (or use defaults for root)
        const module = pathParts[businessAppsIndex + 1] || '_root'
        const subModule = pathParts[businessAppsIndex + 2] || '_root'
        const name = pathParts[pathParts.length - 1]

        scopeList.push({
          path: scopePath,
          name,
          module,
          subModule,
          files
        })
      }

      // Sort by module, then subModule, then name
      scopeList.sort((a, b) => {
        if (a.module !== b.module) return a.module.localeCompare(b.module)
        if (a.subModule !== b.subModule) return a.subModule.localeCompare(b.subModule)
        return a.name.localeCompare(b.name)
      })

      console.log('[useTranslationTree] Final result: found', scopeList.length, 'scopes')

      setScopes(scopeList)
      setError(null)
    } catch (err) {
      console.error('[useTranslationTree] Error loading tree:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setScopes([])
    } finally {
      setIsLoading(false)
    }
  }, [gitClient, config, branch])

  // Load tree when config changes - use configKey for stable dependency
  useEffect(() => {
    console.log('[useTranslationTree] useEffect triggered, configKey:', configKey)
    if (configKey) {
      loadTree()
    }
  }, [configKey, loadTree])

  return {
    scopes,
    isLoading,
    error,
    refetch: loadTree
  }
}
