import React, { useState, useEffect } from 'react'
import { Loader2, Database } from 'lucide-react'
import { getAllIndexingStatus, IndexingStatus } from '../api/adminClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface IndexingProgressProps {
  /** Compact mode for inline display */
  compact?: boolean
  /** Show even when not actively indexing */
  showWhenIdle?: boolean
}

export const IndexingProgress: React.FC<IndexingProgressProps> = ({ compact = false, showWhenIdle = false }) => {
  const [statuses, setStatuses] = useState<IndexingStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null
    let slowPollInterval: NodeJS.Timeout | null = null
    let mounted = true

    const loadStatus = async () => {
      try {
        const data = await getAllIndexingStatus()
        if (mounted) {
          setStatuses(data)
          setLoading(false)

          // Check if any indexing is in progress
          const hasActiveIndexing = data.some(
            s => s.progress && ['scanning', 'parsing', 'embedding', 'storing'].includes(s.progress.status)
          )

          // If active indexing, poll more frequently
          if (hasActiveIndexing && !pollInterval) {
            pollInterval = setInterval(loadStatus, 2000)
          } else if (!hasActiveIndexing && pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        }
      } catch {
        if (mounted) setLoading(false)
      }
    }

    loadStatus()
    slowPollInterval = setInterval(loadStatus, 15000)

    return () => {
      mounted = false
      if (pollInterval) clearInterval(pollInterval)
      if (slowPollInterval) clearInterval(slowPollInterval)
    }
  }, [])

  // Find active indexing operations
  const activeIndexing = statuses.filter(
    s => s.progress && ['scanning', 'parsing', 'embedding', 'storing'].includes(s.progress.status)
  )

  // Get status label
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'scanning':
        return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.indexing.scanning', 'Scanning files')
      case 'parsing':
        return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.indexing.parsing', 'Parsing code')
      case 'embedding':
        return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.indexing.embedding', 'Generating embeddings')
      case 'storing':
        return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.indexing.storing', 'Saving to database')
      default:
        return status
    }
  }

  // Don't render if loading or no active indexing (unless showWhenIdle)
  if (loading) return null

  if (activeIndexing.length === 0) {
    if (!showWhenIdle) return null

    // Show idle status
    const readyCount = statuses.filter(s => s.indexStatus === 'indexed').length
    const notInitCount = statuses.filter(s => !s.repoId).length

    if (readyCount === 0 && notInitCount === 0) return null

    if (compact) {
      return (
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          <Database className="gba:w-3 gba:h-3" />
          <span>
            {readyCount} {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.indexing.indexed', 'indexed')}
          </span>
        </div>
      )
    }

    return null
  }

  // Aggregate progress across all active operations
  const totalFiles = activeIndexing.reduce((sum, s) => sum + (s.progress?.totalFiles || 0), 0)
  const processedFiles = activeIndexing.reduce((sum, s) => sum + (s.progress?.processedFiles || 0), 0)
  const percent = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0

  // Get the most relevant status message
  const primaryStatus = activeIndexing[0]
  const statusText = primaryStatus.progress
    ? getStatusLabel(primaryStatus.progress.status)
    : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.indexing.indexing', 'Indexing')
  const repoName = `${primaryStatus.owner}/${primaryStatus.name}`

  if (compact) {
    return (
      <div className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:bg-primary/5 gba:rounded-lg gba:border gba:border-primary/20">
        <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-primary" />
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <span className="gba:text-xs gba:font-medium gba:text-foreground gba:truncate">
              {statusText}: {repoName}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:flex-shrink-0">{percent}%</span>
          </div>
          <div className="gba:w-full gba:bg-muted gba:rounded-full gba:h-1 gba:mt-1">
            <div
              className="gba:bg-primary gba:h-1 gba:rounded-full gba:transition-all gba:duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Full banner mode
  return (
    <div className="gba:bg-gradient-to-r gba:from-primary/10 gba:via-primary/5 gba:to-primary/10 gba:border-b gba:border-primary/20">
      <div className="gba:container gba:mx-auto gba:px-6 gba:py-3">
        <div className="gba:flex gba:items-center gba:gap-4">
          <div className="gba:flex gba:items-center gba:justify-center">
            <div className="gba:relative">
              <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-primary" />
              </div>
            </div>
          </div>

          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-sm gba:font-medium gba:text-foreground">{statusText}</span>
                <span className="gba:text-sm gba:text-muted-foreground">{repoName}</span>
                {activeIndexing.length > 1 && (
                  <span className="gba:text-xs gba:text-muted-foreground">(+{activeIndexing.length - 1} more)</span>
                )}
              </div>
              <span className="gba:text-sm gba:text-muted-foreground">
                {processedFiles}/{totalFiles} files ({percent}%)
              </span>
            </div>
            <div className="gba:w-full gba:bg-muted gba:rounded-full gba:h-2">
              <div
                className="gba:bg-primary gba:h-2 gba:rounded-full gba:transition-all gba:duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            {primaryStatus.progress?.currentFile && (
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:truncate">
                {primaryStatus.progress.currentFile}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to get indexing status
 */
export function useIndexingStatus() {
  const [statuses, setStatuses] = useState<IndexingStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isIndexing, setIsIndexing] = useState(false)

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null
    let slowPollInterval: NodeJS.Timeout | null = null
    let mounted = true

    const loadStatus = async () => {
      try {
        const data = await getAllIndexingStatus()
        if (mounted) {
          setStatuses(data)
          setLoading(false)

          const hasActiveIndexing = data.some(
            s => s.progress && ['scanning', 'parsing', 'embedding', 'storing'].includes(s.progress.status)
          )
          setIsIndexing(hasActiveIndexing)

          if (hasActiveIndexing && !pollInterval) {
            pollInterval = setInterval(loadStatus, 2000)
          } else if (!hasActiveIndexing && pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        }
      } catch {
        if (mounted) setLoading(false)
      }
    }

    loadStatus()
    slowPollInterval = setInterval(loadStatus, 15000)

    return () => {
      mounted = false
      if (pollInterval) clearInterval(pollInterval)
      if (slowPollInterval) clearInterval(slowPollInterval)
    }
  }, [])

  return { statuses, loading, isIndexing }
}
