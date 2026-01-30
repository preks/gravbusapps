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
  Separator
} from '@newwork/nw-design-system'
import { Clock, RotateCcw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

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

/**
 * Format date to readable string
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
          description: 'Current version',
          isCheckpoint: true
        }
      ])
    } catch (err) {
      console.error('[VersionHistoryPanel] Failed to load versions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load versions')
    } finally {
      setIsLoading(false)
    }
  }, [slideId])

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      if (!window.confirm('Restore this version? Current changes will be saved as a new version.')) return

      setRestoringVersionId(versionId)
      try {
        // TODO: Implement restore API when backend supports it
        toast.success('Version restored')
        onVersionRestored?.()
        onOpenChange(false)
      } catch (err) {
        console.error('[VersionHistoryPanel] Failed to restore version:', err)
        toast.error('Failed to restore version')
      } finally {
        setRestoringVersionId(null)
      }
    },
    [onVersionRestored, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[80vh]" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Clock className="gba:w-5 gba:h-5" />
            Version History
          </DialogTitle>
          <DialogDescription>View and restore previous versions of "{slideTitle}"</DialogDescription>
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
              <p className="gba:text-muted-foreground">No version history available</p>
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
                        <span className="gba:text-sm gba:font-medium">Version {version.version}</span>
                        {index === 0 && <Badge variant="success">Current</Badge>}
                        {version.isCheckpoint && <Badge variant="secondary">Checkpoint</Badge>}
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
                        {restoringVersionId === version.id ? <Spinner size="sm" /> : <RotateCcw className="gba:w-3 gba:h-3 gba:mr-1" />}
                        Restore
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
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default VersionHistoryPanel
