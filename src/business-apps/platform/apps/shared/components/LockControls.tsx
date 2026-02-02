/**
 * LockControls Component
 *
 * UI for file locking with manual lock/unlock controls and status display.
 */

import React, { useState } from 'react'
import {
  Button,
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
import type { FileLock } from '../types/versioning'
import { formatDistanceToNow } from 'date-fns'

export interface LockControlsProps {
  lock: FileLock | null
  isLockedByMe: boolean
  isLocking: boolean
  isUnlocking: boolean
  onLock: (reason?: string, durationMinutes?: number) => Promise<void>
  onUnlock: () => Promise<void>
  onForceUnlock?: () => Promise<void>
  canForceUnlock?: boolean
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
  'data-testid': testId = 'lock-controls'
}) => {
  const [showLockDialog, setShowLockDialog] = useState(false)
  const [lockReason, setLockReason] = useState('')
  const [lockDuration, setLockDuration] = useState('240') // 4 hours default

  const handleLock = async () => {
    await onLock(lockReason || undefined, parseInt(lockDuration) || 240)
    setLockReason('')
    setShowLockDialog(false)
  }

  const handleUnlock = async () => {
    if (window.confirm('Are you sure you want to unlock this file?')) {
      await onUnlock()
    }
  }

  const handleForceUnlock = async () => {
    if (
      window.confirm(
        'Are you sure you want to force unlock this file? This will remove the lock acquired by another user.'
      )
    ) {
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
              <p className="gba:font-medium">File is locked</p>
              <div className="gba:text-sm gba:space-y-0.5">
                {lock.lockedByName && (
                  <p className="gba:flex gba:items-center gba:gap-1">
                    <User className="gba:h-3 gba:w-3" />
                    Locked by {lock.lockedByName}
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
              Force Unlock
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
            Locked by you
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnlock}
            disabled={isUnlocking}
            data-testid="unlock-button"
            title="Unlock file"
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
          title="Lock file to prevent others from editing"
        >
          <Lock className="gba:h-4 gba:w-4" />
          Lock
        </Button>
      )}

      {/* Lock dialog */}
      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent className="gba:max-w-md" data-testid="lock-dialog">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Lock className="gba:h-5 gba:w-5" />
              Lock File
            </DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-4 gba:py-4">
            <div className="gba:space-y-2">
              <Label htmlFor="lock-reason">Reason (Optional)</Label>
              <Input
                id="lock-reason"
                placeholder="e.g., Working on major changes"
                value={lockReason}
                onChange={e => setLockReason(e.target.value)}
                data-testid="lock-reason-input"
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="lock-duration">Lock Duration (minutes)</Label>
              <Input
                id="lock-duration"
                type="number"
                min="5"
                max="1440"
                value={lockDuration}
                onChange={e => setLockDuration(e.target.value)}
                data-testid="lock-duration-input"
              />
              <p className="gba:text-sm gba:text-muted-foreground">
                Lock will automatically expire after this duration (default: 240 minutes / 4 hours)
              </p>
            </div>

            <Alert variant="info">
              <AlertCircle className="gba:h-4 gba:w-4" />
              <p className="gba:text-sm">
                While locked, other users will only be able to view the file. Collaboration features will be disabled.
              </p>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLockDialog(false)}
              disabled={isLocking}
              data-testid="lock-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleLock} disabled={isLocking} data-testid="lock-confirm-button">
              {isLocking ? 'Locking...' : 'Lock File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
