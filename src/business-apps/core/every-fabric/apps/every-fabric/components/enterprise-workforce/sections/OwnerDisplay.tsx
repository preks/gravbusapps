// Read-only owner presentation for the Role & ownership card: avatar + name +
// role (job position), resolved from the agent's owner_user_id. Falls back to a
// truncated id while loading / when the user can't be resolved, and to an empty
// hint when no owner is set.

import React from 'react'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import type { OwnerEmployee } from '../../../hooks/useOwnerEmployee'

interface OwnerDisplayProps {
  owner: OwnerEmployee | null
  loading: boolean
  /** Raw owner_user_id, used as a fallback label when the lookup fails. */
  ownerUserId?: string | null
  /** Shown when no owner is assigned. */
  emptyLabel: string
  'data-testid'?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function normalizeAvatarSrc(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('data:') || trimmed.startsWith('http') || trimmed.startsWith('/')) {
    return trimmed
  }
  return `data:image/png;base64,${trimmed}`
}

export const OwnerDisplay: React.FC<OwnerDisplayProps> = ({
  owner,
  loading,
  ownerUserId,
  emptyLabel,
  'data-testid': dataTestId
}) => {
  const trimmedId = ownerUserId?.trim()

  if (!trimmedId) {
    return (
      <p className="gba:flex gba:h-10 gba:items-center gba:text-sm gba:text-muted-foreground" data-testid={dataTestId}>
        {emptyLabel}
      </p>
    )
  }

  const name = owner?.displayName ?? `${trimmedId.slice(0, 8)}…`
  const initials = owner ? getInitials(owner.displayName) : '?'

  return (
    <div className="gba:flex gba:items-center gba:gap-2.5" data-testid={dataTestId}>
      <div className="gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:overflow-hidden gba:rounded-full gba:bg-muted">
        {owner?.pictureThumbnail ? (
          <img
            src={normalizeAvatarSrc(owner.pictureThumbnail)}
            alt={owner.displayName}
            className="gba:h-full gba:w-full gba:object-cover"
            onError={e => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : loading ? (
          <SpinnerGapIcon className="gba:h-4 gba:w-4 gba:animate-spin gba:text-muted-foreground" />
        ) : (
          <span className="gba:select-none gba:text-[11px] gba:font-semibold gba:text-muted-foreground">
            {initials}
          </span>
        )}
      </div>
      <div className="gba:min-w-0">
        <p
          className={`gba:truncate gba:text-sm gba:font-medium ${
            owner ? 'gba:text-foreground' : 'gba:font-mono gba:text-muted-foreground'
          }`}
          title={owner ? owner.displayName : trimmedId}
        >
          {name}
        </p>
        {owner?.jobTitle && <p className="gba:truncate gba:text-xs gba:text-muted-foreground">{owner.jobTitle}</p>}
      </div>
    </div>
  )
}
