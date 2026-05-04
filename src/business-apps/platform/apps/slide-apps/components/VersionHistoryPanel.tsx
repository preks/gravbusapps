/**
 * VersionHistoryPanel Component
 *
 * Displays version history for a presentation.
 * Allows viewing and restoring previous versions.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Spinner,
  Badge,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { Clock, RotateCcw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import translations from '../_i18n'

export interface SlideVersion {
  id: string
  version: number
  createdAt: string
  createdBy: string
  description?: string
  isCheckpoint: boolean
}

export interface VersionHistoryPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slideId: string
  slideTitle: string
  accessToken: string
  /** Callback when a version is restored */
  onVersionRestored?: () => void
  'data-testid'?: string
}

/** Create formatDate using t for relative time strings */
const createFormatDate = (t: (key: string, vars?: Record<string, unknown>) => string) => {
  return (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t('time-just-now')
    if (diffMins < 60) return t('time-minutes-ago', { count: diffMins })
    if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
    if (diffDays === 1) return t('time-yesterday')
    if (diffDays < 7) return t('time-days-short-ago', { count: diffDays })
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }
}

/**
 * VersionHistoryPanel Component
 */
export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  open,
  onOpenChange,
  slideId,
  slideTitle,
  onVersionRestored,
  'data-testid': testId = 'version-history-panel'
}) => {
  const { t } = useTranslation(translations)
  const resolvedSlideTitle = slideTitle || t('title-untitled-slide')
  const formatDate = createFormatDate(t)
  const [versions, setVersions] = useState<SlideVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null)

  useEffect(() => {
    if (open && slideId) {
      loadVersions()
    }
  }, [open, slideId, loadVersions])

  const loadVersions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // TODO: Implement versioning API when backend supports it
      // For now, show placeholder
      setVersions([
        {
          id: '1',
          version: 1,
          createdAt: new Date().toISOString(),
          createdBy: 'current',
          description: t('version-current-description'),
          isCheckpoint: true
        }
      ])
    } catch (err) {
      console.error('[VersionHistoryPanel] Failed to load versions:', err)
      setError(err instanceof Error ? err.message : t('version-load-failed'))
    } finally {
      setIsLoading(false)
    }
  }, [slideId, t])

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      if (!window.confirm(t('version-restore-confirm'))) return

      setRestoringVersionId(versionId)
      try {
        // TODO: Implement restore API when backend supports it
        toast.success(t('version-restored'))
        onVersionRestored?.()
        onOpenChange(false)
      } catch (err) {
        console.error('[VersionHistoryPanel] Failed to restore version:', err)
        toast.error(t('version-restore-failed'))
      } finally {
        setRestoringVersionId(null)
      }
    },
    [onVersionRestored, onOpenChange, t]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[80vh]" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Clock className="gba:w-5 gba:h-5" />
            {t('version-history-title')}
          </DialogTitle>
          <DialogDescription>{t('version-description', { title: resolvedSlideTitle })}</DialogDescription>
        </DialogHeader>

        <div className="gba:py-4 gba:space-y-4 gba:overflow-y-auto">
          {error && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-destructive/10 gba:text-destructive">
              <AlertCircle className="gba:w-4 gba:h-4 gba:shrink-0" />
              <span className="gba:text-sm">{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Spinner size="lg" />
            </div>
          ) : versions.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:text-center">
              <Clock className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mb-4" />
              <p className="gba:text-muted-foreground">{t('version-no-history')}</p>
            </div>
          ) : (
            <div className="gba:space-y-3">
              {versions.map((version, index) => (
                <div key={version.id}>
                  <div
                    className="gba:flex gba:items-start gba:gap-4 gba:p-4 gba:rounded-lg gba:bg-muted/30 gba:border"
                    data-testid={`${testId}-version-${version.id}`}
                  >
                    <div className="gba:flex-1">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                        <span className="gba:text-sm gba:font-medium">
                          {t('version-number', { number: version.version })}
                        </span>
                        {index === 0 && <Badge variant="success">{t('version-current')}</Badge>}
                        {version.isCheckpoint && <Badge variant="secondary">{t('version-checkpoint')}</Badge>}
                      </div>
                      {version.description && (
                        <p className="gba:text-sm gba:text-muted-foreground gba:mb-2">{version.description}</p>
                      )}
                      <p className="gba:text-xs gba:text-muted-foreground">{formatDate(version.createdAt)}</p>
                    </div>

                    {index > 0 && (
                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={() => handleRestoreVersion(version.id)}
                        disabled={restoringVersionId === version.id}
                        data-testid={`${testId}-restore-${version.id}`}
                      >
                        {restoringVersionId === version.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <RotateCcw className="gba:w-3 gba:h-3 gba:mr-1" />
                        )}
                        {t('version-restore')}
                      </Button>
                    )}
                  </div>
                  {index < versions.length - 1 && <Separator className="gba:my-2" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="default" onClick={() => onOpenChange(false)}>
            {t('version-close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default VersionHistoryPanel
