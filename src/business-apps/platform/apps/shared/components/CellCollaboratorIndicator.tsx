import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'

export interface CellCollaboratorIndicatorProps {
  userName: string
  userColor: string
  avatarUrl?: string
  isActive?: boolean
  showLabel?: boolean
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * CellCollaboratorIndicator Component
 *
 * Displays a colored border overlay for spreadsheet cells being edited by collaborators
 * Shows avatar and pulsing animation when active
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <input type="text" value={cellValue} />
 *   {isBeingEdited && (
 *     <CellCollaboratorIndicator
 *       userName="Jane Smith"
 *       userColor="#4ECDC4"
 *       avatarUrl="data:image/png;base64,..."
 *       isActive={true}
 *       showLabel={true}
 *     />
 *   )}
 * </div>
 * ```
 */
export const CellCollaboratorIndicator: React.FC<CellCollaboratorIndicatorProps> = ({
  userName,
  userColor,
  avatarUrl,
  isActive = true,
  showLabel = true
}) => {
  if (!isActive) return null

  return (
    <>
      {/* Colored border overlay */}
      <div
        className="gba:absolute gba:inset-0 gba:pointer-events-none gba:rounded gba:animate-pulse"
        style={{
          border: `2px solid ${userColor}`,
          boxShadow: `0 0 8px ${userColor}40`
        }}
      />

      {/* User label with avatar (optional) */}
      {showLabel && (
        <div
          className="gba:absolute gba:-top-7 gba:left-0 gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:font-medium gba:text-white gba:whitespace-nowrap gba:shadow-md gba:z-10 gba:animate-in gba:fade-in gba:slide-in-from-bottom-2"
          style={{ backgroundColor: userColor }}
        >
          <Avatar className="gba:w-4 gba:h-4">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} className="gba:object-cover" />}
            <AvatarFallback
              className="gba:text-[8px] gba:font-medium"
              style={{ backgroundColor: `${userColor}80`, color: 'white' }}
            >
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <span>{userName}</span>
        </div>
      )}

      {/* Corner avatar indicator */}
      <div className="gba:absolute gba:-top-2 gba:-right-2 gba:z-10">
        <Avatar
          className="gba:w-5 gba:h-5 gba:border-2 gba:border-white gba:shadow-sm"
          style={{ borderColor: userColor }}
        >
          {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} className="gba:object-cover" />}
          <AvatarFallback
            className="gba:text-[8px] gba:font-medium"
            style={{ backgroundColor: userColor, color: 'white' }}
          >
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      </div>
    </>
  )
}

export default CellCollaboratorIndicator
