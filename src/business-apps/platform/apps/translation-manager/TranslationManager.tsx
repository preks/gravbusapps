import React, { useMemo, useEffect } from 'react'
import { Card, CardContent, Button, Alert, AlertDescription, Progress } from '@newwork/nw-design-system'
import ThreeColumnLayout from './components/ThreeColumnLayout'
import type { GitConfig } from '@/common/network/git'
import { useTranslationTree } from './hooks/useTranslationTree'
import { useTranslationFiles } from './hooks/useTranslationFiles'
import { env } from '@/common/env/EnvUtils'

export type CommitTemplates = {
  branchTemplate: string
  messageTemplate: string
  prTitleTemplate: string
  prBodyTemplate: string
  autoMerge: boolean
  mergeMethod: 'merge' | 'squash' | 'rebase'
}

// Re-export GitConfig as TranslationConfig for backward compatibility
export type TranslationConfig = GitConfig

export interface TranslationManagerProps {
  initial?: Partial<GitConfig>
}

// Load configuration from environment variables
function getEnvConfig(): GitConfig | null {
  // Try Bitbucket first
  const bitbucketWorkspace = env('NEXT_PUBLIC_BITBUCKET_WORKSPACE')
  const bitbucketRepo = env('NEXT_PUBLIC_BITBUCKET_REPO')
  const bitbucketToken = env('NEXT_PUBLIC_BITBUCKET_TOKEN')
  const bitbucketBranch = env('NEXT_PUBLIC_BITBUCKET_BRANCH')
  const bitbucketEmail = env('NEXT_PUBLIC_BITBUCKET_EMAIL')
  const bitbucketUsername = env('NEXT_PUBLIC_BITBUCKET_USERNAME')

  if (bitbucketWorkspace && bitbucketRepo && bitbucketToken && bitbucketEmail) {
    return {
      provider: 'bitbucket',
      workspace: bitbucketWorkspace,
      repo: bitbucketRepo,
      token: bitbucketToken,
      email: bitbucketEmail,
      username: bitbucketUsername,
      branch: bitbucketBranch || 'develop'
    }
  }

  // Try GitHub as fallback
  const githubOwner = env('NEXT_PUBLIC_GITHUB_OWNER')
  const githubRepo = env('NEXT_PUBLIC_GITHUB_REPO')
  const githubToken = env('NEXT_PUBLIC_GITHUB_TOKEN')
  const githubBranch = env('NEXT_PUBLIC_GITHUB_BRANCH')

  if (githubOwner && githubRepo && githubToken) {
    return {
      provider: 'github',
      workspace: githubOwner,
      repo: githubRepo,
      token: githubToken,
      branch: githubBranch || 'main'
    }
  }

  return null
}

const TranslationManager: React.FC<TranslationManagerProps> = ({ initial }) => {
  // Stable config with useMemo
  const config = useMemo(() => {
    const envConfig = getEnvConfig()
    if (!envConfig && !initial) return null
    if (!envConfig) return initial as GitConfig
    if (!initial) return envConfig
    return { ...envConfig, ...initial } as GitConfig
  }, [initial])

  // Use translation tree hook
  const translationTree = useTranslationTree(config, config?.branch || 'main')

  // Use translation files hook (for parallel loading progress)
  const translationFiles = useTranslationFiles(config)

  // Load ALL files immediately after tree is loaded (ONCE!)
  useEffect(() => {
    if (!translationTree.isLoading && translationTree.scopes.length > 0 && config) {
      const allFiles = translationTree.scopes.flatMap(s => s.files)
      console.log('[TranslationManager] Loading all files:', allFiles.length)
      translationFiles.loadFiles(allFiles, config.branch)
    }
  }, [translationTree.isLoading, translationTree.scopes.length, config?.branch]) // ← NO translationFiles!

  const handleRefresh = () => {
    window.location.reload()
  }

  // Calculate progress percentage
  const progressPercent =
    translationFiles.progress.total > 0 ? (translationFiles.progress.loaded / translationFiles.progress.total) * 100 : 0

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:p-6 gba:h-full">
      {/* Header with status and refresh */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <h1 className="gba:text-2xl gba:font-bold">Translation Manager</h1>
          {config && (
            <p className="gba:text-sm gba:text-muted-foreground">
              {config.provider} · {config.workspace}/{config.repo} · {config.branch}
            </p>
          )}
        </div>
        <Button onClick={handleRefresh} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Error display */}
      {translationTree.error && (
        <Alert variant="destructive">
          <AlertDescription>{translationTree.error}</AlertDescription>
        </Alert>
      )}

      {/* Global Progress Bar beim initialen Laden */}
      {translationFiles.isLoading && (
        <Card>
          <CardContent className="gba:py-6">
            <div className="gba:space-y-2">
              <div className="gba:flex gba:justify-between gba:text-sm gba:text-muted-foreground">
                <span>Lade alle Übersetzungsdateien...</span>
                <span>
                  {translationFiles.progress.loaded} / {translationFiles.progress.total}
                </span>
              </div>
              <Progress value={progressPercent} className="gba:w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      {!config ? (
        <Alert variant="destructive">
          <AlertDescription>
            Keine Verbindung. Bitte ENV Variablen konfigurieren:
            <ul className="gba:list-disc gba:list-inside gba:mt-2 gba:text-xs">
              <li>NEXT_PUBLIC_BITBUCKET_WORKSPACE</li>
              <li>NEXT_PUBLIC_BITBUCKET_REPO</li>
              <li>NEXT_PUBLIC_BITBUCKET_EMAIL</li>
              <li>NEXT_PUBLIC_BITBUCKET_TOKEN</li>
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="gba:flex-1 gba:overflow-hidden">
          <ThreeColumnLayout
            scopes={translationTree.scopes}
            translationFiles={translationFiles}
            isLoading={translationTree.isLoading}
            branch={config.branch}
          />
        </div>
      )}
    </div>
  )
}

export default TranslationManager
