import React, { useMemo, useEffect, useState } from 'react'
import { Card, CardContent, Button, Alert, AlertDescription, Progress } from '@newwork/nw-design-system'
import ThreeColumnLayout from './components/ThreeColumnLayout'
import ReviewStatusBar from './components/ReviewStatusBar'
import type { GitConfig } from '@/common/network/git'
import { useGitClient } from '@/common/network/git'
import { useTranslationTree } from './hooks/useTranslationTree'
import { useTranslationFiles } from './hooks/useTranslationFiles'
import { useSaveTranslations } from './hooks/useSaveTranslations'
import { usePublishTranslations } from './hooks/usePublishTranslations'
import { getAllTouchedFiles, getReviewedKeysForFile } from './hooks/useTranslationCache'
import { env } from '@/common/env/EnvUtils'

const REVIEW_BRANCH = 'feature/NO-TICKET_translation_review'

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Stable config with useMemo
  const config = useMemo(() => {
    const envConfig = getEnvConfig()
    if (!envConfig && !initial) return null
    if (!envConfig) return initial as GitConfig
    if (!initial) return envConfig
    return { ...envConfig, ...initial } as GitConfig
  }, [initial])

  // Git client
  const gitClient = useGitClient(config)

  // Use translation tree hook
  const translationTree = useTranslationTree(config, config?.branch || 'main')

  // Use translation files hook (for parallel loading progress)
  const translationFiles = useTranslationFiles(config)

  // Use save and publish hooks
  const { save, isSaving, error: saveError } = useSaveTranslations(config, translationFiles)
  const { publish, isPublishing, error: publishError } = usePublishTranslations(config, translationFiles)

  // Calculate review status
  const { overallStatus, branchStatus } = useMemo(() => {
    const touchedFiles = getAllTouchedFiles()

    // Overall status (all files in repo)
    const allFiles = translationFiles.files
    const totalFiles = allFiles.size
    const filesWithMeta = Array.from(allFiles.values()).filter(f => f.meta)
    const reviewedFiles = filesWithMeta.filter(f => !f.needsReview).length
    const needsReview = filesWithMeta.filter(f => f.needsReview).length

    // Branch status (only touched files)
    const touchedFilesCount = touchedFiles.length
    const reviewedTouchedFiles = touchedFiles.filter(filePath => {
      const file = allFiles.get(filePath)
      if (!file) return false

      // File is reviewed if all keys are marked as reviewed
      const reviewedKeys = getReviewedKeysForFile(filePath)
      const allKeys = [...file.ast.body].filter((e: any) => e.type === 'Message').map((e: any) => e.id.name)

      return allKeys.length > 0 && allKeys.every(key => reviewedKeys.includes(key))
    }).length

    const canCreatePR = touchedFilesCount > 0 && reviewedTouchedFiles === touchedFilesCount

    return {
      overallStatus: { totalFiles, reviewedFiles, needsReview },
      branchStatus: { touchedFiles: touchedFilesCount, reviewedFiles: reviewedTouchedFiles, canCreatePR }
    }
  }, [translationFiles.files])

  // Ensure review branch exists on mount
  useEffect(() => {
    if (gitClient && config) {
      gitClient.ensureBranch(REVIEW_BRANCH, config.branch).catch(err => {
        console.error('[TranslationManager] Failed to ensure review branch:', err)
      })
    }
  }, [gitClient, config])

  // Load ALL files immediately after tree is loaded (ONCE!)
  useEffect(() => {
    if (!translationTree.isLoading && translationTree.scopes.length > 0 && config) {
      const allFiles = translationTree.scopes.flatMap(s => s.files)
      console.log('[TranslationManager] Loading all files:', allFiles.length)
      translationFiles.loadFiles(allFiles, config.branch)
    }
  }, [translationTree.isLoading, translationTree.scopes.length, config?.branch]) // ← NO translationFiles!

  // Handle commit (save + push)
  const handleCommit = async () => {
    try {
      await save()
      setSuccessMessage(`✓ Changes committed to ${REVIEW_BRANCH}`)
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      console.error('[TranslationManager] Commit failed:', err)
    }
  }

  // Handle PR creation (save + push + PR)
  const handleCreatePR = async () => {
    try {
      const result = await publish()
      setSuccessMessage(`✓ PR created: ${result.prUrl}`)
      setTimeout(() => setSuccessMessage(null), 10000)
    } catch (err) {
      console.error('[TranslationManager] PR creation failed:', err)
    }
  }

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

      {/* Review Status Bar */}
      {!translationFiles.isLoading && (
        <ReviewStatusBar
          overallStatus={overallStatus}
          branchStatus={branchStatus}
          onCommit={handleCommit}
          onCreatePR={handleCreatePR}
          isCommitting={isSaving}
          isCreatingPR={isPublishing}
        />
      )}

      {/* Success message */}
      {successMessage && (
        <Alert variant="default">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error messages */}
      {(saveError || publishError) && (
        <Alert variant="destructive">
          <AlertDescription>{saveError || publishError}</AlertDescription>
        </Alert>
      )}

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
