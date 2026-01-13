import React from 'react'

export interface CellCollaboratorIndicatorProps {
  userName: string
  userColor: string
  isActive?: boolean
  showLabel?: boolean
}

/**
 * CellCollaboratorIndicator Component
 *
 * Displays a colored border overlay for spreadsheet cells being edited by collaborators
 * Shows pulsing animation when active
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <input type="text" value={cellValue} />
 *   {isBeingEdited && (
 *     <CellCollaboratorIndicator
 *       userName="Jane Smith"
 *       userColor="#4ECDC4"
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

      {/* User label (optional) */}
      {showLabel && (
        <div
          className="gba:absolute gba:-top-6 gba:left-0 gba:px-2 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium gba:text-white gba:whitespace-nowrap gba:shadow-md gba:z-10 gba:animate-in gba:fade-in gba:slide-in-from-bottom-2"
          style={{ backgroundColor: userColor }}
        >
          {userName} is editing
        </div>
      )}

      {/* Corner indicator dot */}
      <div
        className="gba:absolute gba:-top-1 gba:-right-1 gba:w-3 gba:h-3 gba:rounded-full gba:border-2 gba:border-white gba:shadow-sm gba:z-10"
        style={{ backgroundColor: userColor }}
      />
    </>
  )
}

export default CellCollaboratorIndicator
