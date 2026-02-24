/**
 * LockControls Component
 *
 * UI for file locking with manual lock/unlock controls and status display.
 */

import React, { useState } from 'react'
import {
  Button,
  useTranslation,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Alert
} from '@newwork/nw-design-system'

import { Lock, Unlock, AlertCircle, User, Clock } from 'lucide-react'
import sharedTranslations from '../_i18n'
import type { FileLock } from '../types/versioning'
import { formatDistanceToNow } from 'date-fns'

export interface LockControlsMessages {
  fileLocked?: string
  lockedBy?: string
  forceUnlock?: string
  lockedByYou?: string
  unlockFile?: string
  lockFile?: string
  lockFileTitle?: string
  lockDialogTitle?: string
  reasonOptional?: string
  reasonPlaceholder?: string
  durationLabel?: string
  durationHint?: string
  lockInfo?: string
  cancel?: string
  lock?: string
  locking?: string
  confirmUnlock?: string
  confirmForceUnlock?: string
}

export interface LockControlsProps {
  lock: FileLock | null
  isLockedByMe: boolean
  isLocking: boolean
  isUnlocking: boolean
  onLock: (reason?: string, durationMinutes?: number) => Promise<void>
  onUnlock: () => Promise<void>
  onForceUnlock?: () => Promise<void>
  canForceUnlock?: boolean
  messages?: LockControlsMessages
  'data-testid'?: string
}

/**
 * Lock controls with status display and actions
 */
export const LockControls: React.FC<LockControlsProps> = ({
  lock,
  isLockedByMe,
  isLocking,
  isUnlocking,
  onLock,
  onUnlock,
  onForceUnlock,
  canForceUnlock = false,
  messages: messagesProp,
  'data-testid': testId = 'lock-controls'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const defaultLockMessages = {
    fileLocked: t('lock-file-locked'),
    lockedBy: t('lock-locked-by'),
    forceUnlock: t('lock-force-unlock'),
    lockedByYou: t('lock-locked-by-you'),
    unlockFile: t('lock-unlock-file'),
    lockFile: t('lock-lock-file'),
    lockFileTitle: t('lock-file-title'),
    lockDialogTitle: t('lock-dialog-title'),
    reasonOptional: t('lock-reason-optional'),
    reasonPlaceholder: t('lock-reason-placeholder'),
    durationLabel: t('lock-duration-label'),
    durationHint: t('lock-duration-hint'),
    lockInfo: t('lock-info'),
    cancel: t('lock-cancel'),
    lock: t('lock-confirm-button'),
    locking: t('lock-locking'),
    confirmUnlock: t('lock-confirm-unlock'),
    confirmForceUnlock: t('lock-confirm-force-unlock')
  }
  const messages = { ...defaultLockMessages, ...messagesProp }
  const [showLockDialog, setShowLockDialog] = useState(false)
  const [lockReason, setLockReason] = useState('')
  const [lockDuration, setLockDuration] = useState('240') // 4 hours default

  const handleLock = async () => {
    await onLock(lockReason || undefined, parseInt(lockDuration) || 240)
    setLockReason('')
    setShowLockDialog(false)
  }

  const handleUnlock = async () => {
    if (window.confirm(messages.confirmUnlock)) {
      await onUnlock()
    }
  }

  const handleForceUnlock = async () => {
    if (window.confirm(messages.confirmForceUnlock)) {
      await onForceUnlock?.()
    }
  }

  // If locked by someone else, show alert
  if (lock?.isLocked && !isLockedByMe) {
    return (
      <Alert variant="warning" data-testid={`${testId}-locked-alert`}>
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex gba:items-start gba:gap-2">
            <Lock className="gba:h-4 gba:w-4 gba:mt-0.5" />
            <div className="gba:space-y-1">
              <p className="gba:font-medium">{messages.fileLocked}</p>
              <div className="gba:text-sm gba:space-y-0.5">
                {lock.lockedByName && (
                  <p className="gba:flex gba:items-center gba:gap-1">
                    <User className="gba:h-3 gba:w-3" />
                    {messages.lockedBy} {lock.lockedByName}
                  </p>
                )}
                {lock.lockedAt && (
                  <p className="gba:flex gba:items-center gba:gap-1">
                    <Clock className="gba:h-3 gba:w-3" />
                    {formatDistanceToNow(new Date(lock.lockedAt), { addSuffix: true })}
                  </p>
                )}
                {lock.lockReason && (
                  <p className="gba:flex gba:items-start gba:gap-1">
                    <AlertCircle className="gba:h-3 gba:w-3 gba:mt-0.5" />
                    {lock.lockReason}
                  </p>
                )}
              </div>
            </div>
          </div>

          {canForceUnlock && onForceUnlock && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleForceUnlock}
              disabled={isUnlocking}
              data-testid="force-unlock-button"
            >
              {messages.forceUnlock}
            </Button>
          )}
        </div>
      </Alert>
    )
  }

  // Lock/unlock button
  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={testId}>
      {lock?.isLocked && isLockedByMe ? (
        <>
          <Badge variant="default" className="gba:flex gba:items-center gba:gap-1">
            <Lock className="gba:h-3 gba:w-3" />
            {messages.lockedByYou}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnlock}
            disabled={isUnlocking}
            data-testid="unlock-button"
            title={messages.unlockFile}
          >
            <Unlock className="gba:h-4 gba:w-4" />
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLockDialog(true)}
          disabled={isLocking}
          data-testid="lock-button"
          title={messages.lockFileTitle}
        >
          <Lock className="gba:h-4 gba:w-4" />
          {messages.lockFile}
        </Button>
      )}

      {/* Lock dialog */}
      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent className="gba:max-w-md" data-testid="lock-dialog">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Lock className="gba:h-5 gba:w-5" />
              {messages.lockDialogTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-4 gba:py-4">
            <div className="gba:space-y-2">
              <Label htmlFor="lock-reason">{messages.reasonOptional}</Label>
              <Input
                id="lock-reason"
                placeholder={messages.reasonPlaceholder}
                value={lockReason}
                onChange={e => setLockReason(e.target.value)}
                data-testid="lock-reason-input"
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="lock-duration">{messages.durationLabel}</Label>
              <Input
                id="lock-duration"
                type="number"
                min="5"
                max="1440"
                value={lockDuration}
                onChange={e => setLockDuration(e.target.value)}
                data-testid="lock-duration-input"
              />
              <p className="gba:text-sm gba:text-muted-foreground">{messages.durationHint}</p>
            </div>

            <Alert variant="info">
              <AlertCircle className="gba:h-4 gba:w-4" />
              <p className="gba:text-sm">{messages.lockInfo}</p>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLockDialog(false)}
              disabled={isLocking}
              data-testid="lock-cancel-button"
            >
              {messages.cancel}
            </Button>
            <Button onClick={handleLock} disabled={isLocking} data-testid="lock-confirm-button">
              {isLocking ? messages.locking : messages.lock}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
