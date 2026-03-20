import React, { useCallback, useMemo, useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { FileText, History, Lock, Share2, Save, Unlock } from 'lucide-react'
import type { Version } from '@/business-apps/platform/apps/shared/types/versioning'
import { useVersioning } from '@/business-apps/platform/apps/shared/hooks/useVersioning'
import { useFileLock } from '@/business-apps/platform/apps/shared/hooks/useFileLock'
import { VersionHistory } from '@/business-apps/platform/apps/shared/components/VersionHistory'
import { CheckpointDialog } from '@/business-apps/platform/apps/shared/components/CheckpointDialog'
import { SlidesApiService } from '../../services/SlidesApiService'
import { ShareSlideDialog } from '../ShareSlideDialog'
import { ManageSharesDialog } from '../ManageSharesDialog'
import translations from '../../_i18n'

export interface SlideEditorHeaderActionsProps {
  slideId: string
  slideTitle: string
  accessToken?: string
  currentUserId: string
  currentUserName?: string
  /**
   * Apply a restored snapshot to the live editor (Yjs).
   * The snapshot content is typically `{ slides, themeId }` inside `contentJson`.
   */
  applyContentJsonSnapshot: (contentJson: Record<string, unknown>) => Promise<void> | void
  'data-testid'?: string
}

export const SlideEditorHeaderActions: React.FC<SlideEditorHeaderActionsProps> = ({
  slideId,
  slideTitle,
  accessToken,
  currentUserId,
  currentUserName,
  applyContentJsonSnapshot,
  'data-testid': testId = 'slide-editor-header-actions'
}) => {
  const { t } = useTranslation(translations)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showManageShares, setShowManageShares] = useState(false)

  const versioning = useVersioning({
    entityId: slideId,
    entityType: 'slide',
    apiService: SlidesApiService,
    autoSaveEnabled: false
  })

  const fileLock = useFileLock({
    entityId: slideId,
    entityType: 'slide',
    currentUserId,
    apiService: SlidesApiService
  })

  const shareSlide = useCallback(async (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment') => {
    return SlidesApiService.shareSlide(
      id,
      userIds.map(userId => ({ userId, permission }))
    )
  }, [])

  const currentVersionNumber = useMemo(() => {
    return versioning.versions?.[0]?.version
  }, [versioning.versions])

  const handleRestore = useCallback(
    async (versionNumber: number) => {
      const snapshot = await SlidesApiService.getVersion(slideId, versionNumber)
      const contentJson = (snapshot?.contentJson as Record<string, unknown> | undefined) || null
      if (!contentJson) return
      await applyContentJsonSnapshot(contentJson)
      setShowVersionHistory(false)
    },
    [applyContentJsonSnapshot, slideId]
  )

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={testId}>
      {/* Compact lock indicator */}
      {fileLock.lock?.isLocked && fileLock.isLockedByMe && (
        <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
          <Lock className="gba:h-3 gba:w-3" />
          Locked
        </span>
      )}

      <Separator orientation="vertical" className="gba:h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid={`${testId}-menu-trigger`}>
            <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('header-slide')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={async () => {
              await versioning.loadVersions()
              setShowVersionHistory(true)
            }}
            data-testid={`${testId}-version-history`}
          >
            <History className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('header-version-history')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowCheckpointDialog(true)} data-testid={`${testId}-checkpoint`}>
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('header-save-checkpoint')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {fileLock.isLockedByMe ? (
            <DropdownMenuItem onClick={() => fileLock.releaseLock()} data-testid={`${testId}-unlock`}>
              <Unlock className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('header-unlock-slide')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => fileLock.acquireLock()} data-testid={`${testId}-lock`}>
              <Lock className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('header-lock-slide')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowShareDialog(true)} data-testid={`${testId}-share`}>
            <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('header-share')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowManageShares(true)} data-testid={`${testId}-manage-shares`}>
            <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('header-manage-access')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showVersionHistory && (
        <VersionHistory
          versions={versioning.versions as Version[]}
          isLoading={versioning.isLoading}
          onRestore={handleRestore}
          onClose={() => setShowVersionHistory(false)}
          currentVersion={currentVersionNumber}
          showAutoSaves={false}
          data-testid={`${testId}-version-history-dialog`}
        />
      )}

      <CheckpointDialog
        isOpen={showCheckpointDialog}
        onClose={() => setShowCheckpointDialog(false)}
        isSaving={versioning.isSaving}
        onSave={async description => {
          await versioning.createCheckpoint(description)
        }}
        data-testid={`${testId}-checkpoint-dialog`}
      />

      <ShareSlideDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        slideId={slideId}
        slideTitle={slideTitle}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        accessToken={accessToken}
        shareSlide={shareSlide}
        onShareComplete={() => {
          setShowShareDialog(false)
        }}
        data-testid={`${testId}-share-dialog`}
      />

      <ManageSharesDialog
        open={showManageShares}
        onOpenChange={setShowManageShares}
        slideId={slideId}
        slideTitle={slideTitle}
        accessToken={accessToken}
        onSharesChanged={() => undefined}
        onAddMoreUsers={() => {
          setShowManageShares(false)
          setShowShareDialog(true)
        }}
        data-testid={`${testId}-manage-shares-dialog`}
      />
    </div>
  )
}
