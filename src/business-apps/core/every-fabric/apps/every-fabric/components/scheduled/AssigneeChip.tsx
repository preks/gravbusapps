/**
 * Renders a resolved employee avatar + display name for a single userId.
 * Accepts a pre-resolved EmployeeSummary (from useEmployeeSummaries) so the
 * parent can batch all userIds in one GraphQL call.
 */
import type { EmployeeSummary } from '../../hooks/useEmployeeSummary'

interface AssigneeChipProps {
  userId: string
  summary: EmployeeSummary | undefined
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

export const AssigneeChip: React.FC<AssigneeChipProps> = ({ userId, summary }) => {
  const displayName = summary?.displayName ?? userId
  const initials = summary ? getInitials(summary.displayName) : '?'

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      {/* Avatar */}
      <div className="gba:h-6 gba:w-6 gba:rounded-full gba:overflow-hidden gba:shrink-0 gba:bg-muted gba:flex gba:items-center gba:justify-center">
        {summary?.pictureThumbnail ? (
          <img
            src={normalizeAvatarSrc(summary.pictureThumbnail)}
            alt={summary.displayName}
            className="gba:h-full gba:w-full gba:object-cover"
            onError={e => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <span className="gba:text-[9px] gba:font-semibold gba:text-muted-foreground gba:select-none">{initials}</span>
        )}
      </div>

      {/* Name or UUID fallback */}
      <span
        className={`gba:text-[12px] gba:text-foreground ${summary ? '' : 'gba:font-mono gba:text-muted-foreground'}`}
        title={summary ? undefined : userId}
      >
        {summary ? displayName : `${userId.slice(0, 8)}…`}
      </span>
    </div>
  )
}
